import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import UploadDropzone from "../components/UploadDropzone";
import DocumentBadge from "../components/DocumentBadge";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { getDocuments } from "../api/client";
import { useToast } from "../components/Toast";

/**
 * BACKEND NOTE: fetches GET /documents on mount (see api/client.js
 * getDocuments()). New uploads are prepended client-side immediately
 * (via UploadDropzone's onUploaded callback) rather than waiting on a
 * refetch, so the row animates in right away.
 */
export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const tableRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    getDocuments()
      .then((res) => setDocs(res.data.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUploaded = (result) => {
    const newDoc = {
      filename: result.filename,
      document_type: result.document_type,
      chunk_count: result.chunks_added,
      ingested_at: new Date().toISOString(),
    };
    setDocs((prev) => [newDoc, ...prev]);
    toast?.show(`${result.filename} ingested — ${result.chunks_added} chunks added`);
  };

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-medium text-text-primary mb-6">Documents</h2>

      <UploadDropzone onUploaded={handleUploaded} />

      <div ref={tableRef} className="mt-8">
        {!loading && docs.length === 0 && (
          <EmptyState
            icon="📁"
            title="No documents yet"
            description="Upload a spec, submittal, RFI log, or schedule to get started."
          />
        )}

        {docs.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border-soft">
                  <th className="pb-3 font-normal">Filename</th>
                  <th className="pb-3 font-normal">Type</th>
                  <th className="pb-3 font-normal">Chunks</th>
                  <th className="pb-3 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <DocRow key={doc.filename + i} doc={doc} onDelete={() => setDeleteTarget(doc)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        title="Remove document?"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          // BACKEND NOTE: wire this to DELETE /documents/{filename} if you
          // build that endpoint; for now this just removes it client-side.
          setDocs((prev) => prev.filter((d) => d.filename !== deleteTarget.filename));
          toast?.show(`${deleteTarget.filename} removed`);
          setDeleteTarget(null);
        }}
        confirmLabel="Remove"
      >
        This will remove <strong>{deleteTarget?.filename}</strong> and its chunks from the
        knowledge base.
      </Modal>
    </div>
  );
}

function DocRow({ doc, onDelete }) {
  const rowRef = useRef(null);

  useGSAP(
    () => {
      // New row slides down from top and fades in, pushing older rows down
      gsap.from(rowRef.current, {
        y: -12,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: rowRef }
  );

  return (
    <tr ref={rowRef} className="border-b border-border-soft/60 text-sm">
      <td className="py-3.5 text-text-primary">{doc.filename}</td>
      <td className="py-3.5">
        <DocumentBadge type={doc.document_type} />
      </td>
      <td className="py-3.5 text-text-secondary">{doc.chunk_count ?? "—"}</td>
      <td className="py-3.5 text-right">
        <button
          onClick={onDelete}
          className="text-text-muted hover:text-status-fail text-xs transition-colors"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
