import { useEffect, useRef, useState } from "react";
import ChatMessage from "../components/ChatMessage";
import ThinkingSkeleton from "../components/ThinkingSkeleton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import {
  askQuestion,
  askImageQuestion,
  getDocuments,
  deleteDocument,
  agentAsk,
  agentDeleteConfirmed,
} from "../api/client";
import { useToast } from "../components/Toast";

const DOC_TYPES = ["All", "Specification", "Vendor Submittal", "RFI", "Procurement Schedule", "Email"];
const DELETE_WORDS = /\b(delete|remove|hata|hatao|hatado|erase)\b/i;

export default function AskDocuments({ messages, setMessages, docType, setDocType }) {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("qwen");
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [switchPrompt, setSwitchPrompt] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getDocuments()
      .then((res) => setDocuments(res.data.documents || []))
      .catch(() => {});
  }, []);

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

  const handleDocSelect = (e) => {
    const newId = e.target.value;
    const prevId = selectedDocId;
    if (prevId && newId !== prevId) {
      const prevDoc = documents.find((d) => d.document_id === prevId);
      setSwitchPrompt({ prevId, prevName: prevDoc?.filename, nextId: newId });
    } else {
      setSelectedDocId(newId);
    }
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const looksLikeDelete = DELETE_WORDS.test(question);
    const selectedDoc = documents.find((d) => d.document_id === selectedDocId);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text:
          question +
          (attachedImage ? " 📎 (image attached)" : "") +
          (selectedDoc && !looksLikeDelete ? ` — [${selectedDoc.filename}]` : ""),
      },
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
          setMessages((prev) => [...prev, { role: "ai", text: res.data.message, sources: [] }]);
        } else {
          setMessages((prev) => [...prev, { role: "ai", text: res.data.answer, sources: [] }]);
        }
      } else if (selectedDocId && !looksLikeDelete) {
        // Manual dropdown selection active — old, unchanged behavior
        const res = await askQuestion(question, filter, provider, selectedDocId);
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: res.data.answer, sources: res.data.sources || [] },
        ]);
      } else {
        // Agent path — handles typed delete-requests, auto-filename detection, and normal Q&A
        const res = await agentAsk(question, provider);

        if (res.data.type === "confirm_delete") {
          setPendingDelete(res.data.matched_documents);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: `Confirm karo — ye file(s) delete kar dun: ${res.data.matched_documents
                .map((d) => d.filename)
                .join(", ")}?`,
              sources: [],
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text:
                res.data.answer +
                (res.data.auto_selected_document
                  ? `\n\n(${res.data.auto_selected_document} se automatically liya gaya)`
                  : ""),
              sources: res.data.sources || [],
            },
          ]);
        }
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Ask Documents</h2>
          <p className="text-xs text-text-muted mt-0.5">Air-Gapped Grounded Retrieval • Local GPU Inference</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-surface border border-border rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setProvider("qwen")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                provider === "qwen" ? "bg-accent text-white" : "text-text-secondary"
              }`}
            >
              Qwen
            </button>
            <button
              onClick={() => setProvider("gemini")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                provider === "gemini" ? "bg-accent text-white" : "text-text-secondary"
              }`}
            >
              Gemini
            </button>
          </div>
          <select
            value={selectedDocId}
            onChange={handleDocSelect}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary max-w-[160px]"
            title="Ask about one specific document manually (or just type its filename in your message)"
          >
            <option value="">All documents</option>
            {documents.map((doc) => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.filename}
              </option>
            ))}
          </select>
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

      {selectedDocId && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent w-fit">
          Asking only about:{" "}
          <strong>{documents.find((d) => d.document_id === selectedDocId)?.filename}</strong>
          <button
            onClick={() => setSelectedDocId("")}
            className="ml-2 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>
      )}

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
              : selectedDocId
              ? "Ask a question about this document…"
              : 'Ask a question, or say "SWOT analysis of report.pdf" / "delete report.pdf"…'
          }
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

      <Modal
        open={!!switchPrompt}
        title="Finished with this document?"
        onClose={() => {
          setSelectedDocId(switchPrompt.nextId);
          setSwitchPrompt(null);
        }}
        onConfirm={async () => {
          try {
            await deleteDocument(switchPrompt.prevId);
            setDocuments((prev) => prev.filter((d) => d.document_id !== switchPrompt.prevId));
            toast?.show(`${switchPrompt.prevName} removed`);
          } catch (err) {
            toast?.show("Failed to remove document", "error");
          } finally {
            setSelectedDocId(switchPrompt.nextId);
            setSwitchPrompt(null);
          }
        }}
        confirmLabel="Yes, delete it"
      >
        You're switching away from <strong>{switchPrompt?.prevName}</strong>. Delete it now to
        save space and keep the workspace clean? You can say no and keep it for later.
      </Modal>

      <Modal
        open={!!pendingDelete}
        title="Confirm deletion"
        onClose={() => {
          setMessages((prev) => [
            ...prev,
            { role: "ai", text: "Cancelled — no files were deleted.", sources: [] },
          ]);
          setPendingDelete(null);
        }}
        onConfirm={async () => {
          try {
            const ids = pendingDelete.map((d) => d.document_id);
            await agentDeleteConfirmed(ids);
            setDocuments((prev) => prev.filter((d) => !ids.includes(d.document_id)));
            if (ids.includes(selectedDocId)) setSelectedDocId("");
            toast?.show(`${pendingDelete.length} file(s) removed`);
            setMessages((prev) => [
              ...prev,
              { role: "ai", text: `Deleted: ${pendingDelete.map((d) => d.filename).join(", ")}`, sources: [] },
            ]);
          } catch (err) {
            toast?.show("Failed to delete files", "error");
          } finally {
            setPendingDelete(null);
          }
        }}
        confirmLabel="Yes, delete"
      >
        {pendingDelete && (
          <>
            Are you sure to delete this file?
            <ul className="mt-2 list-disc list-inside">
              {pendingDelete.map((d) => (
                <li key={d.document_id}>{d.filename}</li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}