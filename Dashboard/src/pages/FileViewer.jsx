import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

export default function FileViewer() {
  const { documentId } = useParams();
  const [content, setContent] = useState(null);
  const [type, setType] = useState(null);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
    fetch(`${API_BASE}/documents/${documentId}/file`)
    .then((res) => res.blob())
    .then(async (blob) => {
        const ext = blob.type;
        const buffer = await blob.arrayBuffer();
        // fetch(`http://localhost:8000/documents/${documentId}/file`)

        if (ext.includes("pdf") || ext.includes("image")) {
          setType("native");
          setContent(URL.createObjectURL(blob));
        } else if (ext.includes("sheet") || ext.includes("csv") || ext.includes("excel")) {
          const wb = XLSX.read(buffer, { type: "array" });
          const html = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
          setType("html");
          setContent(html);
        } else if (ext.includes("word") || ext.includes("document")) {
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          setType("html");
          setContent(result.value);
        } else {
          setType("native");
          setContent(URL.createObjectURL(blob));
        }
      });
  }, [documentId]);

  if (!content) return <div className="p-6 text-sm">Loading…</div>;
  if (type === "native") return <iframe src={content} className="w-full h-screen" title="file" />;
  return <div className="p-6 overflow-auto" dangerouslySetInnerHTML={{ __html: content }} />;
}