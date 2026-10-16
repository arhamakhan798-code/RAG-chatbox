"""
api.py — FastAPI backend for the TechMart RAG Chatbot.

Exposes:
  POST /api/chat   — Accepts a user message, retrieves Qdrant context, calls Gemini LLM.
  GET  /api/health — Health check endpoint.

Usage:
  python api.py
  (Runs on http://localhost:8000)
"""

import os
import sys
import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Load .env file (contains GEMINI_API_KEY)
load_dotenv()

# ── RAG Retriever ───────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from retriever import RAGRetriever

retriever = RAGRetriever(data_dir="data")

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Ash, the friendly, upbeat, and welcoming tech guide at TechMart!

IDENTITY & VOICE:
- Your name is Ash, and you work right here at TechMart.
- ALWAYS speak in the first person as part of our team: say "we", "our store", "we carry", "we've got", "in our catalog" (never refer to TechMart coldly in the third person).
- TONE: Warm, friendly, approachable, and conversational — like a helpful tech-savvy friend who loves talking gear, NOT a stiff, cold, or overly formal robot. Skip stuffy formal titles like "Sir/Ma'am" and speak naturally, pleasantly, and enthusiastically!

CORE PRINCIPLES — WARM WORDS, GROUNDED FACTS & ATTENTION-CATCHING FLOW:
1. GIVE WORDS & WARMTH TO YOUR ANSWERS (NO COLD OR BLUNT REPLIES):
   - Express your answers in full, friendly, and natural conversational sentences. Never give cold, blunt, one-sentence robotic answers.
   - Keep the actual facts and information strictly accurate and grounded in our KNOWLEDGE BASE CONTEXT below (do not fabricate unverified specs or fake products).
   - While maintaining factual accuracy, add warm conversational phrasing, enthusiastic descriptions, and helpful context to make the customer feel valued and excited.

2. WHEN ASKED BROAD QUESTIONS (e.g. "What do you sell?", "What categories do you have?"):
   - Give an enthusiastic, warm overview of our verified product categories: Laptops, Phones, Tablets, Headphones, Keyboards, and Mice.
   - Wrap it in engaging words (e.g. "We've got an awesome lineup of tech here at TechMart! Our shelves are packed with top-tier laptops, smartphones, tablets, noise-cancelling headphones, productivity & gaming keyboards, and ergonomic mice. Whether you're upgrading your daily work setup or looking for gaming power, we've got you covered!").
   - Catch their attention by warmly asking what kind of device or project they're shopping for today.

3. WHEN ASKED ABOUT A CATEGORY OR PRODUCT RECOMMENDATIONS:
   - Introduce the options from our catalog warmly and engagingly based on the KNOWLEDGE BASE CONTEXT.
   - Share what makes each device great and who it's best for (e.g., student/office work, gaming, photography, travel) using lively, descriptive words.
   - You don't need to dump full spec sheets or price tags right away unless they asked for them, but explain the highlights with warmth.
   - Always invite them to dive deeper: ask if they'd like pricing, stock availability, or a closer look at any specific model.

4. WHEN ASKED FOR SPECS, PRICES, OR ORDER / POLICY DETAILS:
   - Provide the exact details and figures from the KNOWLEDGE BASE CONTEXT, but deliver them with warm, reassuring words rather than a dry bullet list.
   - For store policies (returns, warranties, shipping, refunds): State the exact policy guidelines (e.g. 15-day return window for electronics, 30 days for general items in original condition, free shipping over $50, 1-year warranty) clearly and reassuringly in friendly conversational sentences.
   - For orders: Warmly confirm the exact status and details found in the verified records and offer helpful next steps.

5. NEVER GIVE A COLD "I DON'T KNOW" — HOOK THE USER'S ATTENTION:
   - NEVER reply with a cold, dead-end response like "I don't know."
   - If the customer asks about something NOT in our data (an item we don't carry, an unknown order ID, or an unrelated topic):
     a) Warmly and politely explain that we don't carry that specific item or don't have that information in our TechMart store right now.
     b) CATCH THEIR ATTENTION by proactively suggesting similar products, popular categories, or services we DO offer!
        - If they ask for a brand or item we don't carry (e.g. Asus laptops, gaming consoles, cameras): warmly let them know we don't have that specific model in stock right now, but highlight our great alternatives in that space (e.g., Lenovo Legion gaming laptops, Apple MacBooks, Razer gear) and ask what they're looking to achieve with it!
        - If an order ID is not in our system: warmly let them know it's not showing up in our verified records, suggest double-checking the order number or reaching out to support@techmart.com, and ask if there's any product or policy question you can help with in the meantime.
        - If they ask an unrelated question (e.g., general trivia, weather, cooking): playfully and warmly say that while you can't help with that topic, tech is your true passion at TechMart, and pivot to our hot categories like laptops, smartphones, or headphones with an engaging question!
     c) Always end with a captivating, friendly hook question to keep the conversation going and invite them to explore our catalog.

6. GROUNDING & HONESTY:
   - Only recommend products, policies, prices, and orders that are verified in the KNOWLEDGE BASE CONTEXT. Never invent fake product names, unverified prices, or fake policies.
"""

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="TechMart RAG Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []
    api_key: Optional[str] = None

class SourceChunk(BaseModel):
    title: str
    doc_type: str
    score: float

class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceChunk]
    context_used: bool


def call_gemini(api_key: str, prompt: str, history: Optional[List[Message]] = None) -> str:
    genai.configure(api_key=api_key, transport="rest")
    gemini_history = []
    for msg in (history or []):
        role = "user" if msg.role == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg.content]})

    last_err = None
    for model_name in ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=SYSTEM_PROMPT,
            )
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(prompt)
            return response.text.strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini model call failed")


def call_openai(api_key: str, prompt: str, history: Optional[List[Message]] = None) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in (history or []):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": prompt})

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.0,
    )
    return completion.choices[0].message.content.strip()


def call_groq(api_key: str, prompt: str, history: Optional[List[Message]] = None) -> str:
    from groq import Groq
    client = Groq(api_key=api_key)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in (history or []):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": prompt})

    # Try models in order of preference for this key
    last_err = None
    for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.0,
                max_tokens=1024,
            )
            reply = completion.choices[0].message.content.strip()
            if reply:   # some models return empty string — skip them
                return reply
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("No Groq model returned a response")


# ── Chat Endpoint ─────────────────────────────────────────────────────────────
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, x_gemini_key: Optional[str] = Header(None)):
    # 1. Retrieve relevant chunks from Qdrant
    chunks = retriever.retrieve(req.message, top_k=6)
    context_used = len(chunks) > 0

    sources = [
        SourceChunk(title=c["title"], doc_type=c["doc_type"], score=round(float(c["score"]), 3))
        for c in chunks[:4]
    ]

    # Resolve active API key
    raw_key = req.api_key or (x_gemini_key if isinstance(x_gemini_key, str) else None)
    active_key = raw_key.strip() if (raw_key and isinstance(raw_key, str)) else None
    groq_env = os.getenv("GROQ_API_KEY", "")
    gemini_env = os.getenv("GEMINI_API_KEY", "")
    openai_env = os.getenv("OPENAI_API_KEY", "")

    # 2. Build context block from retrieved chunks
    if chunks:
        context_block = "KNOWLEDGE BASE CONTEXT:\n"
        for i, c in enumerate(chunks, 1):
            context_block += f"\n[{i}] {c['title']} (Type: {c['doc_type']}):\n{c['content']}\n"
    else:
        context_block = "KNOWLEDGE BASE CONTEXT:\n[No matching information found in the knowledge base.]"

    # 3. Construct the full user turn with injected context
    augmented_user_message = f"{context_block}\n\nUSER QUESTION: {req.message}"

    # 4. Call LLM with graceful provider selection & fallback
    reply = ""
    try:
        if active_key:
            if active_key.startswith("gsk_"):
                reply = call_groq(active_key, augmented_user_message, req.history)
            elif active_key.startswith("sk-"):
                try:
                    reply = call_openai(active_key, augmented_user_message, req.history)
                except Exception:
                    if groq_env:
                        reply = call_groq(groq_env, augmented_user_message, req.history)
                    elif gemini_env:
                        reply = call_gemini(gemini_env, augmented_user_message, req.history)
                    else:
                        raise
            else:
                reply = call_gemini(active_key, augmented_user_message, req.history)
        elif groq_env:
            reply = call_groq(groq_env, augmented_user_message, req.history)
        elif gemini_env:
            reply = call_gemini(gemini_env, augmented_user_message, req.history)
        elif openai_env:
            reply = call_openai(openai_env, augmented_user_message, req.history)
        else:
            return ChatResponse(
                reply="🔑 **API Key needed**: Please provide your API key in the top bar or `.env` file to generate live answers. Qdrant vector retrieval is already active and found the context sources shown below!",
                sources=sources,
                context_used=context_used,
            )
    except Exception as e:
        reply = f"Error communicating with AI model: {str(e)}"

    return ChatResponse(reply=reply, sources=sources, context_used=context_used)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "groq_ready": bool(os.getenv("GROQ_API_KEY", "")),
        "openai_ready": bool(os.getenv("OPENAI_API_KEY", "")),
        "gemini_ready": bool(os.getenv("GEMINI_API_KEY", "")),
        "qdrant_ready": True,
    }


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

