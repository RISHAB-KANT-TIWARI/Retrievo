import axios from "axios";

/**
 * =============================================================
 * BACKEND DEVELOPER: READ THIS FILE FIRST
 * =============================================================
 * This is the ONLY file in the entire frontend that makes HTTP
 * calls to FastAPI. Every component below imports functions from
 * here — none of them use axios/fetch directly. Same principle
 * as your llm_client.py: one place to change if the API shape
 * changes, nothing else in the app needs to know.
 *
 * Update API_BASE to match wherever uvicorn is running.
 * CORS: your FastAPI app needs to allow this origin (see the
 * CORSMiddleware snippet you already have from earlier).
 * =============================================================
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // embedding + LLM calls can take a few seconds — don't set this too low
});

/**
 * ---- 1. ASK DOCUMENTS (RAG Q&A) ----
 * Expected FastAPI endpoint: POST /ask
 * Request body:  { question: string, document_type?: string | null }
 * Response body: { answer: string, sources?: [{ filename, document_type, text, distance }] }
 *
 * `sources` is optional but strongly recommended — the frontend
 * renders them as pill-shaped citation chips under each AI message.
 * If your /ask endpoint currently only returns { answer }, consider
 * also returning the raw `chunks` you retrieved in rag.py's
 * ask_with_rag() so the UI can show real citations instead of just text.
 */
export const askQuestion = (question, documentType = null) =>
  client.post("/ask", { question, document_type: documentType });

/**
 * ---- 2. COMPLIANCE CHECK ----
 * Expected FastAPI endpoint: POST /compliance-check
 * Request body:  { spec_document?: string, submittal_document?: string }
 *                (optional — omit to run your default hardcoded UPS check)
 * Response body: {
 *   results: [
 *     {
 *       requirement: string,
 *       specified_value: string,
 *       submitted_value: string,
 *       status: "Match" | "Deviation" | "Cannot verify",
 *       severity: "Critical" | "Moderate" | "Low" | null
 *     }, ...
 *   ]
 * }
 *
 * The frontend expects `status` to be exactly one of the three
 * strings above (case-sensitive) since it maps directly to the
 * green/amber/red status dots.
 */
export const runComplianceCheck = (payload = {}) =>
  client.post("/compliance-check", payload);

/**
 * ---- 3. DOCUMENT UPLOAD ----
 * Expected FastAPI endpoint: POST /upload  (multipart/form-data)
 * Response body: { filename, document_type, chunks_added, status }
 * On unsupported file type, return { status: "error", message: "..." }
 * with a 200 (the frontend checks `status`, not just HTTP code —
 * simplest for a hackathon; a 4xx is also fine if you prefer, just
 * make sure the catch block below still surfaces `message`).
 */
export const uploadDocument = (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return client.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
};

/**
 * ---- 4. LIST DOCUMENTS ----
 * Expected FastAPI endpoint: GET /documents
 * Response body: {
 *   documents: [
 *     { filename, document_type, chunk_count, ingested_at }, ...
 *   ]
 * }
 * Easiest way to build this on your side: query ChromaDB's
 * collection.get() and group metadata by filename, or just keep
 * a simple list in a small JSON/SQLite table as you ingest.
 */
export const getDocuments = () => client.get("/documents");

/**
 * ---- 5. DASHBOARD STATS (Home page) ----
 * Expected FastAPI endpoint: GET /stats
 * Response body: {
 *   total_documents: number,
 *   total_chunks: number,
 *   deviations_found: number   // from the last compliance check run, or cumulative
 * }
 * Cheapest implementation: total_chunks = collection.count() in
 * ChromaDB, total_documents = distinct filenames in metadata,
 * deviations_found = count of "Deviation" status from your last
 * compliance-check result (store it somewhere, even a JSON file).
 * Don't over-engineer this — a hardcoded/estimated number for the
 * demo is fine if you're short on time.
 */
export const getStats = () => client.get("/stats");

export default client;
