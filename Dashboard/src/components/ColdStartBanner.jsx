import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const STORAGE_KEY = "coldstart-banner-dismissed";

/**
 * A dismissible info banner shown once per session to warn demo users
 * that the Render free-tier backend may need 1–2 min to wake up.
 */
export default function ColdStartBanner() {
  const [visible, setVisible] = useState(() => {
    // Show only once per browser session
    return !sessionStorage.getItem(STORAGE_KEY);
  });
  const bannerRef = useRef(null);

  useGSAP(
    () => {
      if (!visible || !bannerRef.current) return;
      gsap.fromTo(
        bannerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.6 }
      );
    },
    { dependencies: [visible] }
  );

  const dismiss = () => {
    if (!bannerRef.current) return;
    gsap.to(bannerRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setVisible(false);
      },
    });
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      style={{ opacity: 0 }} /* hidden until GSAP animates in */
      className="mx-4 sm:mx-8 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3 flex items-start gap-3"
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-emerald-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      {/* Text */}
      <div className="flex-1 text-sm leading-relaxed">
        <span className="font-semibold text-emerald-300">Air-Gapped Sovereign Node Active (PS 26117) — </span>
        <span className="text-emerald-100/90">
          Running 100% on-premises on local GPU hardware. Zero external network calls or cloud telemetry.
          Engineering drawings, P&amp;IDs, confidential specs, and correspondence remain strictly inside this secure enclave.
        </span>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 text-emerald-400/70 hover:text-emerald-300 transition-colors"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
