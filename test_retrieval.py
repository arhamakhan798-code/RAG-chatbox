"""
test_retrieval.py - Automated validation suite for Qdrant vector store retrieval.
Tests all 5 knowledge domains: Policy, Products, Orders, Bank Details, Shipping.
"""

import sys
from retriever import RAGRetriever

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def test_suite():
    print("\n" + "=" * 70)
    print("     QDRANT RAG RETRIEVAL VERIFICATION TEST SUITE")
    print("=" * 70)

    retriever = RAGRetriever(data_dir="data")

    test_queries = [
        {
            "category": "Company Policy (Returns & Electronics)",
            "query": "What is the return window for electronics like laptops and phones?",
            "expected_type": "policy",
            "keywords": ["15 days", "RETURN POLICY"],
        },
        {
            "category": "Product Catalog & Pricing",
            "query": "Is the Lenovo Legion Pro 5 gaming laptop in stock and what is the price?",
            "expected_type": "product",
            "keywords": ["Lenovo", "Legion Pro 5", "$499.99"],
        },
        {
            "category": "Customer Order Tracking",
            "query": "Can you check order ORD-101 for Ali and its return status?",
            "expected_type": "order",
            "keywords": ["ORD-101", "Ali", "Return Approved"],
        },
        {
            "category": "Refund & Banking Information",
            "query": "What are the refund bank details for John on order ORD-103?",
            "expected_type": "bank_detail",
            "keywords": ["ORD-103", "Meezan Bank", "9876543210"],
        },
        {
            "category": "Shipping & Delivery Policy",
            "query": "How much does shipping cost and is there free shipping over $50?",
            "expected_type": "policy",
            "keywords": ["SHIPPING POLICY", "Free standard shipping", "$50"],
        },
    ]

    passed = 0
    for i, test in enumerate(test_queries, 1):
        print(f"\n[Test {i}/5] {test['category']}")
        print(f"  Query   : \"{test['query']}\"")

        results = retriever.retrieve(test["query"], top_k=2)
        if not results:
            print("  [FAIL] No results returned.")
            continue

        top = results[0]
        print(f"  Top Hit : [{top['doc_type'].upper()}] {top['title']} (score={top['score']})")

        content_lower = top["content"].lower()
        matched = [kw for kw in test["keywords"] if kw.lower() in content_lower]

        if top["doc_type"] == test["expected_type"] or len(matched) > 0:
            print(f"  [PASS]  Matched keywords: {matched}")
            passed += 1
        else:
            print(f"  [WARN]  Expected type '{test['expected_type']}', got '{top['doc_type']}'")

        snippet = " | ".join(top["content"].splitlines()[:2])
        print(f"  Snippet : {snippet}")

    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed}/{len(test_queries)} tests passed")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_suite()
