import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../services/api.js";

const QUICK_PROMPTS = [
  { label: "💰 Current Balance", prompt: "What is my current balance and financial summary?" },
  { label: "📊 Budget Health", prompt: "Am I over budget in any category this month?" },
  { label: "🎯 Sinking Funds", prompt: "What is the status of my sinking funds?" },
  { label: "🔄 Upcoming Bills", prompt: "Do I have any upcoming recurring bills?" },
];

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "👋 Hi! I'm your FinanceFlow Assistant. Ask me anything about your balance, budgets, expenses, sinking funds, or upcoming recurring bills!",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

function formatMessageText(text) {
  if (!text) return "";
  // Split lines
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    // Process **bold** markers
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-emerald-300">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    // Check if bullet line
    const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");

    return (
      <span key={idx} className={isBullet ? "block pl-3 my-0.5" : "block min-h-[1.2em]"}>
        {formattedParts}
      </span>
    );
  });
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  async function handleSend(textToSend) {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setError("");
    setInput("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: query, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build conversation history (excluding initial greeting)
      const history = updatedMessages
        .slice(1, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage({ message: query, history });

      const assistantMsg = {
        role: "assistant",
        content: res.reply,
        mode: res.mode,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Sorry, I had trouble processing your query. Please try again.";
      setError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleResetChat() {
    setMessages([INITIAL_MESSAGE]);
    setError("");
    setInput("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-white shadow-glow transition duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(20,184,166,0.45)] focus:outline-none"
          title="Open FinanceFlow AI Assistant"
        >
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
          </div>

          <svg
            className="h-5 w-5 transition duration-300 group-hover:rotate-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm font-semibold tracking-wide">Ask FinanceFlow</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex h-[560px] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Finance Assistant</h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[11px] text-slate-400">AI & Deterministic Scoped Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                title="Reset conversation"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                title="Minimize chat"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m, idx) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-sm ${
                      isAssistant
                        ? m.isError
                          ? "border border-rose-500/30 bg-rose-950/40 text-rose-200"
                          : "rounded-tl-sm border border-white/10 bg-white/5 text-slate-200"
                        : "rounded-tr-sm border border-emerald-400/30 bg-emerald-500/20 text-emerald-100"
                    }`}
                  >
                    <div className="leading-relaxed">
                      {formatMessageText(m.content)}
                    </div>
                  </div>
                  <span className="mt-1 px-1 text-[10px] text-slate-500">{m.time}</span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-3 text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 [animation-delay:0.4s]"></span>
                  <span className="ml-2 text-[11px] text-slate-400">Analyzing your financial records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          {messages.length <= 3 && !isLoading && (
            <div className="border-t border-white/5 bg-slate-900/30 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Suggested Questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.prompt)}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-200"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-slate-900/80 p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask e.g. 'How much did I spend on food?'"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 transition focus:border-emerald-400 focus:bg-white/10 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white transition hover:scale-105 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              title="Send message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
