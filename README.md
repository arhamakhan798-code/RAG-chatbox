# Ash — TechMart Grounded RAG Chatbot (Next.js + Qdrant + Gemini)

<p align="center">
  <img src="ash-logo.png" width="180" alt="Ash AI Logo" style="border-radius: 16px;" />
</p>

<p align="center">
  <strong>Ash</strong> is the official Customer Support AI Assistant for <strong>TechMart</strong>, built with <strong>Next.js (App Router)</strong>, <strong>Qdrant Vector Database</strong>, <strong>FastAPI</strong>, and <strong>Google Gemini 1.5 Flash</strong>.
</p>

---

## 🎯 Strict Grounding & Zero-Hallucination Policy

Ash is strictly constrained to TechMart's verified source records:
1. **Company Policy (`policy.txt`)**: Returns (15d/30d), refunds (5-7d), shipping ($50 free threshold), warranties, and exchanges.
2. **Product Catalog (`Google Sheets.docx`)**: 40 products with prices, specifications, and live stock statuses.
3. **Customer Orders**: Live orders with order IDs (`ORD-101` to `ORD-109`), customer names, and statuses.
4. **Bank Details**: Refund payout bank records linked to specific orders.

### 📜 Exact System Prompt Implemented

```text
You are Ash, the official Customer Support AI Assistant for TechMart.

IDENTITY:
- Your name is Ash.
- When asked who you are or when introducing yourself, state clearly that your name is Ash, TechMart's AI assistant.

STRICT OPERATING RULES:
1. You MUST ONLY answer questions using the verified information provided in the KNOWLEDGE BASE CONTEXT below (sourced strictly from company policy documents, product catalog, customer orders, and bank details).
2. If the question asks for something that is NOT available or explicitly mentioned in the provided data, you MUST reply ONLY with:
   "I don't know."
3. Do NOT extrapolate, speculate, assume, or use any outside/general knowledge.
4. Do NOT make up product specs, prices, order statuses, return policies, or bank information.
5. If the required information is present in the context, provide a clear, accurate, and professional answer quoting the exact figures and policies from the data.
```

---

## 🏗️ Architecture

```
User Query (Next.js "Ash" Web Interface)
       │
       ▼ POST /api/chat
FastAPI Backend (api.py:8000)
       │
       ├──► 1. Qdrant Vector DB (Dense 512-dim TF-IDF + Cosine Search)
       │       └── Retrieves top matching policy / product / order chunks
       │
       └──► 2. Google Gemini 1.5 Flash
               └── Ingests strict System Prompt + Grounded Context
               └── Outputs verified answer OR "I don't know."
```

---

## 🚀 How to Run

### Step 1: Start the Python FastAPI Backend

In your project root:
```bash
python api.py
```
Backend runs on `http://127.0.0.1:8000`.

### Step 2: Start the Next.js Frontend

In a second terminal:
```bash
cd frontend
cmd /c npm run dev
```
Open your browser at `http://localhost:3000`.

### Step 3: Providing the API Key

You can provide your Gemini API key in either of two ways:
1. **In the `.env` file**:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
2. **Directly in the Next.js UI**: Click the **"Set API Key"** button in the top navigation bar and paste your key.
