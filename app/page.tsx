"use client";

import React, { useState, useEffect, useRef } from "react";
import { AVATAR_PRESETS, UserAvatarDisplay } from "./avatars";

interface SourceChunk {
  title: string;
  doc_type: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  isFallback?: boolean;
}

interface HealthState {
  online: boolean;
  qdrantReady?: boolean;
  geminiReady?: boolean;
  groqReady?: boolean;
  openaiReady?: boolean;
}

const QUICK_PROMPTS = [
  { label: "🔥 Who is Ash?", query: "Who are you and what is your role at TechMart?" },
  { label: "📦 Return Policy", query: "What is the return policy for electronics and what condition must items be in?" },
  { label: "💻 Lenovo Legion Pro 5", query: "What is the price and stock status of the Lenovo Legion Pro 5?" },
  { label: "🔍 Order ORD-101", query: "What is the status of order ORD-101 for Ali?" },
  { label: "🎧 Headphones in Stock", query: "What kind of headphones do you have in stock?" },
  { label: "❓ Unrelated Question", query: "Who was the first president of the United States?" },
];


// Helper to parse inline markdown (bold **text** without showing raw asterisks mid-typing)
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    parts.push(
      <strong key={match.index} style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>
        {match[1]}
      </strong>
    );
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    let remainder = text.substring(lastIdx);
    if (remainder.startsWith("**")) {
      // Strip opening ** and wrap ongoing characters in bold so raw asterisks never leak
      remainder = remainder.substring(2);
      parts.push(
        <strong key="partial-bold" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>
          {remainder}
        </strong>
      );
    } else {
      parts.push(remainder);
    }
  }

  return parts;
}

// Helper to format block elements (paragraphs, bullets, numbers)
function renderFormattedBlocks(rawText: string) {
  const lines = rawText.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="typewriter-spacer" />;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div key={idx} className="typewriter-bullet" style={{ fontFamily: "'Sora', sans-serif" }}>
          <span className="typewriter-bullet-dot">•</span>
          <span className="typewriter-bullet-text" style={{ fontFamily: "'Sora', sans-serif" }}>
            {parseInline(trimmed.substring(2))}
          </span>
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
    if (numMatch) {
      return (
        <div key={idx} className="typewriter-numbered" style={{ fontFamily: "'Sora', sans-serif" }}>
          <span className="typewriter-number-badge">{numMatch[1]}</span>
          <span className="typewriter-numbered-text" style={{ fontFamily: "'Sora', sans-serif" }}>
            {parseInline(numMatch[2])}
          </span>
        </div>
      );
    }
    return (
      <p key={idx} className="typewriter-p" style={{ fontFamily: "'Sora', sans-serif" }}>
        {parseInline(line)}
      </p>
    );
  });
}

// Letter-by-letter typing animation component with Sora font
function TypewriterReply({
  text,
  animate,
  onProgress,
  onComplete,
}: {
  text: string;
  animate: boolean;
  onProgress?: () => void;
  onComplete?: () => void;
}) {
  const [displayedLength, setDisplayedLength] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(text.length);
      return;
    }

    setDisplayedLength(0);
    let current = 0;
    // Exactly 1 letter per tick for unmistakable, true letter-by-letter typing!
    const timer = setInterval(() => {
      current += 1;
      if (current >= text.length) {
        current = text.length;
        setDisplayedLength(text.length);
        clearInterval(timer);
        onComplete?.();
      } else {
        setDisplayedLength(current);
        onProgress?.();
      }
    }, 14);

    return () => clearInterval(timer);
  }, [text, animate]);

  const isTyping = animate && displayedLength < text.length;
  const currentSlice = text.slice(0, displayedLength);

  return (
    <div
      className="sora-reply-content"
      style={{ fontFamily: "'Sora', sans-serif" }}
      onClick={() => {
        if (isTyping) {
          setDisplayedLength(text.length);
          onComplete?.();
        }
      }}
      title={isTyping ? "Click to reveal all text" : undefined}
    >
      {renderFormattedBlocks(currentSlice)}
      {isTyping && <span className="sora-typing-cursor">▌</span>}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      content:
        "👋 **Hey there! I'm Ash**, your friendly tech guide here at TechMart!\n\nWhether you're looking for a new laptop, smartphone, noise-cancelling headphones, or need help checking an order or return policy, I'm right here to help you out.\n\nWhat kind of gear or questions are on your mind today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // User Profile State
  const [userName, setUserName] = useState("Alex");
  const [userAvatar, setUserAvatar] = useState("male_1");
  const [userCustomPfp, setUserCustomPfp] = useState<string | null>(null);

  // Profile Customization Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tempName, setTempName] = useState("Alex");
  const [tempAvatar, setTempAvatar] = useState("male_1");
  const [tempCustomPfp, setTempCustomPfp] = useState<string | null>(null);
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key management
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Health state
  const [health, setHealth] = useState<HealthState>({ online: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const completedIdsRef = useRef<Set<string>>(new Set());

  // Load API Key & Profile from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem("techmart_ash_api_key");
      if (stored) {
        setApiKey(stored);
        setTempApiKey(stored);
      }
      const savedName = localStorage.getItem("techmart_ash_user_name");
      if (savedName) {
        setUserName(savedName);
        setTempName(savedName);
      }
      const savedAvatar = localStorage.getItem("techmart_ash_user_avatar");
      if (savedAvatar) {
        setUserAvatar(savedAvatar);
        setTempAvatar(savedAvatar);
      }
      const savedCustomPfp = localStorage.getItem("techmart_ash_custom_pfp");
      if (savedCustomPfp) {
        setUserCustomPfp(savedCustomPfp);
        setTempCustomPfp(savedCustomPfp);
      }
    } catch {
      // localStorage may fail in private browsing
    }
  }, []);

  // Poll backend health status
  const checkHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealth({
          online: true,
          qdrantReady: data.qdrant_ready,
          geminiReady: data.gemini_ready,
          groqReady: data.groq_ready,
          openaiReady: data.openai_ready,
        });
      } else {
        setHealth({ online: false });
      }
    } catch {
      setHealth({ online: false });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSaveKey = () => {
    const cleaned = tempApiKey.trim();
    setApiKey(cleaned);
    try {
      if (cleaned) {
        localStorage.setItem("techmart_ash_api_key", cleaned);
      } else {
        localStorage.removeItem("techmart_ash_api_key");
      }
    } catch {
      // ignore
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setIsKeyModalOpen(false);
    }, 900);
  };

  const handleClearKey = () => {
    setApiKey("");
    setTempApiKey("");
    try {
      localStorage.removeItem("techmart_ash_api_key");
    } catch {
      // ignore
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setIsKeyModalOpen(false);
    }, 700);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Please select an image smaller than 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.88);
        setTempCustomPfp(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomPfp = () => {
    setTempCustomPfp(null);
  };

  const handleSaveProfile = () => {
    const cleaned = tempName.trim() || "User";
    setUserName(cleaned);
    setUserAvatar(tempAvatar);
    setUserCustomPfp(tempCustomPfp);
    try {
      localStorage.setItem("techmart_ash_user_name", cleaned);
      localStorage.setItem("techmart_ash_user_avatar", tempAvatar);
      if (tempCustomPfp) {
        localStorage.setItem("techmart_ash_custom_pfp", tempCustomPfp);
      } else {
        localStorage.removeItem("techmart_ash_custom_pfp");
      }
    } catch {
      // ignore
    }
    setProfileSavedToast(true);
    setTimeout(() => {
      setProfileSavedToast(false);
      setIsProfileModalOpen(false);
    }, 850);
  };

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleNewChat = () => {
    completedIdsRef.current.clear();
    setMessages([
      {
        id: "initial-welcome",
        role: "assistant",
        content:
          "👋 **Hey there! I'm Ash**, your friendly tech guide here at TechMart!\n\nWhether you're looking for a new laptop, smartphone, noise-cancelling headphones, or need help checking an order or return policy, I'm right here to help you out.\n\nWhat kind of gear or questions are on your mind today?",
      },
    ]);
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      { id: userMsgId, role: "user", content: query },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build clean history without introductory message
      const history = messages
        .filter((m) => m.id !== "initial-welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["x-gemini-key"] = apiKey;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: query,
          history: history,
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || "";
      const sources: SourceChunk[] = data.sources || [];
      const isFallback =
        replyText.toLowerCase().includes("i don't know") ||
        replyText.toLowerCase().includes("i donk know");


      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: replyText,
          sources: sources,
          isFallback: isFallback,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Connection notice: ${err.message || "Failed to reach backend"}. Please ensure the backend server is running on port 8000 (\`python api.py\`).`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isKeyConfigured = Boolean(
    apiKey || health.geminiReady || health.groqReady || health.openaiReady
  );

  return (
    <div className="app-container" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* ── Top-left corner: Profile button ───────────────── */}
      <div className="corner-actions-tl">
        <button
          className="corner-profile-btn"
          onClick={() => {
            setTempName(userName);
            setTempAvatar(userAvatar);
            setTempCustomPfp(userCustomPfp);
            setIsProfileModalOpen(true);
          }}
          title="Edit your profile"
        >
          <UserAvatarDisplay avatarId={userAvatar} customUrl={userCustomPfp} size={28} />
          <span>{userName}</span>
        </button>
      </div>

      {/* ── Top-right corner: New Chat ───────────── */}
      <div className="corner-actions-tr">

        <button
          className="corner-new-chat-btn"
          onClick={handleNewChat}
          title="Start a fresh conversation"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Main Chat Layout */}
      <div className="chat-layout">
        <main className="chat-container">
          {/* Messages list */}
          <div className="messages-list">
            {messages.map((m) => {
              const shouldAnimate = m.role === "assistant" && !completedIdsRef.current.has(m.id);
              const isCopied = copiedId === m.id;

              return (
                <div key={m.id} className={`message-row ${m.role}`}>
                  {m.role === "user" && (
                    <div className="avatar user">
                      <UserAvatarDisplay
                        avatarId={userAvatar}
                        customUrl={userCustomPfp}
                        size={36}
                      />
                    </div>
                  )}
                  <div className="message-bubble">
                    {m.role === "user" && (
                      <div className="msg-sender-name">{userName}</div>
                    )}
                    <div
                      className={`bubble-content ${m.isFallback ? "fallback-unknown" : ""}`}
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      {m.role === "assistant" ? (
                        <TypewriterReply
                          text={m.content}
                          animate={shouldAnimate}
                          onProgress={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                          onComplete={() => {
                            completedIdsRef.current.add(m.id);
                          }}
                        />
                      ) : (
                        <span style={{ fontFamily: "'Sora', sans-serif" }}>{m.content}</span>
                      )}
                    </div>

                    {/* Assistant Message Actions: Copy Button */}
                    {m.role === "assistant" && m.id !== "initial-welcome" && (
                      <div className="message-actions">
                        <button
                          className={`copy-msg-btn ${isCopied ? "copied" : ""}`}
                          onClick={() => handleCopy(m.id, m.content)}
                          title="Copy Ash's answer to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="message-row assistant">
                <div className="message-bubble">
                  <div className="bubble-content" style={{ padding: "10px 16px" }}>
                    <div className="typing-dots">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="quick-prompts">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                className="prompt-chip"
                style={{ fontFamily: "'Sora', sans-serif" }}
                onClick={() => sendMessage(qp.query)}
                disabled={loading}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="input-bar">
            <input
              type="text"
              className="chat-input"
              style={{ fontFamily: "'Sora', sans-serif" }}
              placeholder="Ask about TechMart policies, products, orders, or gear recommendations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="send-btn"
              style={{ fontFamily: "'Sora', sans-serif" }}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <span>Send</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </main>
      </div>

      {/* API Key Modal Dialog */}
      {isKeyModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsKeyModalOpen(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Configure AI Model API Key</h3>
              <button
                className="close-btn"
                onClick={() => setIsKeyModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-info-note">
                Ash strictly grounds all responses using local <strong>Qdrant Vector Search</strong>.
                To generate live conversational answers, provide your API key below or configure it in the backend <code>.env</code> file.
              </div>

              <div className="provider-tags">
                <span className="provider-tags-label">Supported:</span>
                <span className="provider-tag">Google Gemini (AIzaSy...)</span>
                <span className="provider-tag">Groq (gsk_...)</span>
                <span className="provider-tag">OpenAI (sk-...)</span>
              </div>

              <div className="modal-input-group">
                <label className="modal-label">API Key</label>
                <div className="modal-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="modal-input"
                    placeholder="Paste AIzaSy... or gsk_... or sk-..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-pwd-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide key" : "Show key"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Status information */}
              {apiKey && (
                <div style={{ fontSize: "0.76rem", color: "#34d399" }}>
                  ✓ Custom browser key saved in local storage.
                </div>
              )}
              {!apiKey && (health.geminiReady || health.groqReady || health.openaiReady) && (
                <div style={{ fontSize: "0.76rem", color: "#38bdf8" }}>
                  ✓ Server has preconfigured environment keys in <code>.env</code>. You can optionally override it here.
                </div>
              )}
              {!apiKey && !health.geminiReady && !health.groqReady && !health.openaiReady && (
                <div style={{ fontSize: "0.76rem", color: "#fbbf24" }}>
                  ⚠️ No API key detected. Please paste your Gemini or Groq key to enable AI completions.
                </div>
              )}
            </div>

            <div className="modal-footer">
              {apiKey && (
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={handleClearKey}
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsKeyModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveKey}
              >
                {keySavedToast ? "Saved ✓" : "Save API Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile & Avatar Modal ──────────────────────────────────── */}
      {isProfileModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <div className="modal-card simple-profile-card">
            {/* Header */}
            <div className="modal-header">
              <h3>Your Profile</h3>
              <button className="close-btn" onClick={() => setIsProfileModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Name input */}
              <div className="simple-name-group">
                <label className="simple-label">Display Name</label>
                <input
                  type="text"
                  maxLength={28}
                  className="simple-name-input"
                  placeholder="Your name..."
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
              </div>

              {/* Avatar grid */}
              <div className="simple-avatar-section">
                <label className="simple-label">Choose Avatar</label>
                <div className="simple-avatar-grid">
                  {/* Custom upload slot */}
                  <button
                    type="button"
                    className={`simple-avatar-item ${tempCustomPfp ? "active" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload your own photo"
                  >
                    <div className="simple-avatar-circle simple-upload-circle">
                      {tempCustomPfp ? (
                        <img src={tempCustomPfp} alt="Custom" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      )}
                    </div>
                    <span className="simple-avatar-label">{tempCustomPfp ? "Custom" : "Upload"}</span>
                  </button>

                  {/* 10 preset avatars */}
                  {AVATAR_PRESETS.map((preset) => {
                    const isActive = !tempCustomPfp && tempAvatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`simple-avatar-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          setTempAvatar(preset.id);
                          setTempCustomPfp(null);
                        }}
                        title={preset.name}
                      >
                        <div className="simple-avatar-circle">
                          {preset.renderSvg(48)}
                        </div>
                        <span className="simple-avatar-label">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />

                {tempCustomPfp && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "5px 10px", alignSelf: "flex-start" }}
                    onClick={handleRemoveCustomPfp}
                  >
                    Remove custom photo
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsProfileModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSaveProfile}>
                {profileSavedToast ? "Saved ✓" : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
