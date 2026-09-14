import { useRef, useState } from "react";
import ChatMessage from "../components/ChatMessage";
import ThinkingSkeleton from "../components/ThinkingSkeleton";
import EmptyState from "../components/EmptyState";
import { askQuestion, askImageQuestion } from "../api/client";
import { useToast } from "../components/Toast";

const DOC_TYPES = ["All", "Specification", "Vendor Submittal", "RFI", "Procurement Schedule", "Email"];
const MODELS = [
  { id: "qwen", label: "Qwen" },
  { id: "gemini", label: "Gemini" },
];

export default function AskDocuments({ messages, setMessages, docType, setDocType }) {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("qwen");
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const toast = useToast();
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    setAttachedPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    setAttachedPreview(null);
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: question + (attachedImage ? " 📎 (image attached)" : "") },
    ]);
    setInput("");
    const imageToSend = attachedImage;
    removeAttachedImage();
    setLoading(true);

    try {
      const filter = docType === "All" ? null : docType;

      if (imageToSend) {
        const res = await askImageQuestion(question, imageToSend, filter);
        if (res.data.status === "error") {
          toast?.show(res.data.message, "error");
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: res.data.message, sources: [] },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: res.data.answer, sources: [] },
          ]);
        }
      } else {
        const res = await askQuestion(question, filter, provider);
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: res.data.answer, sources: res.data.sources || [] },
        ]);
      }
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
        <div className="flex items-center gap-2">
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

      {attachedPreview && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-surface border border-border rounded-xl w-fit">
          <img src={attachedPreview} alt="attached" className="h-10 w-10 object-cover rounded-lg" />
          <span className="text-xs text-text-secondary truncate max-w-[140px]">
            {attachedImage?.name}
          </span>
          <button
            onClick={removeAttachedImage}
            className="text-text-muted hover:text-status-fail text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex gap-2 mt-4 items-center sticky bottom-0 bg-canvas pt-2 pb-1 -mx-4 px-4 sm:-mx-8 sm:px-8">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach an image"
          className="shrink-0 h-[46px] w-[46px] rounded-xl bg-surface border border-border text-text-secondary text-lg hover:border-accent/50 hover:text-text-primary transition-colors flex items-center justify-center"
        >
          +
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedImage
              ? "Ask something about the attached image…"
              : "Ask a question grounded in local specs, P&IDs, submittals, or correspondence…"
          }
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />

        <div className="relative shrink-0">
          <button
            onClick={() => setShowModelMenu((v) => !v)}
            className="h-[46px] px-3 rounded-xl bg-surface border border-border text-text-secondary text-xs flex items-center gap-1 hover:border-accent/50 hover:text-text-primary transition-colors"
          >
            {MODELS.find((m) => m.id === provider)?.label}
            <span className="text-[10px]">▾</span>
          </button>

          {showModelMenu && (
            <div className="absolute bottom-[52px] right-0 bg-surface border border-border rounded-xl overflow-hidden shadow-lg z-10 min-w-[100px]">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setProvider(m.id);
                    setShowModelMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors ${
                    provider === m.id ? "text-accent font-medium" : "text-text-secondary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

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