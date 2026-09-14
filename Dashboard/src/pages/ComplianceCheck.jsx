import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ComplianceResultCard from "../components/ComplianceResultCard";
import EmptyState from "../components/EmptyState";
import { runComplianceCheck, getLastComplianceCheck, getDocuments } from "../api/client";
import { useToast } from "../components/Toast";

export default function ComplianceCheck() {
  const [results, setResults] = useState([]);
  const [ranAt, setRanAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState([]);
  const boxRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    getLastComplianceCheck()
      .then((res) => {
        setResults(res.data.results || []);
        setRanAt(res.data.ran_at || null);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));

    getDocuments()
      .then((res) => setDocuments(res.data.documents || []))
      .catch(() => {});
  }, []);

  useGSAP(
    () => {
      if (loading) boxRef.current?.classList.add("radar-sweep");
      else boxRef.current?.classList.remove("radar-sweep");
    },
    { dependencies: [loading] }
  );

  const toggleSelect = (documentId) => {
    setSelected((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleRun = async () => {
    // Drop any selected id that no longer exists (e.g. deleted in another tab)
    const validSelected = selected.filter((id) =>
      documents.some((doc) => doc.document_id === id)
    );

    if (validSelected.length < 2) {
      toast?.show("Select at least 2 documents to compare.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await runComplianceCheck(validSelected);
      setResults(res.data.results || []);
      setRanAt(res.data.ran_at || null);
    } catch (err) {
      const message =
        err.response?.data?.detail || "Compliance check failed — check the backend.";
      toast?.show(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const deviationCount = results.filter((r) => r.status === "Deviation").length;
  const hasRun = ranAt !== null;

  const formattedTime = ranAt
    ? new Date(ranAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-text-primary">Technical Compliance Audit</h2>
        <p className="text-xs text-text-muted mt-0.5">Automated specification vs. vendor submittal auditing on local GPU hardware</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div
          ref={boxRef}
          className="bg-surface border border-border rounded-2xl p-6 h-fit lg:sticky lg:top-20"
        >
          <p className="text-text-secondary text-sm mb-4">
            Select two or more documents to compare — technical specifications against
            vendor submittals, equipment data, or procurement schedules.
          </p>

          <div className="text-xs text-text-muted mb-4 space-y-2 max-h-64 overflow-y-auto">
            {documents.length === 0 && (
              <div className="text-text-muted">No documents uploaded yet.</div>
            )}
            {documents.map((doc) => (
              <label
                key={doc.document_id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(doc.document_id)}
                  onChange={() => toggleSelect(doc.document_id)}
                />
                <span className="truncate">
                  {doc.filename}{" "}
                  <span className="text-text-muted">({doc.document_type})</span>
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleRun}
            disabled={loading || selected.length < 2}
            className="w-full py-2.5 rounded-xl bg-accent text-white text-sm disabled:opacity-50 hover:bg-accent/90 transition-colors"
          >
            {loading ? "Auditing…" : hasRun ? "Re-run Compliance Audit" : "Run Compliance Audit"}
          </button>

          {hasRun && !loading && (
            <div className="mt-4 space-y-1">
              <div className="text-xs text-text-muted">Last run: {formattedTime}</div>
              <div className="text-xs">
                {deviationCount > 0 ? (
                  <span className="text-status-fail">{deviationCount} deviation(s) found</span>
                ) : (
                  <span className="text-status-match">All requirements matched</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {initialLoading && (
            <EmptyState icon="⏳" title="Loading last result…" />
          )}
          {!initialLoading && !hasRun && (
            <EmptyState
              icon="🛡️"
              title="No audit executed yet"
              description="Select documents and run a technical compliance audit."
            />
          )}
          {!initialLoading && hasRun && results.length === 0 && (
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