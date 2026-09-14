import { useRef } from "react";
import { NavLink } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useLiquidGlass from "../lib/useLiquidGlass";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/ask", label: "Ask Documents" },
  { to: "/compliance", label: "Compliance Check" },
  { to: "/documents", label: "Documents" },
];

/**
 * Responsive behavior:
 * - lg and up: fixed rail, always visible, pushes content via App.jsx's ml-[17rem].
 * - below lg: off-canvas drawer, hidden by default (translate-x-[-110%]),
 *   toggled open by the hamburger button in Navbar (state lives in App.jsx).
 *   A dark backdrop covers the content and closes the drawer on click.
 */
export default function Sidebar({ open, onClose }) {
  const sidebarRef = useRef(null);
  const backdropRef = useRef(null);

  useLiquidGlass(sidebarRef, { scale: -100, chroma: 5, blur: 4 }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      gsap.from(sidebarRef.current, {
        x: -20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    });
    return () => mm.revert();
  }, { scope: sidebarRef });

  // Backdrop fade is simple enough to keep on GSAP — no transform conflicts here.
  useGSAP(
    () => {
      gsap.to(backdropRef.current, {
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        duration: 0.25,
      });
    },
    { dependencies: [open] }
  );

  return (
    <>
      {/* Mobile-only dim backdrop, closes drawer on click. Invisible on lg+. */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="lg:hidden fixed inset-0 bg-black/60 z-30 opacity-0 pointer-events-none"
      />

      <aside
        ref={sidebarRef}
        className={`fixed left-3 top-3 bottom-3 w-64 rounded-3xl p-4 flex flex-col z-40
                    transition-transform duration-300 ease-out
                    lg:translate-x-0
                    ${open ? "translate-x-0" : "-translate-x-[120%]"}`}
        style={{
          background: "linear-gradient(180deg, rgba(14,14,22,0.18), rgba(14,14,22,0.32))",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -8px 20px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.13)",
        }}
      >
        <div className="flex items-center justify-between px-2 mb-8 mt-2">
          <span className="text-text-primary font-semibold text-lg">EPC Intelligence</span>
          <button onClick={onClose} className="lg:hidden text-text-secondary text-xl leading-none">
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={onClose}>
              {({ isActive }) => <NavItem label={item.label} isActive={isActive} />}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2 text-text-muted text-xs">Ironwood Point Data Center</div>
      </aside>
    </>
  );
}

function NavItem({ label, isActive }) {
  const barRef = useRef(null);

  useGSAP(() => {
    gsap.set(barRef.current, { scaleY: isActive ? 1 : 0 });
  }, [isActive]);

  const handleEnter = () => {
    if (!isActive) gsap.to(barRef.current, { scaleY: 1, duration: 0.25, ease: "power2.out" });
  };
  const handleLeave = () => {
    if (!isActive) gsap.to(barRef.current, { scaleY: 0, duration: 0.25, ease: "power2.in" });
  };

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <span
        ref={barRef}
        className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent rounded-full origin-center"
        style={{ transform: "scaleY(0)" }}
      />
      <span className="ml-2 text-sm">{label}</span>
    </div>
  );
}
