import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import DocumentBadge from "./DocumentBadge";

/**
 * A single chat message. `role` is "user" or "ai".
 * `sources` (AI messages only) is the array your FastAPI /ask endpoint
 * should return alongside `answer` — see api/client.js askQuestion() docs.
 * Each source: { filename, document_type, text, distance }
 */
export default function ChatMessage({ role, text, sources = [] }) {
  const msgRef = useRef(null);

  useGSAP(
    () => {
      // Slide up from bottom + fade in on entry
      gsap.from(msgRef.current, {
        y: 15,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: msgRef }
  );

  const isUser = role === "user";

  return (
    <div ref={msgRef} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[75%] ${isUser ? "" : "w-full"}`}>
        <div
          className={
            isUser
              ? "bg-accent-soft border border-accent/30 text-text-primary rounded-2xl rounded-br-sm px-4 py-2.5"
              : "bg-transparent border border-border text-text-primary rounded-2xl rounded-bl-sm px-4 py-3"
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>

        {!isUser && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-1">
            {sources.map((src, i) => (
              <SourceChip key={i} source={src} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pill-shaped citation chip. Expands to show the retrieved chunk text
 * so judges can verify the AI actually grounded its answer in a real
 * document — this is a strong trust-builder in a live demo.
 */
function SourceChip({ source, index }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  useGSAP(
    () => {
      if (!bodyRef.current) return;
      if (open) {
        gsap.fromTo(
          bodyRef.current,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        gsap.to(bodyRef.current, { height: 0, opacity: 0, duration: 0.2, ease: "power2.in" });
      }
    },
    { dependencies: [open] }
  );

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        Source {index + 1}
        <DocumentBadge type={source.document_type} />
      </button>
      <div ref={bodyRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-surface-2 border border-border-soft text-xs text-text-secondary">
          <div className="text-text-muted mb-1">{source.filename}</div>
          {source.text}
        </div>
      </div>
    </div>
  );
}
