import { NextRequest, NextResponse } from "next/server";
import { retrieveChunks } from "@/lib/rag/retriever";

const SYSTEM_PROMPT = `You are Ash, the friendly, upbeat, and welcoming tech guide at TechMart!

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
   - Only recommend products, policies, prices, and orders that are verified in the KNOWLEDGE BASE CONTEXT. Never invent fake product names, unverified prices, or fake policies.`;

interface Message {
  role: string;
  content: string;
}

async function callGemini(apiKey: string, prompt: string, history: Message[] = []): Promise<string> {
  const contents = [];
  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"];
  let lastErr: any = null;

  for (const modelName of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to get response from Gemini");
}

async function callGroq(apiKey: string, prompt: string, history: Message[] = []): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.0,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Groq error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return reply;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to get response from Groq");
}

async function callOpenAI(apiKey: string, prompt: string, history: Message[] = []): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.0,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const history: Message[] = body.history || [];
    const headerKey = req.headers.get("x-gemini-key");
    const clientKey = (body.api_key || headerKey || "").trim();

    // Check if an external backend is configured (e.g. Render / Railway)
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl && !backendUrl.includes("127.0.0.1:8000") && !backendUrl.includes("localhost:8000")) {
      try {
        const proxyRes = await fetch(`${backendUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(clientKey ? { "x-gemini-key": clientKey } : {}),
          },
          body: JSON.stringify(body),
        });
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        console.warn("External backend proxy failed, falling back to embedded RAG:", err);
      }
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Retrieve relevant chunks using embedded vector store
    const chunks = retrieveChunks(message, 6);
    const contextUsed = chunks.length > 0;

    const sources = chunks.slice(0, 4).map((c) => ({
      title: c.title,
      doc_type: c.doc_type,
      score: c.score ?? 0,
    }));

    // 2. Build context block
    let contextBlock = "KNOWLEDGE BASE CONTEXT:\n";
    if (chunks.length > 0) {
      chunks.forEach((c, i) => {
        contextBlock += `\n[${i + 1}] ${c.title} (Type: ${c.doc_type}):\n${c.content}\n`;
      });
    } else {
      contextBlock += "[No matching information found in the knowledge base.]";
    }

    const augmentedUserMessage = `${contextBlock}\n\nUSER QUESTION: ${message}`;

    // 3. Resolve active API Key
    const groqEnv = (process.env.GROQ_API_KEY || "").trim();
    const geminiEnv = (process.env.GEMINI_API_KEY || "").trim();
    const openaiEnv = (process.env.OPENAI_API_KEY || "").trim();

    let reply = "";

    try {
      if (clientKey) {
        if (clientKey.startsWith("gsk_")) {
          reply = await callGroq(clientKey, augmentedUserMessage, history);
        } else if (clientKey.startsWith("sk-")) {
          try {
            reply = await callOpenAI(clientKey, augmentedUserMessage, history);
          } catch {
            if (groqEnv) reply = await callGroq(groqEnv, augmentedUserMessage, history);
            else if (geminiEnv) reply = await callGemini(geminiEnv, augmentedUserMessage, history);
            else throw new Error("OpenAI call failed and no fallback keys configured");
          }
        } else {
          reply = await callGemini(clientKey, augmentedUserMessage, history);
        }
      } else if (groqEnv) {
        reply = await callGroq(groqEnv, augmentedUserMessage, history);
      } else if (geminiEnv) {
        reply = await callGemini(geminiEnv, augmentedUserMessage, history);
      } else if (openaiEnv) {
        reply = await callOpenAI(openaiEnv, augmentedUserMessage, history);
      } else {
        return NextResponse.json({
          reply:
            "🔑 **API Key needed**: Please provide your API key in the top bar or add `GEMINI_API_KEY` (or `GROQ_API_KEY`) to your Vercel Environment Variables to generate live answers. Qdrant vector retrieval is already active and found the context sources shown below!",
          sources,
          context_used: contextUsed,
        });
      }
    } catch (err: any) {
      reply = `Error communicating with AI model: ${err.message || String(err)}`;
    }

    return NextResponse.json({
      reply,
      sources,
      context_used: contextUsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
