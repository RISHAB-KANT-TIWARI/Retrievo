import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useLiquidGlass from "../lib/useLiquidGlass";

/**
 * Confirmation modal (e.g. "delete this document?"). Uses liquid glass
 * token #2 per the design spec — the only other place besides Sidebar
 * this effect should appear.
 */
export default function Modal({ open, title, children, onClose, onConfirm, confirmLabel = "Confirm" }) {
  const backdropRef = useRef(null);
  const cardRef = useRef(null);

  useLiquidGlass(cardRef, { scale: -112, chroma: 6, blur: 5 }, [open]);

  useGSAP(
    () => {
      if (!open) return;
      gsap.fromTo(
        backdropRef.current,
        { backdropFilter: "blur(0px)", opacity: 0 },
        { backdropFilter: "blur(10px)", opacity: 1, duration: 0.35, ease: "power2.out" }
      );
      gsap.fromTo(
        cardRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    },
    { dependencies: [open] }
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 mx-4"
        style={{
          background: "linear-gradient(180deg, rgba(14,14,22,0.18), rgba(14,14,22,0.32))",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -8px 20px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.13)",
        }}
      >
        <h3 className="text-text-primary font-medium mb-2">{title}</h3>
        <div className="text-text-secondary text-sm mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-status-fail/90 text-white hover:bg-status-fail transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
