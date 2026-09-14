import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ComplianceResultCard from "../components/ComplianceResultCard";
import EmptyState from "../components/EmptyState";
import { runComplianceCheck } from "../api/client";
import { useToast } from "../components/Toast";

/**
 * BACKEND NOTE: calls POST /compliance-check. See api/client.js
 * runComplianceCheck() for the expected response shape — an array of
 * { requirement, specified_value, submitted_value, status, severity }.
 * For the hackathon MVP this can just run your hardcoded UPS spec vs
 * submittal comparison from rag.py; the request body can stay empty.
 */
export default function ComplianceCheck() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const boxRef = useRef(null);
  const toast = useToast();

  useGSAP(
    () => {
      if (loading) {
        boxRef.current?.classList.add("radar-sweep");
      } else {
        boxRef.current?.classList.remove("radar-sweep");
      }
    },
    { dependencies: [loading] }
  );

  const handleRun = async () => {
    setLoading(true);
    setRan(true);
    try {
      const res = await runComplianceCheck();
      setResults(res.data.results || []);
    } catch (err) {
      toast?.show("Compliance check failed — check the backend.", "error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const deviationCount = results.filter((r) => r.status === "Deviation").length;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
      <h2 className="text-xl font-medium text-text-primary mb-6">Compliance Check</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left pane: requirement / trigger box */}
        <div
          ref={boxRef}
          className="bg-surface border border-border rounded-2xl p-6 h-fit lg:sticky lg:top-20"
        >
          <p className="text-text-secondary text-sm mb-4">
            Compares equipment specifications against vendor submittals and
            flags any deviations, with severity ranking.
          </p>
          <div className="text-xs text-text-muted mb-6 space-y-1">
            <div>Spec: UPS_System_Specification</div>
            <div>Submittal: UPS_Vendor_Submittal</div>
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-50 hover:bg-accent/90 transition-colors"
          >
            {loading ? "Checking…" : "Run Compliance Check"}
          </button>

          {ran && !loading && (
            <div className="mt-4 text-xs text-text-secondary">
              {deviationCount > 0 ? (
                <span className="text-status-fail">{deviationCount} deviation(s) found</span>
              ) : (
                <span className="text-status-match">All requirements matched</span>
              )}
            </div>
          )}
        </div>

        {/* Right pane: results */}
        <div className="space-y-3">
          {!ran && (
            <EmptyState
              icon="🛡️"
              title="No check run yet"
              description="Run a compliance check to compare spec vs. vendor submittal."
            />
          )}
          {ran && !loading && results.length === 0 && (
            <EmptyState
              icon="⚠️"
              title="No results returned"
              description="The backend responded, but no comparisons were found."
            />
          )}
          {results.map((r, i) => (
            <ComplianceResultCard key={i} result={r} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
