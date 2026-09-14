# AGENTS.md — EPCmind Project Context & Agent Guidelines

> **Project Name:** EPCmind (ET AI)  
> **Repository Root:** `c:\Users\shubh\Desktop\ET AI`  
> **Core Purpose:** AI intelligence and compliance platform for Data Centre EPC (Engineering, Procurement, Construction) delivery.  
> **Live Demo:** [epcmind.netlify.app](https://epcmind.netlify.app/)  

---

## 1. Executive Summary & Problem Domain

In large-scale data centre EPC projects, teams must reconcile thousands of technical requirements across fragmented documentation: engineering specifications, vendor equipment submittals, Requests For Information (RFIs), procurement schedules, and commissioning logs. Discrepancies that slip through—such as a vendor supplying a UPS with a 10-minute battery runtime when the specification mandated 15 minutes—cause catastrophic rework, schedule delays, and contractual disputes on site.

**EPCmind** solves this by providing:
1. **Ask Documents (Grounded RAG):** Natural-language Q&A across the project knowledge base with verifiable source citations.
2. **Compliance Check (Automated Auditing):** Requirement-by-requirement comparison between engineering specifications and vendor submittals, classifying findings into `Match`, `Deviation`, or `Cannot verify` with severity ratings (`Critical`, `Moderate`, `Low`).
3. **Multi-Format Ingestion:** Extraction and section-aware chunking across unstructured (`.pdf`, `.docx`, `.txt`, `.md`) and structured (`.xlsx`, `.xls`, `.csv`) project documents.
4. **Interactive Interfaces:** A high-performance engineering Dashboard and an interactive product Landing page.

---

## 2. Repository Layout & Architecture

The workspace is structured into three primary application tiers plus shared assets:

```text
ET AI/ (EPCmind Root)
├── AGENTS.md                  # This master agent context & instruction manual
├── SKILL.md                   # Skill-compatible agent instruction mirror
├── README.md                  # Public documentation & architecture overview
├── assets/                    # Screenshots, architecture diagrams, and hero SVG
│   ├── epcmind-hero.svg
│   ├── dashboard-overview.png
│   └── compliance-results.png
├── backend/                   # FastAPI backend, RAG pipeline, & Compliance Engine
│   ├── Sample_docs/           # Multi-format sample EPC dataset
│   │   ├── UPS_System_Specification.docx       # Engineering spec (500 kW, 15-min battery)
│   │   ├── UPS_Vendor_Submittal_26-33-53-01.pdf# Vendor submittal (deviates with 10-min battery)
│   │   ├── UPS_Procurement_Schedule.xlsx       # Procurement & FAT milestones
│   │   └── UPS_RFI_Log.xlsx                    # RFI tracking spreadsheet
│   ├── chroma_db/             # Persistent ChromaDB vector database files
│   ├── uploaded_docs/         # Storage for documents uploaded via POST /upload
│   ├── main.py                # FastAPI endpoints, CORS, file upload handling
│   ├── rag.py                 # Grounded Q&A prompt assembly & retrieval
│   ├── compilance.py          # Specification vs. Submittal compliance engine & JSON caching
│   ├── vector_store.py        # ChromaDB client, embedding, search, document summaries
│   ├── chunker.py             # Section-aware & table-aware chunking and classification
│   ├── exctractors.py         # Multi-format parsers (PDF, DOCX, XLSX, CSV, TXT)
│   ├── llm_api_provider.py    # Active LLM provider (Ollama local inference)
│   ├── llm_api_provider_gemini.py # Alternate LLM provider (Google Gemini API)
│   ├── ingest.py              # Ingestion script to populate ChromaDB from Sample_docs
│   ├── last_compliance_check.json # Cached results from the last compliance check run
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Container configuration for backend deployment
│   └── .env                   # Environment variables (Ollama models / Gemini API key)
├── Dashboard/                 # React 18 single-page application (Engineer's Portal)
│   ├── index.html
│   ├── vite.config.js         # Vite configuration (port 5173)
│   ├── tailwind.config.js     # Custom design system (canvas, surface, borders, status colors)
│   ├── package.json           # React 18, Vite 5, Tailwind 3, GSAP 3.12, Axios
│   └── src/
│       ├── App.jsx            # Router, persistent chat state, GSAP page transitions
│       ├── main.jsx           # Application entrypoint
│       ├── index.css          # Global styles, scrollbar styling, radar-sweep animations
│       ├── api/
│       │   └── client.js      # Centralized Axios API client (180s timeout, all endpoints)
│       ├── pages/
│       │   ├── Home.jsx             # Dashboard overview with metrics & quick actions
│       │   ├── AskDocuments.jsx     # RAG Q&A interface with doc type filter & citations
│       │   ├── ComplianceCheck.jsx  # Audit engine interface, run trigger, severity badges
│       │   └── Documents.jsx        # Document inventory and drag-and-drop file upload
│       └── components/
│           ├── Sidebar.jsx          # Collapsible responsive navigation rail
│           ├── NavBar/Navbar.jsx    # Top navigation bar with breadcrumb & mobile toggle
│           ├── ColdStartBanner.jsx  # Dismissible Render free-tier cold-start warning
│           ├── ComplianceResultCard.jsx # Requirement comparison card (match/deviation)
│           ├── ChatMessage.jsx      # Message bubble with citation chips
│           ├── ThinkingSkeleton.jsx # Shimmer loading animation for AI responses
│           ├── EmptyState.jsx       # Placeholder states with sample prompts
│           └── Toast.jsx            # Toast notifications provider
└── Landing/                   # React 19 product story & animated landing experience
    ├── index.html
    ├── vite.config.js         # Vite configuration (runs on port 5174)
    ├── tailwind.config.js     # Tailwind v4 configuration
    ├── package.json           # React 19, Vite 6, Tailwind 4, GSAP 3.12, React Router 7
    └── src/
        ├── App.jsx            # Single-page narrative story
        └── components/        # AuroraField, Hero, TrustedBy, HowItWorks, InteractiveDemo,
                               # Features, UseCases, Workflow, Story, FinalCTA, Navbar
```

---

## 3. Technology Stack & Specifications

| Layer | Primary Technologies | Key Libraries & Versions |
|---|---|---|
| **Backend API** | Python 3.10+, FastAPI | `fastapi==0.139.2`, `uvicorn==0.51.0`, `pydantic==2.13.4`, `python-multipart==0.0.32` |
| **Vector Database** | ChromaDB (Persistent) | `chromadb==1.5.9` (collection: `epc_documents`, default path: `./chroma_db`) |
| **Document Parsers** | Python libraries | `python-docx==1.2.0`, `pypdf==6.14.2`, `pandas==3.0.3` |
| **Active LLM (Local)** | Ollama | Chat: `qwen2.5:3b`, Embeddings: `nomic-embed-text` (768 dimensions) |
| **Alternate LLM (Cloud)** | Google Gemini | Chat: `gemini-2.5-flash`, Embeddings: `gemini-embedding-001` (3072 dimensions) |
| **Dashboard UI** | React 18, Vite 5 | Tailwind CSS v3, GSAP 3.12, `@gsap/react`, Axios 1.18, React Router v6 |
| **Landing UI** | React 19, Vite 6 | Tailwind CSS v4, GSAP 3.12, React Router v7 |

---

## 4. Deep Dive: Backend Pipeline & Logic

### 4.1 Document Extraction (`backend/exctractors.py`)
- **DOCX (`extract_docx`)**: Iterates body elements via `iter_block_items` preserving both paragraphs and tables. Table rows are converted to pipe-delimited text bounded by `[TABLE]` and `[/TABLE]` tags.
- **PDF (`extract_pdf`)**: Extracts page by page using `pypdf.PdfReader` with `[PAGE N]` annotations.
- **Excel/CSV (`extract_excel`)**: Reads sheets via Pandas, dynamically locates the true header row (first row with >= 60% non-null cells), strips unnamed columns, and outputs clean dictionary records for every valid row.
- **Universal Entrypoint (`extract_file`)**: Automatically dispatches based on extension (`.docx`, `.pdf`, `.txt`, `.md`, `.xlsx`, `.xls`, `.csv`) and tags content as `structured` or `unstructured`.

### 4.2 Document Chunking & Classification (`backend/chunker.py`)
- **Document Header Preservation (`extract_doc_header`)**: Extracts the initial title block lines (e.g. project name, spec number) before numbered sections begin (`r'^\d+\.\d+\s+[A-Z]'`) and prepends this identity to every chunk so context is never lost.
- **Unstructured Splitting (`chunk_unstructured`)**: Splits on section headers (`r'\n(?=\d+\.\d+\s+[A-Z])'`). Strictly guards `[TABLE]` blocks from being split across chunks. Sub-splits long paragraphs up to `max_chunk_chars=1200`.
- **Structured Splitting (`chunk_structured`)**: Converts each row of an Excel/CSV spreadsheet into an independent labeled chunk containing document type, project name, and key-value attributes.
- **Document Classifier (`classify_doc_type`)**: Maps file names to domain labels: `Specification`, `Vendor Submittal`, `RFI`, `Procurement Schedule`, or `Commissioning Record`.

### 4.3 LLM Provider Architecture (`llm_api_provider.py`)
The system isolates all AI completions and vector embeddings behind two functions:
```python
def ask_ai(prompt: str) -> str: ...
def embed_text(text: str) -> list[float]: ...
```
- **Active Setup (Ollama Local)**: Uses `http://localhost:11434/api/generate` with `qwen2.5:3b` and `/api/embed` with `nomic-embed-text` (768 dimensions).
- **Gemini Setup (`llm_api_provider_gemini.py`)**: Uses Google GenAI SDK with `gemini-2.5-flash` and `gemini-embedding-001` (3072 dimensions).
- **CRITICAL RULE**: When switching between Ollama and Gemini, the vector dimensions change from 768 to 3072. You **MUST** clear the `./chroma_db` folder and re-run `python ingest.py` whenever the embedding provider is switched.

### 4.4 Vector Store Operations (`backend/vector_store.py`)
- Manages ChromaDB persistent client at `./chroma_db` with collection `epc_documents`.
- `add_chunks(chunks)`: Computes embeddings via `embed_text()` and stores text, embeddings, IDs, and metadata (`filename`, `filetype`, `doc_type`, `document_type`).
- `search(query, n_results=5, filter_document_type=None)`: Performs cosine/L2 search, optionally filtered by `document_type`.
- `list_documents()`: Aggregates stored chunks by filename to report document names, types, and chunk counts without pulling vector arrays.
- `get_stats()`: Computes total document and chunk counts.

### 4.5 Grounded RAG Engine (`backend/rag.py`)
- Gathers top matching chunks via `search()`.
- Labeled source blocks formatted as `[Source N: <doc_type> — <filename>]\n<chunk_text>`.
- Strictly instructs the LLM: *"Answer using ONLY the context below. If the answer isn't in the context, say so clearly. Cite which source(s) you used by number."*

### 4.6 Compliance Check Engine (`backend/compilance.py`)
- Reads the base specification (`Sample_docs/UPS_System_Specification.docx`) and vendor submittal (`Sample_docs/UPS_Vendor_Submittal_26-33-53-01.pdf`).
- Evaluates technical requirements (autonomy, capacity, efficiency, topology, warranty, etc.).
- Enforces strict JSON output schema:
  - `requirement`: Name of the compared item.
  - `specified_value`: Stated requirement or `"Not stated"`.
  - `submitted_value`: Stated submittal or `"Not stated"`.
  - `status`: `"Match"` | `"Deviation"` | `"Cannot verify"`. (If either value is `"Not stated"`, status MUST be `"Cannot verify"`).
  - `severity`: `"Critical"` | `"Moderate"` | `"Low"` if status is `"Deviation"`, else `null`.
- Caches results to `backend/last_compliance_check.json` with an ISO timestamp so the frontend does not re-trigger costly LLM calls upon navigation or page reload.

### 4.7 REST API Endpoints (`backend/main.py`)
| Method | Endpoint | Request Payload / Params | Response Structure | Purpose |
|---|---|---|---|---|
| `GET` | `/` | None | `{"status": "ok"}` | Health check |
| `POST` | `/ask` | `{"question": str, "document_type": str \| null}` | `{"answer": str, "sources": [...]}` | Grounded Q&A with source citations |
| `GET` | `/documents` | None | `{"documents": [...]}` | Inventory of ingested documents |
| `POST` | `/upload` | Multipart `file: UploadFile` | `{"filename", "document_type", "chunks_added", "status"}` | Save, parse, chunk, and index file |
| `POST` | `/compliance-check` | None (or optional payload) | `{"results": [...], "ran_at": str}` | Run comparison engine and persist output |
| `GET` | `/compliance-check` | None | `{"results": [...], "ran_at": str}` | Read cached comparison findings |
| `GET` | `/stats` | None | `{"total_documents", "total_chunks", "deviations_found"}` | Dashboard metric card statistics |

---

## 5. Deep Dive: Frontend Architecture

### 5.1 Centralized API Client (`Dashboard/src/api/client.js`)
- All backend communication is centralized in `client.js`. Components never use `fetch()` or `axios` directly.
- Base URL configured via `import.meta.env.VITE_API_BASE` (defaults to `http://localhost:8000`).
- Configured with a `180000ms` (3-minute) timeout to accommodate local LLM inference latencies.

### 5.2 Dashboard Pages & Routing
- **Layout & Chat State (`App.jsx`)**: The chat state (`chatMessages`, `chatInput`, `chatDocType`) is elevated to `Layout` so conversations remain intact when engineers navigate between tabs. GSAP provides a 150ms crossfade on route changes.
- **Home (`pages/Home.jsx`)**: Displays three headline metric cards (`Total Documents`, `Vector Chunks`, `Open Deviations`), recent audit findings, and shortcuts to `/ask` and `/compliance`.
- **Ask Documents (`pages/AskDocuments.jsx`)**: Interactive chat interface with document type dropdown filtering (`All`, `Specification`, `Vendor Submittal`, `RFI`, `Procurement Schedule`), source citation pills, and keyboard shortcuts (`Enter` sends, `Shift+Enter` new line).
- **Compliance Check (`pages/ComplianceCheck.jsx`)**: Left panel displays audit scope and run button with animated radar-sweep (`radar-sweep` CSS class). Right panel displays requirement cards categorized by status and severity, with quick filters.
- **Documents (`pages/Documents.jsx`)**: Lists all documents with chunk counts and types; includes a file upload dropzone with real-time percentage progress bar.
- **ColdStartBanner (`components/ColdStartBanner.jsx`)**: Automatically warns users on free-tier hosted deployments about backend cold-start delays.

### 5.3 Landing Page (`Landing/`)
- A visually immersive single-page application built with React 19, Tailwind v4, and GSAP.
- Highlights the 90-second demo storyline: 15-minute specified UPS autonomy vs. 10-minute vendor submittal.
- Runs independently on port 5174.

---

## 6. How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Ollama running locally with models `qwen2.5:3b` and `nomic-embed-text`, OR a Google Gemini API Key.

### 1. Start Ollama (If using local LLM)
```bash
ollama run qwen2.5:3b
ollama pull nomic-embed-text
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Populate vector database with sample documents:
python ingest.py

# Start FastAPI server:
uvicorn main:app --reload --port 8000
```
Interactive Swagger docs will be available at `http://localhost:8000/docs`.

### 3. Dashboard Setup
In a new terminal:
```bash
cd Dashboard
npm install
npm run dev
```
The Dashboard will be running at `http://localhost:5173`.

### 4. Landing Page Setup (Optional)
In a third terminal:
```bash
cd Landing
npm install
npm run dev -- --port 5174
```
The Landing page will be running at `http://localhost:5174`.

---

## 7. Canonical Demo Walkthrough (90-Second Path)

1. **Dashboard:** Open `http://localhost:5173/` and observe the summary metric cards reflecting indexed sample files (4 documents, ~42 chunks, 11 deviations).
2. **Ask Documents:** Navigate to `/ask`, filter by `Specification`, and ask:
   > *"What battery-backup autonomy does the UPS specification require?"*
3. **Verify Grounding:** Confirm the answer specifies 15 minutes minimum at 500 kW full rated load, citing `[Source 1: Specification — UPS_System_Specification.docx]`.
4. **Compliance Check:** Navigate to `/compliance` and inspect the audit report. Locate the critical deviation:
   - **Requirement:** Battery Backup / Autonomy
   - **Specified Value:** 15 minutes minimum at full rated load (500 kW)
   - **Submitted Value:** 10 minutes at full rated load (500 kW)
   - **Status:** Deviation
   - **Severity:** Critical

---

## 8. Agent Working Rules & Guidelines

When modifying or extending this codebase, adhere strictly to these principles:

1. **Preserve the LLM Abstraction Barrier:**
   - Always call `ask_ai()` and `embed_text()` from `llm_api_provider.py`.
   - Never import Ollama or Gemini libraries directly into `rag.py`, `compilance.py`, `main.py`, or `vector_store.py`.
2. **Embedding Dimension Discipline:**
   - `nomic-embed-text` produces **768-dimensional** vectors.
   - `gemini-embedding-001` produces **3072-dimensional** vectors.
   - Do NOT mix embeddings in ChromaDB. If switching providers, delete the `chroma_db/` folder and re-run `python ingest.py`.
3. **Preserve Grounding & Strict Citations:**
   - Any modifications to `rag.py` must maintain strict source citation behavior (`[Source N: ...]`). The model must never hallucinate answers not present in retrieved chunks.
4. **Maintain the Frontend API Contract:**
   - Every API call in `Dashboard/` must reside in `Dashboard/src/api/client.js`.
   - Do not invoke Axios or Fetch directly within React components.
   - Keep the `180000ms` timeout to support local LLM generation.
5. **Defensive Parsing for LLM Outputs:**
   - LLMs frequently wrap JSON responses in markdown code fences (````json ... ````). Always use defensive stripping as demonstrated in `compilance.py` before executing `json.loads()`.
6. **Preserve Section and Table Integrity:**
   - When modifying `chunker.py` or `exctractors.py`, ensure `[TABLE]` blocks are never fragmented across separate chunks.
