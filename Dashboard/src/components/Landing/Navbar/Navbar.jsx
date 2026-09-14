import { useRef, useState, useEffect } from "react";
import "./liquid-glass.js"; // attaches window.liquidGlass
import "./Navbar.css";

const LINKS = [
    { label: "Overview", href: "#overview" },
    { label: "Workflow", href: "#workflow" },
    { label: "Capabilities", href: "#capabilities" },
];

export default function Navbar() {
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
            scale: -150,      // strong bulge (skill's "dramatic" range starts ~ -180)
            chroma: 12,        // pronounced rainbow/prism fringe
            border: 0.1,       // active rim band, correctly scaled (was 9 — way out of range)
            mapBlur: 14,       // slightly softer rim to match the bigger bulge
            blur: 6,          // lighter backdrop blur so refracted detail stays visible
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
                <span className="navbar-logo">EPC mind</span>
                <ul className="navbar-links">
                    {LINKS.map((l) => (
                        <li key={l.href}>
                            <a href={l.href}>{l.label}</a>
                        </li>
                    ))}
                </ul>
                <button className="navbar-cta">Try Demo</button>
            </div>
        </nav>
    );
}