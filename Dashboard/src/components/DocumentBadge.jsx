/**
 * Small colored tag for a document type. Reused in AskDocuments (citations),
 * Documents (table rows), and ComplianceCheck (evidence blocks) so the same
 * document type always reads the same color everywhere in the app.
 *
 * `type` should match whatever string your FastAPI backend returns for
 * chunk["document_type"] (see chunker.py's classify_doc_type()):
 * "Specification" | "Vendor Submittal" | "RFI" | "Procurement Schedule" |
 * "Commissioning Record" | "Unknown"
 */
const COLORS = {
  Specification: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Vendor Submittal": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  RFI: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Procurement Schedule": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Commissioning Record": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Unknown: "bg-white/10 text-text-secondary border-white/10",
};

export default function DocumentBadge({ type, className = "" }) {
  const colorClasses = COLORS[type] || COLORS.Unknown;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
    >
      {type || "Unknown"}
    </span>
  );
}
