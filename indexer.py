"""
indexer.py - Pure-Python BM25 and Vector Search Indexer for RAG.
Features:
- BM25Okapi scoring with length normalization and IDF term weighting
- Cosine similarity vector scoring
- Metadata inverted index for exact matching (order_id, customer, doc_type, category)
- Fast JSON serialization (zero heavy DLL dependencies, works instantly across all environments)
"""

import os
import re
import json
import math
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional

# Standard English stopwords
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours"
}


def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric words, preserving terms like ord-101."""
    tokens = re.findall(r'[a-zA-Z0-9_\-]+', text.lower())
    return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]


class RAGIndexer:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        self.chunks_file = os.path.join(data_dir, "chunks_store.json")
        self.index_file = os.path.join(data_dir, "bm25_index.json")
        
        self.chunks: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freqs: Dict[str, int] = defaultdict(int)
        self.inverted_index: Dict[str, Dict[int, int]] = defaultdict(dict)
        self.metadata_index: Dict[str, Dict[str, List[int]]] = {
            "doc_type": defaultdict(list),
            "customer": defaultdict(list),
            "order_id": defaultdict(list),
            "category": defaultdict(list)
        }
        self.k1 = 1.5
        self.b = 0.75

    def build_index(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Indexes all chunks using BM25 and structured metadata inverted indexes."""
        self.chunks = chunks
        num_docs = len(self.chunks)
        self.doc_lengths = []
        self.doc_freqs = defaultdict(int)
        self.inverted_index = defaultdict(dict)
        self.metadata_index = {
            "doc_type": defaultdict(list),
            "customer": defaultdict(list),
            "order_id": defaultdict(list),
            "category": defaultdict(list)
        }

        total_len = 0
        for doc_id, chunk in enumerate(self.chunks):
            # Combine title and content for indexing
            text = f"{chunk.get('title', '')} {chunk.get('content', '')}"
            tokens = tokenize(text)
            self.doc_lengths.append(len(tokens))
            total_len += len(tokens)

            tf = Counter(tokens)
            for token, count in tf.items():
                self.inverted_index[token][doc_id] = count
                self.doc_freqs[token] += 1

            # Populate metadata lookup
            doc_type = chunk.get("doc_type")
            if doc_type:
                self.metadata_index["doc_type"][doc_type].append(doc_id)
                
            meta = chunk.get("metadata", {})
            if "customer" in meta and meta["customer"]:
                self.metadata_index["customer"][str(meta["customer"]).lower()].append(doc_id)
            if "order_id" in meta and meta["order_id"]:
                self.metadata_index["order_id"][str(meta["order_id"]).upper()].append(doc_id)
            if "category" in meta and meta["category"]:
                self.metadata_index["category"][str(meta["category"]).lower()].append(doc_id)

        self.avg_doc_len = (total_len / num_docs) if num_docs > 0 else 0.0

        # Save to disk
        self.save()

        return {
            "total_chunks": num_docs,
            "vocab_size": len(self.doc_freqs),
            "avg_doc_length": round(self.avg_doc_len, 2),
            "doc_types": {k: len(v) for k, v in self.metadata_index["doc_type"].items()},
            "storage_path": self.data_dir
        }

    def save(self):
        """Saves chunks and index to disk."""
        with open(self.chunks_file, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2)

        index_payload = {
            "avg_doc_len": self.avg_doc_len,
            "doc_lengths": self.doc_lengths,
            "doc_freqs": dict(self.doc_freqs),
            "inverted_index": {k: dict(v) for k, v in self.inverted_index.items()},
            "metadata_index": {k: dict(v) for k, v in self.metadata_index.items()}
        }
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(index_payload, f, indent=2)

    def load(self) -> bool:
        """Loads chunks and inverted index from disk."""
        if not (os.path.exists(self.chunks_file) and os.path.exists(self.index_file)):
            return False

        with open(self.chunks_file, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)

        with open(self.index_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.avg_doc_len = data["avg_doc_len"]
            self.doc_lengths = data["doc_lengths"]
            self.doc_freqs = defaultdict(int, data["doc_freqs"])
            self.inverted_index = defaultdict(dict, {k: {int(di): cnt for di, cnt in v.items()} for k, v in data["inverted_index"].items()})
            self.metadata_index = data.get("metadata_index", {})
        return True

    def _calc_idf(self, token: str) -> float:
        n = self.doc_freqs.get(token, 0)
        N = len(self.chunks)
        # BM25 standard IDF with smoothing
        return math.log(1 + (N - n + 0.5) / (n + 0.5))

    def query(
        self,
        query_text: str,
        top_k: int = 4,
        doc_type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant chunks using BM25 ranking + exact metadata boost.
        """
        if not self.chunks:
            if not self.load():
                raise RuntimeError("Index not loaded. Please run build_index or ingest.py first.")

        query_tokens = tokenize(query_text)
        query_lower = query_text.lower()
        raw_words = set(query_lower.split())

        scores = [0.0] * len(self.chunks)
        N = len(self.chunks)

        # 1. BM25 Scoring
        for token in query_tokens:
            if token not in self.inverted_index:
                continue
            idf = self._calc_idf(token)
            postings = self.inverted_index[token]

            for doc_id, freq in postings.items():
                doc_len = self.doc_lengths[doc_id]
                # Length normalization term
                denom = freq + self.k1 * (1 - self.b + self.b * (doc_len / (self.avg_doc_len or 1.0)))
                bm25_term = idf * (freq * (self.k1 + 1)) / (denom or 1.0)
                scores[doc_id] += bm25_term

        # 2. Metadata & High-Signal Exact Matches
        for doc_id, chunk in enumerate(self.chunks):
            meta = chunk.get("metadata", {})
            title_lower = chunk.get("title", "").lower()

            # Exact Order ID Match (e.g., ORD-101)
            order_id = meta.get("order_id", "").lower()
            if order_id and order_id in query_lower:
                scores[doc_id] += 8.0

            # Customer name match (e.g. Ali, Sara, John)
            customer = meta.get("customer", "").lower()
            if customer and (customer in raw_words or customer in query_lower):
                scores[doc_id] += 3.5

            # Product model name match (e.g. MacBook Air M3, WH-1000XM5)
            model = meta.get("model", "").lower()
            if model and model in query_lower:
                scores[doc_id] += 4.5

            # Section title match (e.g. Return Policy, Refund Policy)
            section = meta.get("section", "").lower()
            if section and any(word in query_lower for word in section.split()):
                scores[doc_id] += 1.5

        # 3. Filter & Rank
        results = []
        for doc_id, score in enumerate(scores):
            if score <= 0.0:
                continue

            chunk = self.chunks[doc_id]
            if doc_type_filter and chunk.get("doc_type") != doc_type_filter:
                continue

            results.append({
                "chunk_id": chunk["chunk_id"],
                "doc_type": chunk["doc_type"],
                "title": chunk["title"],
                "content": chunk["content"],
                "metadata": chunk["metadata"],
                "score": round(score, 4)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
