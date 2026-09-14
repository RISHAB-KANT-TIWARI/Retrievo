import { useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { uploadDocument } from "../api/client";

/**
 * Drag-and-drop upload zone. Calls POST /upload (see api/client.js
 * uploadDocument() for the exact request/response contract your
 * FastAPI endpoint needs to satisfy).
 *
 * `onUploaded(result)` fires after a successful upload — the parent
 * (Documents.jsx) uses this to prepend the new row to its list without
 * a full refetch.
 */
export default function UploadDropzone({ onUploaded }) {
  const zoneRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // null = idle
  const [error, setError] = useState(null);

  useGSAP(
    () => {
      gsap.to(zoneRef.current, {
        scale: dragging ? 1.02 : 1,
        duration: 0.25,
        ease: "power2.out",
      });
    },
    { dependencies: [dragging] }
  );

  const handleFile = useCallback(
    async (file) => {
      setError(null);
      setProgress(0);
      try {
        const res = await uploadDocument(file, setProgress);
        if (res.data.status === "error") {
          throw new Error(res.data.message || "Upload failed");
        }
        onUploaded?.(res.data);
      } catch (err) {
        setError(err.message || "Upload failed");
        if (zoneRef.current) {
          zoneRef.current.classList.add("error-shake");
          setTimeout(() => zoneRef.current?.classList.remove("error-shake"), 400);
        }
      } finally {
        setProgress(null);
      }
    },
    [onUploaded]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      ref={zoneRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors"
      style={{
        borderColor: dragging ? "rgba(79,70,229,0.6)" : "rgba(255,255,255,0.12)",
        background: "#141414",
        boxShadow: dragging ? "0 0 40px rgba(79,70,229,0.25)" : "none",
      }}
      onClick={() => document.getElementById("doc-upload-input").click()}
    >
      <input
        id="doc-upload-input"
        type="file"
        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
        className="hidden"
        onChange={onSelect}
      />

      {progress === null ? (
        <>
          <p className="text-text-primary text-sm font-medium">
            Drag & drop a document, or click to browse
          </p>
          <p className="text-text-muted text-xs mt-1">
            PDF, DOCX, XLSX, CSV, TXT supported
          </p>
        </>
      ) : (
        <div className="max-w-xs mx-auto">
          <p className="text-text-secondary text-xs mb-2">Processing… {progress}%</p>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent relative transition-[width] duration-200"
              style={{ width: `${progress}%`, boxShadow: "0 0 8px 1px rgba(79,70,229,0.8)" }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-status-fail text-xs mt-3">{error}</p>}
    </div>
  );
}
