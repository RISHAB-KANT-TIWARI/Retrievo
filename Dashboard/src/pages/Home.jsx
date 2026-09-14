import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getStats } from "../api/client";

/**
 * Sovereign AI Workbench Home Dashboard (SIH PS ID: 26117)
 * Air-gapped on-premises intelligence for Refineries, PSUs,
 * defence manufacturing, and government offices.
 */
export default function Home() {
  const [stats, setStats] = useState({ total_documents: 0, total_chunks: 0, deviations_found: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => {
        // /stats not implemented yet, or backend unreachable
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      {/* ── Header & Sovereign Enclave Badges ── */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            PS ID 26117 • Air-Gapped Sovereign Node
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono text-text-secondary bg-white/5 border border-white/10">
            Refineries • PSUs • Defence • Gov Enclave
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono text-accent bg-accent/10 border border-accent/20">
            100% On-Premises GPU
          </span>
        </div>

        <h2
          className="text-3xl font-semibold mb-3"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.5))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Sovereign AI Workbench
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-3xl">
          Air-gapped on-premises engineering intelligence for sensitive knowledge work.
          Process Piping &amp; Instrument Diagrams (P&amp;IDs), technical specifications, vendor negotiations,
          financials, and internal correspondence on local GPU hardware — with zero external network transmission.
        </p>
      </div>

      {/* ── Sovereign Enclave Proof of Air-Gap Panel ── */}
      <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-surface border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span className="text-text-primary text-sm font-medium">Sovereign Enclave Status</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Zero Outbound Telemetry
            </span>
          </div>
          <span className="text-text-muted text-xs font-mono">
            Host: Local GPU Server • Air-Gap Enforced
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border-soft">
            <p className="text-text-muted text-[11px] mb-1">Network Isolation</p>
            <p className="text-emerald-400 font-semibold font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Air-Gapped (0 WAN)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border-soft">
            <p className="text-text-muted text-[11px] mb-1">Model Execution</p>
            <p className="text-text-primary font-semibold font-mono">
              Local Open-Weight
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border-soft">
            <p className="text-text-muted text-[11px] mb-1">Knowledge Store</p>
            <p className="text-text-primary font-semibold font-mono">
              On-Device ChromaDB
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border-soft">
            <p className="text-text-muted text-[11px] mb-1">Execution Sandbox</p>
            <p className="text-emerald-400 font-semibold font-mono">
              Isolated Subprocess
            </p>
          </div>
        </div>
      </div>

      {/* ── Headline Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Technical Documents Ingested" value={stats.total_documents} index={0} />
        <StatCard label="Chunks in Knowledge Base" value={stats.total_chunks} index={1} />
        <StatCard label="Compliance Deviations Identified" value={stats.deviations_found} index={2} />
      </div>

      {/* ── Quick Action Shortcuts ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate("/ask")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 hover:bg-surface-2 transition-all flex items-center gap-2"
        >
          <span>💬</span>
          <span>Ask Documents (Air-Gapped RAG) →</span>
        </button>
        <button
          onClick={() => navigate("/compliance")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 hover:bg-surface-2 transition-all flex items-center gap-2"
        >
          <span>🔍</span>
          <span>Run Technical Compliance Audit →</span>
        </button>
        <button
          onClick={() => navigate("/emails")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 hover:bg-surface-2 transition-all flex items-center gap-2"
        >
          <span>✉️</span>
          <span>Internal Correspondence →</span>
        </button>
        <button
          onClick={() => navigate("/documents")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 hover:bg-surface-2 transition-all flex items-center gap-2"
        >
          <span>📁</span>
          <span>Document Vault →</span>
        </button>
      </div>
    </div>
  );
}
