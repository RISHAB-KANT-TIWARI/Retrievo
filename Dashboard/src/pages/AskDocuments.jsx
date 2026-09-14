import { useRef, useState } from "react";
import ChatMessage from "../components/ChatMessage";
import ThinkingSkeleton from "../components/ThinkingSkeleton";
import EmptyState from "../components/EmptyState";
import { askQuestion } from "../api/client";
import { useToast } from "../components/Toast";

const DOC_TYPES = ["All", "Specification", "Vendor Submittal", "RFI", "Procurement Schedule", "Email"];

/**
 * BACKEND NOTE: calls POST /ask on submit. See api/client.js askQuestion()
 * for the exact request/response contract. `sources` in the response is
 * what powers the citation chips under each AI message.
 */
export default function AskDocuments({ messages, setMessages, docType, setDocType }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const scrollRef = useRef(null);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const filter = docType === "All" ? null : docType;
      const res = await askQuestion(question, filter);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: res.data.answer, sources: res.data.sources || [] },
      ]);
    } catch (err) {
      toast?.show("Couldn't reach the AI backend. Is FastAPI running?", "error");
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, something went wrong reaching the document index.", sources: [] },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Ask Documents</h2>
          <p className="text-xs text-text-muted mt-0.5">Air-Gapped Grounded Retrieval • Local GPU Inference</p>
        </div>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary"
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 && !loading && (
          <EmptyState
            icon="💬"
            title="Query Sovereign Knowledge Base"
            description='Grounded in local specs, P&IDs, vendor submittals, and correspondence. Try: "What battery backup runtime does the specification require?"'
          />
        )}

        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} text={m.text} sources={m.sources} />
        ))}

        {loading && <ThinkingSkeleton />}
        <div ref={scrollRef} />
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question grounded in local specs, P&IDs, submittals, or correspondence…"
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-accent text-white text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
