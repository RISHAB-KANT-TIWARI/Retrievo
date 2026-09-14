import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getStats } from "../api/client";

/**
 * BACKEND NOTE: fetches GET /stats on mount — see api/client.js getStats()
 * for the expected response shape. If that endpoint isn't built yet,
 * this page falls back to zeros rather than crashing (see catch block).
 */
export default function Home() {
  const [stats, setStats] = useState({ total_documents: 0, total_chunks: 0, deviations_found: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => {
        // /stats not implemented yet, or backend unreachable — fail quietly,
        // cards will just count up to 0 instead of breaking the page.
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h2
          className="text-3xl font-semibold mb-2"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.5))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome back
        </h2>
        <p className="text-text-secondary text-sm">
          Here's what's happening on Ironwood Point Data Center.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Documents Ingested" value={stats.total_documents} index={0} />
        <StatCard label="Chunks in Knowledge Base" value={stats.total_chunks} index={1} />
        <StatCard label="Deviations Found" value={stats.deviations_found} index={2} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => navigate("/ask")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 transition-colors"
        >
          Ask Documents →
        </button>
        <button
          onClick={() => navigate("/compliance")}
          className="px-5 py-3 rounded-xl bg-surface border border-border text-text-primary text-sm hover:border-accent/50 transition-colors"
        >
          Run Compliance Check →
        </button>
      </div>
    </div>
  );
}
