import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import UploadDropzone from "../components/UploadDropzone";
import DocumentBadge from "../components/DocumentBadge";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { getDocuments, deleteDocument, agentDeleteConfirmed, getDocumentContent } from "../api/client";
import { useToast } from "../components/Toast";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewContent, setViewContent] = useState("");

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const openDoc = (doc) => {
    window.open(`/view/${doc.document_id}`, "_blank", "width=900,height=950");
  };
  // const openDoc = async (doc) => {
  //   setViewDoc(doc);
  //   setViewContent("Loading…");
  //   try {
  //     const res = await getDocumentContent(doc.document_id);
  //     setViewContent(res.data.text);
  //   } catch { setViewContent("Couldn't load this document."); }
  // };
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
      document_id: result.document_id,
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
      <div className="mb-6">
        <h2 className="text-xl font-medium text-text-primary">Document Vault</h2>
        <p className="text-xs text-text-muted mt-0.5">Air-gapped on-premises repository for P&amp;IDs, technical specifications, and vendor submittals</p>
      </div>

      <UploadDropzone onUploaded={handleUploaded} />
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between mt-4 px-3 py-2 bg-surface border border-border rounded-xl">
          <span className="text-xs text-text-secondary">{selectedIds.size} selected</span>
          <button onClick={() => setBulkConfirm(true)} className="text-xs text-status-fail">Delete selected</button>
          </div>
        )}

      <div ref={tableRef} className="mt-8">
        {!loading && docs.length === 0 && (
          <EmptyState
            icon="📁"
            title="No documents yet"
            description="Upload engineering specifications, vendor submittals, P&IDs, inspection reports, or SOPs."
          />
        )}

        {docs.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-soft">
                <th className="pb-3 font-normal"></th>
                <th className="pb-3 font-normal">Filename</th>
                <th className="pb-3 font-normal">Type</th>
                <th className="pb-3 font-normal">Chunks</th>
                <th className="pb-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <DocRow
                key={doc.document_id}
                doc={doc}
                onDelete={() => setDeleteTarget(doc)}
                selected={selectedIds.has(doc.document_id)}
                onToggleSelect={toggleSelect}
                onOpen={openDoc}
                />
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
        onConfirm={async () => {
          try {
            await deleteDocument(deleteTarget.document_id);
            setDocs((prev) => prev.filter((d) => d.document_id !== deleteTarget.document_id));
            toast?.show(`${deleteTarget.filename} removed`);
          } catch (err) {
            toast?.show("Failed to remove document", "error");
          } finally {
            setDeleteTarget(null);
          }
        }}
        confirmLabel="Remove"
      >
        This will remove <strong>{deleteTarget?.filename}</strong> and its chunks from the
        knowledge base.
      </Modal>
      <Modal
  open={bulkConfirm}
  title="Remove selected documents?"
  onClose={() => setBulkConfirm(false)}
  confirmLabel="Remove"
  onConfirm={async () => {
    const ids = [...selectedIds];
    try {
      await agentDeleteConfirmed(ids);
      setDocs((prev) => prev.filter((d) => !selectedIds.has(d.document_id)));
      toast?.show(`${ids.length} document(s) removed`);
    } catch { toast?.show("Failed to remove documents", "error"); }
    finally { setSelectedIds(new Set()); setBulkConfirm(false); }
  }}
>
  Removing {selectedIds.size} document(s):
  <ul className="mt-2 text-xs list-disc pl-4">
    {docs.filter((d) => selectedIds.has(d.document_id)).map((d) => <li key={d.document_id}>{d.filename}</li>)}
  </ul>
</Modal>

<Modal open={!!viewDoc} title={viewDoc?.filename} onClose={() => setViewDoc(null)} confirmLabel="Close" onConfirm={() => setViewDoc(null)}>
  <pre className="whitespace-pre-wrap text-xs max-h-[60vh] overflow-y-auto">{viewContent}</pre>
</Modal>
    </div>
  );
}

function DocRow({ doc, onDelete, selected, onToggleSelect, onOpen }) {
  const rowRef = useRef(null);

  useGSAP(
    () => {
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
      <td className="py-3.5"><input type="checkbox" checked={selected} onChange={() => onToggleSelect(doc.document_id)} /></td>
      <td className="py-3.5 text-text-primary cursor-pointer hover:underline" onClick={() => onOpen(doc)}>{doc.filename}</td>
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