"""
ingest.py - Data Ingestion, Chunking, and Qdrant Vector DB Indexing Pipeline.
Sources:
  1. policy.txt         - Company policy document
  2. Google Sheets.docx - Links to live Google Sheets (products, orders, bank_details)
Output:
  - data/qdrant_store/  - Qdrant on-disk vector database
  - data/vocab.json     - TF-IDF vocabulary for query embedding
"""

import os
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from chunker import chunk_all_sources
from vector_store import QdrantVectorStore


def extract_sheet_urls_from_docx(docx_path: str) -> dict:
    if not os.path.exists(docx_path):
        return {}
    try:
        with zipfile.ZipFile(docx_path) as z:
            tree = ET.fromstring(z.read("word/document.xml"))
            text = " ".join(
                p.text for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
                if p.text
            )
        matches = re.findall(
            r"(Bank_Details|Orders|Products):\s*(https://docs\.google\.com/spreadsheets/d/([a-zA-Z0-9_-]+))",
            text, re.IGNORECASE,
        )
        return {name.lower(): sid for name, _, sid in matches}
    except Exception as e:
        print(f"[Warning] Could not parse docx: {e}", flush=True)
        return {}


def sync_google_sheets(docx_path: str = "Google Sheets.docx", data_dir: str = "data", force: bool = False):
    os.makedirs(data_dir, exist_ok=True)
    required = ["bank_details.csv", "orders.csv", "products.csv"]
    all_exist = all(os.path.exists(os.path.join(data_dir, f)) for f in required)

    if all_exist and not force:
        print(f"[Sync] Using cached CSVs in {data_dir}/ (all files present).", flush=True)
        return

    sheets = extract_sheet_urls_from_docx(docx_path) or {
        "bank_details": "1Ic0mnXGUEDYoGA5JRoOO3Ofk9NYpa9gJKw-HmzCJfzw",
        "orders":        "1xl3LS8xbNuJMGssg5UD89CSbHdnh2FBYMU3on4DI-U0",
        "products":      "1vWSe1-GsTXi9lXrLyEEee0q3QXgtspepO6JWD0DNiPk",
    }

    for name, sid in sheets.items():
        csv_file = os.path.join(data_dir, f"{name}.csv")
        if os.path.exists(csv_file) and not force:
            continue
        url = f"https://docs.google.com/spreadsheets/d/{sid}/export?format=csv"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = resp.read().decode("utf-8", errors="ignore")
            with open(csv_file, "w", encoding="utf-8") as f:
                f.write(data)
            print(f"[Sync] Downloaded {csv_file}.", flush=True)
        except Exception as e:
            if os.path.exists(csv_file):
                print(f"[Sync] Network error ({e}). Using cached {csv_file}.", flush=True)
            else:
                print(f"[Sync] FAILED to download {name}: {e}", flush=True)


def run_pipeline(data_dir: str = "data", policy_path: str = "policy.txt", force_sync: bool = False):
    print("=" * 60, flush=True)
    print("  RAG INGESTION -> CHUNKING -> QDRANT VECTOR DB", flush=True)
    print("=" * 60, flush=True)

    # ── Step 1: Data Sync ──────────────────────────────────────────
    print("\n[Step 1/3] Syncing knowledge base files...", flush=True)
    sync_google_sheets("Google Sheets.docx", data_dir, force=force_sync)

    # ── Step 2: Chunking ──────────────────────────────────────────
    print("\n[Step 2/3] Chunking documents by schema...", flush=True)
    chunks = chunk_all_sources(data_dir=data_dir, policy_file=policy_path)

    type_counts: dict = {}
    for c in chunks:
        type_counts[c["doc_type"]] = type_counts.get(c["doc_type"], 0) + 1

    print(f"-> Generated {len(chunks)} contextual chunks:", flush=True)
    for doc_type, count in type_counts.items():
        print(f"   • {doc_type.capitalize():14}: {count:3} chunks", flush=True)

    # ── Step 3: Qdrant Indexing ───────────────────────────────────
    print("\n[Step 3/3] Building Qdrant Vector Database...", flush=True)
    store = QdrantVectorStore(
        qdrant_path=os.path.join(data_dir, "qdrant_store"),
        vocab_path=os.path.join(data_dir, "vocab.json"),
    )
    stats = store.build(chunks)

    print("\n" + "=" * 60, flush=True)
    print("  QDRANT INDEXING COMPLETE", flush=True)
    print("=" * 60, flush=True)
    print(f"Total Vectors Stored : {stats['total_vectors']}", flush=True)
    print(f"Collection Name      : {stats['collection']}", flush=True)
    print(f"Vector Dimensions    : {stats['vector_dim']}", flush=True)
    print(f"Distance Metric      : {stats['distance_metric']}", flush=True)
    print(f"Qdrant Store Path    : {stats['qdrant_path']}/", flush=True)
    print(f"Vocabulary File      : {data_dir}/vocab.json", flush=True)
    print("=" * 60, flush=True)

    return store, chunks


if __name__ == "__main__":
    force = "--force-sync" in sys.argv
    run_pipeline(force_sync=force)
