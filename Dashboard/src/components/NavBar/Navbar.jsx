import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

const DEFAULT_LINKS = [
  { label: "Dashboard", to: "/" },
  { label: "Ask", to: "/ask" },
  { label: "Compliance", to: "/compliance" },
  { label: "Documents", to: "/documents" },
];

export default function Navbar({ title = "EPC Intelligence", onMenuClick, links = DEFAULT_LINKS }) {
  const [shrunk, setShrunk] = useState(false);
  const pillRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!pillRef.current || !window.liquidGlass) return;
    const glass = window.liquidGlass(pillRef.current, {
      scale: -150,
      chroma: 12,
      border: 0.1,
      mapBlur: 14,
      blur: 6,
      saturate: 1.9,
      fallbackBlur: 20,
    });
    return () => glass.destroy();
  }, []);

  return (
    <nav className="navbar-wrap">
      <div
        ref={pillRef}
        className={`navbar-pill${shrunk ? " navbar-pill--shrunk" : ""}`}
      >
        <div className="navbar-brand">
          {onMenuClick ? (
            <button className="navbar-menu" onClick={onMenuClick} aria-label="Open menu" type="button">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <span className="navbar-logo">{title}</span>
        </div>

        <ul className="navbar-links">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to}>{link.label}</NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}