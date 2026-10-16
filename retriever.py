"""
retriever.py - Qdrant-backed Retrieval Service for the RAG Chatbot.
Accepts user queries, retrieves top-k semantically similar chunks from
the Qdrant vector database, and packages them into LLM prompt context.
"""

import sys
import os
import csv
from typing import List, Dict, Any, Optional
from vector_store import QdrantVectorStore

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def is_catalog_overview_query(query: str) -> bool:
    q = query.lower().strip()
    triggers = [
        "what do you sell", "what you sell", "what do you have", "what you have",
        "what products", "what categories", "what items", "what can i buy",
        "what is available", "what's available", "list products", "list categories",
        "tell me what you sell", "which products do you sell", "what kind of products",
        "what do you offer", "what items do you carry", "what do you carry"
    ]
    return any(t in q for t in triggers)


def get_catalog_overview_chunk(data_dir: str = "data") -> Optional[Dict[str, Any]]:
    prod_path = os.path.join(data_dir, "products.csv")
    if not os.path.exists(prod_path):
        return None
    categories: Dict[str, set] = {}
    try:
        with open(prod_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cat = row.get("Category", "").strip()
                brand = row.get("Brand", "").strip()
                if cat:
                    categories.setdefault(cat, set())
                    if brand:
                        categories[cat].add(brand)
    except Exception:
        return None

    display_names = {
        "Laptop": "Laptops",
        "Headphones": "Headphones",
        "Phone": "Mobile Phones",
        "Tablet": "Tablets",
        "Keyboard": "Keyboards",
        "Mouse": "Mice (Computer Mice)",
    }
    cat_lines = []
    for cat in sorted(categories.keys()):
        brands = categories[cat]
        disp = display_names.get(cat, cat)
        brand_str = f" ({', '.join(sorted(brands))})" if brands else ""
        cat_lines.append(f"- {disp}{brand_str}")

    cat_list_str = "\n".join(cat_lines)
    content = (
        "TechMart Official Product Catalog & Available Categories:\n"
        "We ONLY carry and sell products in the following verified categories:\n"
        f"{cat_list_str}\n\n"
        "Grounding Rule: ONLY mention these verified categories when asked what TechMart sells or carries. "
        "Do NOT add any extra categories or products outside this verified list."
    )
    return {
        "chunk_id": "catalog_overview",
        "doc_type": "product_catalog",
        "title": "TechMart Store Catalog - Verified Product Categories",
        "content": content,
        "score": 1.0,
        "metadata": {
            "source": "products.csv",
            "type": "catalog_overview",
        }
    }


class RAGRetriever:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.store = QdrantVectorStore(
            qdrant_path=f"{data_dir}/qdrant_store",
            vocab_path=f"{data_dir}/vocab.json",
        )
        loaded = self.store.load()
        if not loaded:
            raise RuntimeError(
                "Qdrant vector store not found. Please run: python ingest.py"
            )

    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        doc_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Returns top_k semantically relevant chunks with scores and metadata."""
        results = self.store.search(query, top_k=top_k, doc_type_filter=doc_type)
        if is_catalog_overview_query(query):
            overview = get_catalog_overview_chunk(self.data_dir)
            if overview:
                results = [overview] + [r for r in results if r.get("chunk_id") != "catalog_overview"][:max(1, top_k - 1)]
        return results

    def build_context(self, query: str, top_k: int = 4) -> str:
        """Retrieves and formats chunks as a structured LLM prompt context block."""
        return self.store.build_context(query, top_k=top_k)


if __name__ == "__main__":
    retriever = RAGRetriever()

    demo_queries = [
        "What is the return policy for laptops?",
        "Is the MacBook Air M3 in stock?",
        "What is the status of order ORD-101?",
        "What bank account should refund go to for John ORD-103?",
        "How long does standard shipping take?",
    ]

    for q in demo_queries:
        print(f"\nQuery: {q}")
        results = retriever.retrieve(q, top_k=1)
        if results:
            r = results[0]
            print(f"  -> [{r['doc_type'].upper()}] {r['title']} (score={r['score']})")
            print(f"     {r['content'].splitlines()[0]}")
