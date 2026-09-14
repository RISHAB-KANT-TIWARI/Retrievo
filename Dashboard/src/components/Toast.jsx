import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const ToastContext = createContext(null);

/**
 * Wrap the app in <ToastProvider> once (done in App.jsx). Any component
 * can then call useToast().show("message", "success" | "error") — e.g.
 * after a successful upload, or when an API call in api/client.js fails.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, variant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} variant={t.variant} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function Toast({ message, variant }) {
  const ref = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      ref.current,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" }
    );
    // Slide back out just before the 3s auto-remove in the provider
    gsap.to(ref.current, { x: 40, opacity: 0, duration: 0.3, delay: 2.6, ease: "power2.in" });
  }, []);

  const border = variant === "error" ? "border-status-fail/40" : "border-status-match/40";

  return (
    <div
      ref={ref}
      className={`bg-surface border ${border} rounded-xl px-4 py-3 text-sm text-text-primary shadow-card min-w-[220px]`}
    >
      {message}
    </div>
  );
}
