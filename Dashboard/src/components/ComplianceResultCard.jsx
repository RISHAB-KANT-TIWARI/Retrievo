import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const STATUS_CONFIG = {
  Match: { dot: "bg-status-match", label: "Match" },
  Deviation: { dot: "bg-status-fail", label: "Deviation" },
  "Cannot verify": { dot: "bg-status-partial", label: "Cannot verify" },
};

/**
 * One row of the compliance-check results. `result` must match the shape
 * documented in api/client.js runComplianceCheck():
 * { requirement, specified_value, submitted_value, status, severity }
 */
export default function ComplianceResultCard({ result, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);
  const badgeRef = useRef(null);
  const bodyRef = useRef(null);

  const status = STATUS_CONFIG[result.status] || STATUS_CONFIG["Cannot verify"];

  useGSAP(
    () => {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        delay: index * 0.06,
        ease: "power2.out",
      });
      // Spring-bounce status badge: 0.8 -> 1.1 -> 1.0
      gsap.fromTo(
        badgeRef.current,
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          delay: index * 0.06 + 0.15,
          ease: "back.out(2.5)", // overshoots then settles — the 1.1 -> 1.0 feel
        }
      );
    },
    { scope: cardRef }
  );

  useGSAP(
    () => {
      if (!bodyRef.current) return;
      if (expanded) {
        gsap.fromTo(
          bodyRef.current,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out" }
        );
      } else {
        gsap.to(bodyRef.current, { height: 0, opacity: 0, duration: 0.25, ease: "power2.in" });
      }
    },
    { dependencies: [expanded] }
  );

  return (
    <div
      ref={cardRef}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span ref={badgeRef} className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
          <span className="text-text-primary text-sm font-medium">{result.requirement}</span>
        </div>
        <div className="flex items-center gap-3">
          {result.severity && (
            <span className="text-xs text-text-muted uppercase tracking-wide">
              {result.severity}
            </span>
          )}
          <span className="text-xs text-text-secondary">{status.label}</span>
        </div>
      </button>

      <div ref={bodyRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EvidenceBlock label="Specified Value" value={result.specified_value} />
          <EvidenceBlock label="Submitted Value" value={result.submitted_value} />
        </div>
      </div>
    </div>
  );
}

function EvidenceBlock({ label, value }) {
  return (
    <div className="bg-surface-2 border border-border-soft rounded-lg p-3 font-mono text-xs">
      <div className="text-text-muted mb-1 font-sans">{label}</div>
      <div className="text-text-primary">{value || "Not stated"}</div>
    </div>
  );
}
