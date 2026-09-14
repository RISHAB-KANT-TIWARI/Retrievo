import { useEffect } from "react";

/**
 * liquid-glass.js (vendored as-is from the liquid-glass skill, unmodified)
 * is a plain IIFE that attaches `liquidGlass` to `window` — it's written
 * for a <script> tag, not an ES module `export`. So instead of importing
 * it, we load it once via a real <script> tag and call window.liquidGlass.
 * This keeps the skill file untouched ("reuse it — do not re-derive it").
 */
let loadPromise = null;
function ensureLoaded() {
  if (window.liquidGlass) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/liquid-glass.js"; // served from public/ — see vite.config note in README
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return loadPromise;
}

export default function useLiquidGlass(ref, options = {}, deps = []) {
  useEffect(() => {
    let glass = null;
    let cancelled = false;

    ensureLoaded().then(() => {
      if (cancelled || !ref.current || !window.liquidGlass) return;
      glass = window.liquidGlass(ref.current, options);
    });

    return () => {
      cancelled = true;
      if (glass) glass.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
