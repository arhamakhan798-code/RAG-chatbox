import crypto from "crypto";
import chunksData from "./chunks.json";
import vocabData from "./vocab.json";

export interface ChunkMetadata {
  source?: string;
  section?: string;
  type?: string;
  rules_count?: number;
  category?: string;
  brand?: string;
  model?: string;
  price?: number;
  stock?: number;
  is_in_stock?: boolean;
  order_id?: string;
  customer?: string;
  product?: string;
  days_ago?: number;
  status?: string;
  bank_name?: string;
  account_number?: string;
  mobile?: string;
}

export interface ChunkItem {
  chunk_id: string;
  doc_type: string;
  title: string;
  section?: string;
  content: string;
  metadata?: ChunkMetadata;
  score?: number;
}

const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","am","an","and","any",
  "are","as","at","be","because","been","before","being","below","between",
  "both","but","by","can","could","did","do","does","doing","down","during",
  "each","few","for","from","further","had","has","have","having","he","her",
  "here","him","himself","his","how","i","if","in","into","is","it","its",
  "itself","me","more","most","my","no","nor","not","of","off","on","once",
  "only","or","other","our","out","over","own","same","she","should","so",
  "some","such","than","that","the","their","them","then","there","these",
  "they","this","those","through","to","too","under","until","up","very",
  "was","we","were","what","when","where","which","while","who","whom","why",
  "with","would","you","your","yours","yourself",
]);

const SYNONYM_EXPANSION: Record<string, string> = {
  mice: "mouse",
  mouses: "mouse",
  mobiles: "phone",
  mobile: "phone",
  smartphone: "phone",
  smartphones: "phone",
  cellphone: "phone",
  cellphones: "phone",
  earphones: "headphones",
  earphone: "headphones",
  earbuds: "headphones",
  airpods: "headphones",
  headset: "headphones",
  headsets: "headphones",
  laptops: "laptop",
  notebooks: "laptop",
  notebook: "laptop",
  macbook: "laptop",
  macbooks: "laptop",
  keyboards: "keyboard",
  tablets: "tablet",
  ipads: "tablet",
  ipad: "tablet",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  mouse: ["mouse", "mice", "mouses"],
  phone: ["phone", "phones", "mobile", "mobiles", "smartphone", "smartphones", "cellphone", "cellphones"],
  laptop: ["laptop", "laptops", "notebook", "notebooks", "macbook", "macbooks"],
  headphones: ["headphone", "headphones", "earphone", "earphones", "earbuds", "airpods", "headset"],
  keyboard: ["keyboard", "keyboards"],
  tablet: ["tablet", "tablets", "ipad", "ipads"],
};

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-zA-Z0-9_\-]+/g) || [];
  return matches.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function getBucket(token: string, dim: number): number {
  const hash = crypto.createHash("md5").update(token).digest("hex");
  // Take lowest 32 bits for integer modulo
  const num = parseInt(hash.substring(hash.length - 8), 16);
  return num % dim;
}

const DIM = (vocabData as any).dim || 512;
const VOCAB: Record<string, number> = (vocabData as any).vocab || {};
const IDF: Record<string, number> = (vocabData as any).idf || {};
const CHUNKS: ChunkItem[] = chunksData as ChunkItem[];

function transformText(text: string): Float32Array {
  const tokens = tokenize(text);
  const vec = new Float32Array(DIM);
  if (tokens.length === 0) return vec;

  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }

  for (const [token, count] of Object.entries(counts)) {
    const bucket = VOCAB[token] !== undefined ? VOCAB[token] : getBucket(token, DIM);
    const idfVal = IDF[token] !== undefined ? IDF[token] : Math.log(1 + 1);
    vec[bucket] += (count / tokens.length) * idfVal;
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < DIM; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < DIM; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

// Pre-compute vectors for all 40 chunks once in memory
const PRECOMPUTED_CHUNK_VECTORS: Float32Array[] = CHUNKS.map((c) =>
  transformText(`${c.title} ${c.content}`)
);

export function isCatalogOverviewQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  const triggers = [
    "what do you sell", "what you sell", "what do you have", "what you have",
    "what products", "what categories", "what items", "what can i buy",
    "what is available", "what's available", "list products", "list categories",
    "tell me what you sell", "which products do you sell", "what kind of products",
    "what do you offer", "what items do you carry", "what do you carry"
  ];
  return triggers.some((t) => q.includes(t));
}

export function getCatalogOverviewChunk(): ChunkItem {
  return {
    chunk_id: "catalog_overview",
    doc_type: "product_catalog",
    title: "TechMart Store Catalog - Verified Product Categories",
    content:
      "TechMart Official Product Catalog & Available Categories:\n" +
      "We ONLY carry and sell products in the following verified categories:\n" +
      "- Headphones (Apple, Bose, Sony)\n" +
      "- Keyboards (Keychron, Logitech, Razer)\n" +
      "- Laptops (Apple, Dell, HP, Lenovo)\n" +
      "- Mice (Computer Mice) (Logitech, Razer, SteelSeries)\n" +
      "- Mobile Phones (Apple, Google, OnePlus, Samsung)\n" +
      "- Tablets (Apple, Samsung, Xiaomi)\n\n" +
      "Grounding Rule: ONLY mention these verified categories when asked what TechMart sells or carries. " +
      "Do NOT add any extra categories or products outside this verified list.",
    score: 1.0,
    metadata: {
      source: "products.csv",
      type: "catalog_overview",
    },
  };
}

export function retrieveChunks(query: string, topK: number = 4): ChunkItem[] {
  const queryLower = query.toLowerCase();
  const rawWords = queryLower.match(/[a-zA-Z0-9_\-]+/g) || [];
  const wordsSet = new Set(rawWords);

  // Expand with synonyms
  const expandedWords = [...rawWords];
  for (const w of rawWords) {
    if (SYNONYM_EXPANSION[w]) {
      expandedWords.push(SYNONYM_EXPANSION[w]);
    }
  }

  const queryVec = transformText(expandedWords.join(" "));

  const scored: ChunkItem[] = [];

  for (let i = 0; i < CHUNKS.length; i++) {
    const chunk = CHUNKS[i];
    const chunkVec = PRECOMPUTED_CHUNK_VECTORS[i];

    // Dot product
    let cosSim = 0;
    for (let d = 0; d < DIM; d++) {
      cosSim += queryVec[d] * chunkVec[d];
    }

    let score = cosSim;
    const meta = chunk.metadata || {};

    // ── Exact-match boosting (re-ranking layer) ──
    const orderId = (meta.order_id || "").toLowerCase();
    if (orderId && queryLower.includes(orderId)) {
      score += 0.60;
    }

    const customer = (meta.customer || "").toLowerCase();
    if (customer && wordsSet.has(customer)) {
      score += 0.30;
    }

    const model = (meta.model || "").toLowerCase();
    if (model && model.length > 2 && queryLower.includes(model)) {
      score += 0.45;
    }

    const category = (meta.category || "").toLowerCase();
    if (category) {
      const aliases = CATEGORY_ALIASES[category] || [category, `${category}s`];
      if (aliases.some((alias) => queryLower.includes(alias))) {
        score += 0.50;
      }
    }

    const section = (meta.section || "").toLowerCase();
    if (section && section.split(/\s+/).some((w) => queryLower.includes(w))) {
      score += 0.10;
    }

    scored.push({
      ...chunk,
      score: Math.round(score * 1000) / 1000,
    });
  }

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  let results = scored.slice(0, topK);

  if (isCatalogOverviewQuery(query)) {
    const overview = getCatalogOverviewChunk();
    results = [
      overview,
      ...results.filter((r) => r.chunk_id !== "catalog_overview").slice(0, Math.max(1, topK - 1)),
    ];
  }

  return results;
}
