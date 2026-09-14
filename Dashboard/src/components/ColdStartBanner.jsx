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
      className="mx-4 sm:mx-8 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 flex items-start gap-3"
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-amber-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      {/* Text */}
      <div className="flex-1 text-sm leading-relaxed">
        <span className="font-semibold text-amber-300">Heads up — </span>
        <span className="text-amber-100/90">
          The demo backend runs on Render's free tier and may take 1–2 minutes
          to wake after inactivity. If the first request is slow or briefly
          fails, wait a moment and retry — the server is restarting.
        </span>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 text-amber-400/70 hover:text-amber-300 transition-colors"
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
