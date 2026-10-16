"""
chunker.py - Intelligent chunking module for RAG chatbot.
Processes heterogeneous data:
1. Unstructured text (Company Policy)
2. Tabular structured catalog (Products)
3. Transactional customer data (Orders)
4. Financial refund data (Bank Details)
"""

import os
import re
import csv
from typing import List, Dict, Any


def chunk_policy_document(policy_path: str) -> List[Dict[str, Any]]:
    """
    Chunks company policy by major sections and subsections,
    preserving full contextual hierarchy in each chunk.
    """
    if not os.path.exists(policy_path):
        raise FileNotFoundError(f"Policy file not found: {policy_path}")

    with open(policy_path, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = []
    # Split by double newline or capitalized section headers
    sections = re.split(r'\n\s*\n', text.strip())
    
    current_header = "General Policy"
    company_name = "TechMart Online Store"
    
    for idx, sec in enumerate(sections):
        lines = [line.strip() for line in sec.splitlines() if line.strip()]
        if not lines:
            continue
            
        # Check if first line is a header like 'RETURN POLICY', 'REFUND POLICY', etc.
        first_line = lines[0]
        if first_line.isupper() and ("POLICY" in first_line or "SUPPORT" in first_line or "DOCUMENT" in first_line):
            current_header = first_line
            body_lines = lines[1:]
        else:
            body_lines = lines

        if not body_lines and first_line.isupper():
            # Standalone header, will be used for following block
            continue

        content_body = "\n".join(body_lines)
        if not content_body:
            content_body = first_line

        chunk_text = (
            f"Organization: {company_name}\n"
            f"Policy Section: {current_header}\n"
            f"Details:\n{content_body}"
        )

        chunks.append({
            "chunk_id": f"policy_{idx+1}",
            "doc_type": "policy",
            "title": f"Policy - {current_header}",
            "section": current_header,
            "content": chunk_text,
            "metadata": {
                "source": os.path.basename(policy_path),
                "section": current_header,
                "type": "policy_rule",
                "rules_count": len(body_lines)
            }
        })
    return chunks


def chunk_products(products_csv_path: str) -> List[Dict[str, Any]]:
    """
    Chunks product catalog rows into semantic document representations
    optimized for RAG retrieval on product specs, price, and stock inquiries.
    """
    chunks = []
    if not os.path.exists(products_csv_path):
        return chunks

    with open(products_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            cat = row.get("Category", "").strip()
            brand = row.get("Brand", "").strip()
            model = row.get("Model Name", "").strip()
            specs = row.get("Key Specifications", "").strip()
            best_for = row.get("Best For", "").strip()
            price = row.get("price", "0").strip()
            stock = row.get("stock", "0").strip()

            stock_int = int(float(stock)) if stock.replace('.', '', 1).isdigit() else 0
            stock_status = f"In Stock ({stock_int} units available)" if stock_int > 0 else "Out of Stock (0 units)"

            cat_display = cat
            if cat.lower() == "mouse":
                cat_display = "Mouse / Mice"
            elif cat.lower() == "phone":
                cat_display = "Phone / Mobile"

            content = (
                f"Product: {brand} {model}\n"
                f"Category: {cat_display}\n"
                f"Brand: {brand}\n"
                f"Price: ${price}\n"
                f"Stock Status: {stock_status}\n"
                f"Key Specifications: {specs}\n"
                f"Recommended For: {best_for}"
            )

            chunks.append({
                "chunk_id": f"prod_{idx+1}",
                "doc_type": "product",
                "title": f"{brand} {model}",
                "content": content,
                "metadata": {
                    "source": "products.csv",
                    "category": cat.lower(),
                    "brand": brand.lower(),
                    "model": model,
                    "price": float(price) if price.replace('.', '', 1).isdigit() else 0.0,
                    "stock": stock_int,
                    "is_in_stock": stock_int > 0
                }
            })
    return chunks


def chunk_orders(orders_csv_path: str) -> List[Dict[str, Any]]:
    """
    Chunks customer order rows into retrieval-ready records
    supporting status queries, return eligibility checks, and tracking.
    """
    chunks = []
    if not os.path.exists(orders_csv_path):
        return chunks

    with open(orders_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            order_id = row.get("order_id", "").strip()
            customer = row.get("customer", "").strip()
            model = row.get("Model Name", "").strip()
            product = row.get("product", "").strip()
            category = row.get("category", "").strip()
            days_ago = row.get("days_ago", "0").strip()
            status = row.get("Status", "").strip() or "Processing / In Progress"

            days_ago_int = int(days_ago) if days_ago.isdigit() else 0

            content = (
                f"Order Record: {order_id}\n"
                f"Customer Name: {customer}\n"
                f"Item Purchased: {model} ({product})\n"
                f"Category: {category}\n"
                f"Purchase Timing: Placed {days_ago_int} days ago\n"
                f"Current Order Status: {status}"
            )

            chunks.append({
                "chunk_id": f"order_{order_id.lower()}",
                "doc_type": "order",
                "title": f"Order {order_id} - {customer}",
                "content": content,
                "metadata": {
                    "source": "orders.csv",
                    "order_id": order_id,
                    "customer": customer.lower(),
                    "model": model,
                    "product": product,
                    "category": category,
                    "days_ago": days_ago_int,
                    "status": status
                }
            })
    return chunks


def chunk_bank_details(bank_csv_path: str) -> List[Dict[str, Any]]:
    """
    Chunks bank account information tied to orders and customers
    for refund execution and verification queries.
    """
    chunks = []
    if not os.path.exists(bank_csv_path):
        return chunks

    with open(bank_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            order_id = row.get("order_id", "").strip()
            customer = row.get("customer", "").strip()
            product = row.get("product", "").strip()
            bank_name = row.get("Bank_Name", "").strip()
            account_num = row.get("Account Number", "").strip()
            mobile = row.get("Mobile Number", "").strip()

            content = (
                f"Refund Banking Profile for Order: {order_id}\n"
                f"Customer Name: {customer}\n"
                f"Associated Item: {product}\n"
                f"Bank Name: {bank_name}\n"
                f"Bank Account Number: {account_num}\n"
                f"Registered Mobile Number: {mobile}"
            )

            chunks.append({
                "chunk_id": f"bank_{order_id.lower()}",
                "doc_type": "bank_detail",
                "title": f"Bank Details for {order_id} ({customer})",
                "content": content,
                "metadata": {
                    "source": "bank_details.csv",
                    "order_id": order_id,
                    "customer": customer.lower(),
                    "bank_name": bank_name,
                    "account_number": account_num,
                    "mobile": mobile
                }
            })
    return chunks


def chunk_all_sources(data_dir: str = "data", policy_file: str = "policy.txt") -> List[Dict[str, Any]]:
    """
    Runs chunking across all available sources and aggregates into a unified chunk repository.
    """
    all_chunks = []

    # 1. Company Policy
    if os.path.exists(policy_file):
        policy_chunks = chunk_policy_document(policy_file)
        all_chunks.extend(policy_chunks)

    # 2. Products Catalog
    prod_path = os.path.join(data_dir, "products.csv")
    if os.path.exists(prod_path):
        all_chunks.extend(chunk_products(prod_path))

    # 3. Orders List
    orders_path = os.path.join(data_dir, "orders.csv")
    if os.path.exists(orders_path):
        all_chunks.extend(chunk_orders(orders_path))

    # 4. Bank Details List
    bank_path = os.path.join(data_dir, "bank_details.csv")
    if os.path.exists(bank_path):
        all_chunks.extend(chunk_bank_details(bank_path))

    return all_chunks
