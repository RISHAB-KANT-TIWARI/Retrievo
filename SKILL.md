---
name: epcmind-workspace
description: Comprehensive architecture, data pipelines, API specs, and agent instructions for the EPCmind data centre intelligence workspace.
---

# EPCmind — Workspace Context & Skill Reference

> **Repository Root:** `c:\Users\shubh\Desktop\SIH pro\EPCmind`  
> **Core Purpose:** AI intelligence and compliance engine for Data Centre EPC (Engineering, Procurement, Construction) project delivery.  
> **Master Reference:** See also [AGENTS.md](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/AGENTS.md) for full agent operating rules.

---

## 1. Project Overview

EPCmind resolves engineering information fragmentation across data centre EPC delivery. It ingests multi-format project documentation and site correspondence, provides natural-language grounded question answering with verified source citations, and automatically audits equipment submittals against technical specifications to catch discrepancies before procurement or installation.

**Key Capabilities:**
- **Ask Documents (Grounded RAG):** Natural-language Q&A across project documents with source-level citations and semantic distance thresholding (`MAX_DISTANCE = 1.5`).
- **Compliance Check:** Automated comparison of vendor submittals against technical specifications with `Match`, `Deviation`, and `Cannot verify` statuses, ranked by severity (`Critical`, `Moderate`, `Low`).
- **Automated Email Sync & On-Demand Ingestion:** IMAP integration for Gmail fetching inbox correspondence into persistent storage, sandboxing attachments, and indexing selected emails into ChromaDB as `"Email"` documents.
- **Format-Aware Ingestion & Sandboxing:** Extraction preserving headings, tables, and rows from `.docx`, `.pdf`, `.xlsx`, `.csv`, `.txt`, and `.md` with magic-byte and zip-bomb validation.
- **Persistent State Portals:** React 18 Dashboard with elevated chat state that survives route navigation, alongside a React 19 Landing experience.

---

## 2. Directory Layout & Key Modules

- **[backend/](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend)**: Python 3.10+ FastAPI service.
  - [main.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/main.py): REST endpoints (`/ask`, `/documents`, `/upload`, `/compliance-check`, `/stats`, `/emails`, `/email/sync`, `/email/ingest/{uid}`, `/email/status`) and background email poller.
  - [rag.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/rag.py): Grounded RAG prompt assembly with semantic distance filtering (`MAX_DISTANCE = 1.5`).
  - [compilance.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/compilance.py): Specification vs. Submittal compliance audit engine and JSON caching.
  - [email_ingest.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/email_ingest.py): Gmail IMAP fetching, email store management (`email_store.json`), and sandboxed attachment ingestion.
  - [sandbox_check.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/sandbox_check.py): Isolated security validation (magic-byte signature validation and zip-bomb guards).
  - [vector_store.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/vector_store.py): ChromaDB client (`./chroma_db`), embedding indexing, metadata tracking, and vector search.
  - [chunker.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/chunker.py): Title-preserving, table-safe section chunking and document classification (including `Email`).
  - [exctractors.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/exctractors.py): Universal document extraction for Word, PDF, Excel, and plain text.
  - [llm_api_provider.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/llm_api_provider.py): Dual-mode LLM router (Colab/ngrok Qwen or local Ollama `qwen2.5:3b`) and local `all-MiniLM-L6-v2` embeddings with CUDA auto-detection.
  - [ingest.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/ingest.py): Seed script to index `Sample_docs/`.
  - [Sample_docs/](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/Sample_docs): Multi-format sample EPC dataset (`UPS_System_Specification.docx`, `UPS_Vendor_Submittal_26-33-53-01.pdf`, `UPS_Procurement_Schedule.xlsx`, `UPS_RFI_Log.xlsx`).
- **[Dashboard/](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard)**: React 18, Vite 5, Tailwind CSS v3, GSAP.
  - [src/api/client.js](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/api/client.js): Centralized API client for all endpoints (180s timeout).
  - [src/App.jsx](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/App.jsx): Main layout with lifted persistent chat state (`chatMessages`, `chatDocType`).
  - [src/pages/](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/pages): `Home.jsx`, `AskDocuments.jsx`, `ComplianceCheck.jsx`, `Documents.jsx`, `Emails.jsx`.
- **[Landing/](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Landing)**: React 19, Vite 6, Tailwind CSS v4, GSAP storytelling landing page.

---

## 3. Quick Reference Commands

### Start Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python ingest.py             # Index sample documents into ChromaDB
uvicorn main:app --reload --port 8000
```

### Start Dashboard
```powershell
cd Dashboard
npm install
npm run dev                  # http://localhost:5173
```

### Start Landing
```powershell
cd Landing
npm install
npm run dev -- --port 5174   # http://localhost:5174
```

---

## 4. Agent Best Practices & Constraints

1. **LLM Provider Routing**: Always use `ask_ai()` and `embed_text()` abstractions from [llm_api_provider.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/llm_api_provider.py).
   - If `QWEN_API_URL` is set in `.env` → routes to Google Colab / ngrok Qwen endpoint.
   - If `QWEN_API_URL` is commented out → routes to local Ollama (`qwen2.5:3b`).
   - Embeddings run locally via `SentenceTransformer("all-MiniLM-L6-v2")` (384 dimensions) using GPU when available.
2. **Email Ingestion Discipline**: Emails are synced automatically to `email_store.json` but must NOT be automatically added to ChromaDB without user consent. Ingestion is triggered per-email via `POST /email/ingest/{uid}`.
3. **Security Pipeline**: All document uploads and email attachments must pass through [sandbox_check.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/sandbox_check.py) before extraction and vector storage.
4. **Grounded Citations & Distance Thresholding**: Keep `MAX_DISTANCE = 1.5` in [rag.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/rag.py) and [main.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/main.py). If no chunks fall within the threshold, return `"No relevant information found in the documents."` rather than hallucinating.
5. **Frontend API Layer**: All HTTP calls must remain in [Dashboard/src/api/client.js](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/api/client.js); never use raw `fetch` or `axios` in component files.
6. **Chat State Persistence**: Retain lifted state in [App.jsx](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/App.jsx) so switching tabs does not reset user conversation history.
