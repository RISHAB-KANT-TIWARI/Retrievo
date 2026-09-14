import { useEffect, useState } from "react";

/**
 * Top navbar. Solid dark background (no glass), subtle bottom border that
 * fades in on scroll. Below lg, shows a hamburger button that toggles the
 * Sidebar drawer — the open/close state lives in App.jsx and is passed down.
 */
export default function Navbar({ title = "Dashboard", onMenuClick }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-10 bg-canvas px-4 sm:px-8 py-4 flex items-center gap-3 transition-[border-color] duration-300 border-b ${
        scrolled ? "border-white/5" : "border-transparent"
      }`}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden text-text-secondary hover:text-text-primary p-1 -ml-1"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <h1 className="text-text-primary text-base sm:text-lg font-medium truncate">{title}</h1>
    </header>
  );
}
