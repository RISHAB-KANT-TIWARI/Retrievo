import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * A single dashboard stat card (e.g. "12,530 Chunks"). Value counts up from
 * zero on mount, easing out as it approaches the target — per design spec.
 *
 * BACKEND NOTE: `value` should come from GET /stats (see api/client.js
 * getStats()). Pass raw numbers here, not pre-formatted strings.
 */
export default function StatCard({ label, value, index = 0 }) {
  const cardRef = useRef(null);
  const numberRef = useRef(null);
  const counter = useRef({ val: 0 });
  const hasAnimatedIn = useRef(false);

  // Initial fade-up animation (runs once on mount)
  useGSAP(
    () => {
      if (hasAnimatedIn.current) return; // Only animate on first render
      hasAnimatedIn.current = true;

      gsap.fromTo(
        cardRef.current,
        {
          y: 16,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          delay: index * 0.08,
          ease: "power2.out",
        }
      );
    },
    { scope: cardRef }
  );

  // Counter update (runs when value changes from backend)
  useEffect(() => {
    gsap.to(counter.current, {
      val: value,
      duration: 1.2,
      delay: hasAnimatedIn.current ? 0 : index * 0.08 + 0.15,
      ease: "power2.out",
      onUpdate: () => {
        if (numberRef.current) {
          numberRef.current.textContent = Math.round(counter.current.val).toLocaleString();
        }
      },
    });
  }, [value, index]);

  return (
    <div
      ref={cardRef}
      className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-1"
    >
      <span ref={numberRef} className="text-3xl font-semibold text-text-primary">
        0
      </span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
