import { useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/NavBar/Navbar";
import Home from "./pages/Home";
import AskDocuments from "./pages/AskDocuments";
import ComplianceCheck from "./pages/ComplianceCheck";
import Documents from "./pages/Documents";
import ColdStartBanner from "./components/ColdStartBanner";

const TITLES = {
  "/": "Dashboard",
  "/ask": "Ask Documents",
  "/compliance": "Compliance Check",
  "/documents": "Documents",
};

function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useGSAP(
    () => {
      // 150ms crossfade between routes to avoid harsh flashes
      gsap.fromTo(
        contentRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.15, ease: "none" }
      );
    },
    { dependencies: [location.pathname] }
  );

  // Close the mobile drawer automatically whenever the route changes
  useGSAP(() => setSidebarOpen(false), { dependencies: [location.pathname] });

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* No left margin on mobile (sidebar is off-canvas); reserves space for
          the fixed rail only at lg+ where the sidebar is always visible. */}
      <div className="lg:ml-[17rem]">
        <Navbar
          title={TITLES[location.pathname] || "EPC Intelligence"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <ColdStartBanner />
        <div ref={contentRef}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ask" element={<AskDocuments />} />
            <Route path="/compliance" element={<ComplianceCheck />} />
            <Route path="/documents" element={<Documents />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </BrowserRouter>
  );
}
