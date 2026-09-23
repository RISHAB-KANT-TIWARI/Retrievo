import { useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import FileViewer from "./pages/FileViewer";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/NavBar/Navbar";
import Home from "./pages/Home";
import AskDocuments from "./pages/AskDocuments";
import ComplianceCheck from "./pages/ComplianceCheck";
import Documents from "./pages/Documents";
import Emails from "./pages/Emails";
import ColdStartBanner from "./components/ColdStartBanner";

const TITLES = {
  "/": "Sovereign AI Workbench",
  "/ask": "Ask Documents",
  "/compliance": "Compliance Audit",
  "/documents": "Document Vault",
  "/emails": "Internal Correspondence",
};

function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat state lives here so it survives route changes
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDocType, setChatDocType] = useState("All");

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
          title={TITLES[location.pathname] || "Sovereign AI Workbench"}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <ColdStartBanner />
        <div ref={contentRef}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/ask"
              element={
                <AskDocuments
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  docType={chatDocType}
                  setDocType={setChatDocType}
                />
              }
            />
            <Route path="/compliance" element={<ComplianceCheck />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/view/:documentId" element={<FileViewer />} />
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
