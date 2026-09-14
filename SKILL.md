---
name: epcmind-workspace
description: Comprehensive architecture, data pipelines, API specs, and agent instructions for the EPCmind (ET AI) data centre intelligence workspace.
---

# EPCmind — Workspace Context & Skill Reference

> **Repository Root:** `c:\Users\shubh\Desktop\ET AI`  
> **Core Purpose:** AI intelligence and compliance engine for Data Centre EPC (Engineering, Procurement, Construction) project delivery.  
> **Master Reference:** See also [AGENTS.md](file:///c:/Users/shubh/Desktop/ET%20AI/AGENTS.md) for full agent operating rules.

---

## 1. Project Overview

EPCmind addresses the fragmentation of engineering information in data centre delivery. It ingests multi-format documentation, provides natural-language grounded question answering with source citations, and automatically audits equipment submittals against technical specifications to catch discrepancies before equipment is procured or installed.

**Key Capabilities:**
- **Ask Documents:** RAG Q&A grounded in project documents with source-level citations.
- **Compliance Check:** Automated comparison of vendor submittals against technical specifications with `Match`, `Deviation`, and `Cannot verify` statuses, ranked by severity (`Critical`, `Moderate`, `Low`).
- **Format-Aware Ingestion:** Extraction preserving headings, tables, and rows from `.docx`, `.pdf`, `.xlsx`, `.csv`, `.txt`, and `.md`.
- **Project Portals:** React 18 Dashboard for engineers and React 19 Landing experience for product demonstration.

---

## 2. Directory Layout & Key Modules

- **[backend/](file:///c:/Users/shubh/Desktop/ET%20AI/backend)**: Python 3.10+ FastAPI service.
  - [main.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/main.py): REST endpoints (`/ask`, `/documents`, `/upload`, `/compliance-check`, `/stats`).
  - [rag.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/rag.py): Grounded RAG logic and citation prompt assembly.
  - [compilance.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/compilance.py): Requirement-by-requirement comparison engine and JSON caching.
  - [vector_store.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/vector_store.py): ChromaDB client (`./chroma_db`) and embedding retrieval.
  - [chunker.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/chunker.py): Title-preserving, table-safe section chunking and document classification.
  - [exctractors.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/exctractors.py): Universal document extraction for Word, PDF, Excel, and Text.
  - [llm_api_provider.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/llm_api_provider.py): Local Ollama interface (`qwen2.5:3b`, `nomic-embed-text`).
  - [llm_api_provider_gemini.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/llm_api_provider_gemini.py): Cloud Gemini alternative (`gemini-2.5-flash`, `gemini-embedding-001`).
  - [ingest.py](file:///c:/Users/shubh/Desktop/ET%20AI/backend/ingest.py): Seed script to parse and index `Sample_docs/`.
  - [Sample_docs/](file:///c:/Users/shubh/Desktop/ET%20AI/backend/Sample_docs): Multi-format sample EPC dataset (`UPS_System_Specification.docx`, `UPS_Vendor_Submittal_26-33-53-01.pdf`, `UPS_Procurement_Schedule.xlsx`, `UPS_RFI_Log.xlsx`).
- **[Dashboard/](file:///c:/Users/shubh/Desktop/ET%20AI/Dashboard)**: React 18, Vite 5, Tailwind CSS v3, GSAP.
  - [src/api/client.js](file:///c:/Users/shubh/Desktop/ET%20AI/Dashboard/src/api/client.js): Single source of truth for all HTTP API calls (180s timeout).
  - [src/pages/](file:///c:/Users/shubh/Desktop/ET%20AI/Dashboard/src/pages): `Home.jsx`, `AskDocuments.jsx`, `ComplianceCheck.jsx`, `Documents.jsx`.
- **[Landing/](file:///c:/Users/shubh/Desktop/ET%20AI/Landing)**: React 19, Vite 6, Tailwind CSS v4, GSAP storytelling landing page.

---

## 3. Quick Reference Commands

### Start Backend
```bash
cd backend
.venv\Scripts\Activate.ps1    # or: source .venv/bin/activate
pip install -r requirements.txt
python ingest.py             # Index sample documents into ChromaDB
uvicorn main:app --reload --port 8000
```

### Start Dashboard
```bash
cd Dashboard
npm install
npm run dev                  # http://localhost:5173
```

### Start Landing
```bash
cd Landing
npm install
npm run dev -- --port 5174   # http://localhost:5174
```

---

## 4. Agent Best Practices & Constraints

1. **LLM Provider Switching**: Always use `ask_ai()` and `embed_text()` abstractions. If switching from Ollama (768-dim) to Gemini (3072-dim), always delete `./chroma_db` and re-run `python ingest.py`.
2. **Frontend Network Layer**: Place all HTTP API calls in `Dashboard/src/api/client.js`; do not invoke `fetch` or `axios` directly in React components.
3. **Table & Section Preservation**: Ensure `[TABLE]` tags remain intact during chunking so tabular data is never split.
4. **Citation Discipline**: Always maintain `[Source N: <doc_type> — <filename>]` formatting in RAG context.
