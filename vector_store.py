"""
vector_store.py — Qdrant Vector Database for the RAG Chatbot.

Architecture:
- Runs Qdrant in local (on-disk) mode — no separate server process needed.
- Embeds each chunk using a pure-numpy TF-IDF dense vector (dim=512).
- Stores chunk text, doc_type, and all metadata as Qdrant payload fields.
- Supports semantic search + metadata filtering (by doc_type, order_id, customer).
- Persists the Qdrant collection to disk under data/qdrant_store/.
"""

import os
import re
import math
import json
import hashlib
import numpy as np
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

COLLECTION_NAME = "techmart_rag"
VECTOR_DIM = 512          # Vocabulary size we project TF-IDF into
QDRANT_PATH = "data/qdrant_store"
VOCAB_PATH = "data/vocab.json"

STOPWORDS = {
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
}


def tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-zA-Z0-9_\-]+", text.lower())
    return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]


# Mappings for queries (e.g. 'mice' -> 'mouse', 'mobiles' -> 'phone')
SYNONYM_EXPANSION = {
    "mice": "mouse",
    "mouses": "mouse",
    "mobiles": "phone",
    "mobile": "phone",
    "smartphone": "phone",
    "smartphones": "phone",
    "cellphone": "phone",
    "cellphones": "phone",
    "earphones": "headphones",
    "earphone": "headphones",
    "earbuds": "headphones",
    "airpods": "headphones",
    "headset": "headphones",
    "headsets": "headphones",
    "laptops": "laptop",
    "notebooks": "laptop",
    "notebook": "laptop",
    "macbook": "laptop",
    "macbooks": "laptop",
    "keyboards": "keyboard",
    "tablets": "tablet",
    "ipads": "tablet",
    "ipad": "tablet",
}

CATEGORY_ALIASES = {
    "mouse": ["mouse", "mice", "mouses"],
    "phone": ["phone", "phones", "mobile", "mobiles", "smartphone", "smartphones", "cellphone", "cellphones"],
    "laptop": ["laptop", "laptops", "notebook", "notebooks", "macbook", "macbooks"],
    "headphones": ["headphone", "headphones", "earphone", "earphones", "earbuds", "airpods", "headset"],
    "keyboard": ["keyboard", "keyboards"],
    "tablet": ["tablet", "tablets", "ipad", "ipads"],
}


# ──────────────────────────────────────────────────────────────────────────────
# Vocabulary Builder (fitted over corpus, saved to disk)
# ──────────────────────────────────────────────────────────────────────────────

class VocabVectorizer:
    """Lightweight TF-IDF vectorizer that encodes text into a fixed-dim dense vector."""

    def __init__(self, dim: int = VECTOR_DIM):
        self.dim = dim
        self.vocab: Dict[str, int] = {}          # token -> hashed bucket [0, dim)
        self.idf: Dict[str, float] = {}          # token -> idf score
        self._fitted = False

    def fit(self, corpus: List[str]):
        """Builds IDF table from corpus."""
        N = len(corpus)
        doc_freq: Dict[str, int] = defaultdict(int)
        for doc in corpus:
            seen = set(tokenize(doc))
            for t in seen:
                doc_freq[t] += 1
        for token, df in doc_freq.items():
            self.idf[token] = math.log(1 + (N / (1 + df)))
        # Bucket all vocab tokens deterministically via hash
        for token in doc_freq:
            self.vocab[token] = int(hashlib.md5(token.encode()).hexdigest(), 16) % self.dim
        self._fitted = True

    def transform(self, text: str) -> List[float]:
        """Returns a dim-length L2-normalised TF-IDF vector."""
        tokens = tokenize(text)
        if not tokens:
            return [0.0] * self.dim
        tf = Counter(tokens)
        vec = np.zeros(self.dim, dtype=np.float32)
        for token, count in tf.items():
            bucket = self.vocab.get(
                token,
                int(hashlib.md5(token.encode()).hexdigest(), 16) % self.dim,
            )
            idf_score = self.idf.get(token, math.log(1 + 1))
            vec[bucket] += (count / len(tokens)) * idf_score
        # L2 normalise
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.tolist()

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"vocab": self.vocab, "idf": self.idf, "dim": self.dim}, f)

    def load(self, path: str) -> bool:
        if not os.path.exists(path):
            return False
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.vocab = data["vocab"]
        self.idf = data["idf"]
        self.dim = data["dim"]
        self._fitted = True
        return True


# ──────────────────────────────────────────────────────────────────────────────
# Qdrant Vector Store
# ──────────────────────────────────────────────────────────────────────────────

class QdrantVectorStore:
    """
    Local on-disk Qdrant vector database for RAG.

    Methods:
        build(chunks)          — Embed and upsert all chunks into Qdrant.
        search(query, top_k)   — Semantic search with optional metadata filter.
        build_context(query)   — Returns formatted prompt context string.
    """

    def __init__(self, qdrant_path: str = QDRANT_PATH, vocab_path: str = VOCAB_PATH):
        os.makedirs(qdrant_path, exist_ok=True)
        self.qdrant_path = qdrant_path
        self.vocab_path = vocab_path
        self.vectorizer = VocabVectorizer(dim=VECTOR_DIM)
        self.client: Optional[QdrantClient] = None

    def _get_client(self) -> QdrantClient:
        if self.client is None:
            self.client = QdrantClient(path=self.qdrant_path)
        return self.client

    def build(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Fits the vectorizer on all chunks, creates the Qdrant collection,
        and upserts every chunk as a point with its TF-IDF vector + payload.
        """
        print("[Qdrant] Fitting vocabulary vectorizer...", flush=True)
        corpus = [f"{c['title']} {c['content']}" for c in chunks]
        self.vectorizer.fit(corpus)
        self.vectorizer.save(self.vocab_path)

        client = self._get_client()

        # Drop & recreate collection for a clean build
        existing = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME in existing:
            client.delete_collection(COLLECTION_NAME)
            print(f"[Qdrant] Dropped existing '{COLLECTION_NAME}' collection.", flush=True)

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        print(f"[Qdrant] Created collection '{COLLECTION_NAME}' (dim={VECTOR_DIM}, cosine).", flush=True)

        # Build and upsert points
        points: List[PointStruct] = []
        for idx, chunk in enumerate(chunks):
            text = f"{chunk['title']} {chunk['content']}"
            vector = self.vectorizer.transform(text)

            # Flatten metadata into payload for Qdrant filtering
            meta = chunk.get("metadata", {})
            payload = {
                "chunk_id": chunk["chunk_id"],
                "doc_type": chunk.get("doc_type", ""),
                "title": chunk.get("title", ""),
                "content": chunk.get("content", ""),
                # Structured fields for exact-match filtering
                "order_id": str(meta.get("order_id", "")).upper(),
                "customer": str(meta.get("customer", "")).lower(),
                "category": str(meta.get("category", "")).lower(),
                "model": str(meta.get("model", "")).lower(),
                "source": str(meta.get("source", "")),
                "section": str(meta.get("section", "")),
                "price": float(meta.get("price", 0.0)),
                "stock": int(meta.get("stock", 0)),
                "is_in_stock": bool(meta.get("is_in_stock", False)),
                "status": str(meta.get("status", "")),
                "bank_name": str(meta.get("bank_name", "")),
            }
            points.append(PointStruct(id=idx, vector=vector, payload=payload))

        client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[Qdrant] Upserted {len(points)} vectors into '{COLLECTION_NAME}'.", flush=True)

        info = client.get_collection(COLLECTION_NAME)
        points_count = getattr(info, "points_count", None) or getattr(info, "vectors_count", len(points))
        return {
            "total_vectors": len(points),
            "collection": COLLECTION_NAME,
            "vector_dim": VECTOR_DIM,
            "distance_metric": "Cosine",
            "qdrant_path": self.qdrant_path,
            "vectors_count": points_count,
        }

    def load(self) -> bool:
        """Loads the vectorizer from disk and verifies the Qdrant collection exists."""
        if not self.vectorizer.load(self.vocab_path):
            return False
        client = self._get_client()
        existing = [c.name for c in client.get_collections().collections]
        return COLLECTION_NAME in existing

    def search(
        self,
        query: str,
        top_k: int = 4,
        doc_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic vector search against Qdrant with optional doc_type filter.
        Also applies exact-match boosting for Order IDs, customer names, and models.
        """
        if not self.vectorizer._fitted:
            if not self.load():
                raise RuntimeError("Vector store not built. Run ingest.py first.")

        query_lower = query.lower()
        query_words = set(re.findall(r"[a-zA-Z0-9_\-]+", query_lower))

        # Expand query with synonyms (e.g., mice -> mouse, mobiles -> phone)
        expanded_words = list(query_words)
        for w in query_words:
            if w in SYNONYM_EXPANSION:
                expanded_words.append(SYNONYM_EXPANSION[w])
        expanded_query = " ".join(expanded_words)

        query_vec = self.vectorizer.transform(expanded_query)

        # Optional Qdrant-side metadata filter
        qdrant_filter = None
        if doc_type_filter:
            qdrant_filter = Filter(
                must=[FieldCondition(key="doc_type", match=MatchValue(value=doc_type_filter))]
            )

        client = self._get_client()
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vec,
            limit=min(top_k * 3, 20),  # over-fetch for re-ranking
            query_filter=qdrant_filter,
            with_payload=True,
        )
        hits = response.points

        results = []
        for hit in hits:
            p = hit.payload
            score = float(hit.score)

            # ── Exact-match boosting (re-ranking layer) ──
            order_id = p.get("order_id", "").lower()
            if order_id and order_id in query_lower:
                score += 0.60

            customer = p.get("customer", "").lower()
            if customer and customer in query_words:
                score += 0.30

            model = p.get("model", "").lower()
            if model and len(model) > 2 and model in query_lower:
                score += 0.45

            category = p.get("category", "").lower()
            if category:
                aliases = CATEGORY_ALIASES.get(category, [category, f"{category}s"])
                if any(alias in query_lower for alias in aliases):
                    score += 0.50

            section = p.get("section", "").lower()
            if section and any(w in query_lower for w in section.split()):
                score += 0.10

            results.append({
                "chunk_id": p.get("chunk_id", ""),
                "doc_type": p.get("doc_type", ""),
                "title": p.get("title", ""),
                "content": p.get("content", ""),
                "score": round(score, 4),
                "metadata": {
                    "order_id": p.get("order_id", ""),
                    "customer": p.get("customer", ""),
                    "category": p.get("category", ""),
                    "model": p.get("model", ""),
                    "source": p.get("source", ""),
                    "section": p.get("section", ""),
                    "price": p.get("price", 0.0),
                    "stock": p.get("stock", 0),
                    "is_in_stock": p.get("is_in_stock", False),
                    "status": p.get("status", ""),
                    "bank_name": p.get("bank_name", ""),
                },
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def build_context(self, query: str, top_k: int = 4) -> str:
        """Formats retrieved chunks into a structured LLM prompt context block."""
        chunks = self.search(query, top_k=top_k)
        if not chunks:
            return "No matching knowledge base documents found."

        lines = ["--- KNOWLEDGE BASE CONTEXT ---"]
        for i, c in enumerate(chunks, 1):
            lines.append(
                f"\n[Source #{i}: {c['title']} | Type: {c['doc_type']} | Score: {c['score']}]"
            )
            lines.append(c["content"])
        lines.append("\n--- END OF CONTEXT ---")
        return "\n".join(lines)
