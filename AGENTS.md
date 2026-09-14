# AGENTS.md — EPCmind Project Context & Agent Guidelines

> **Project Name:** EPCmind  
> **Repository Root:** `c:\Users\shubh\Desktop\SIH pro\EPCmind`  
> **Core Purpose:** AI intelligence and compliance platform for Data Centre EPC (Engineering, Procurement, Construction) delivery.  
> **Live Demo:** [epcmind.netlify.app](https://epcmind.netlify.app/)  

---

## 1. Executive Summary & Problem Domain

In large-scale data centre EPC projects, teams must reconcile thousands of technical requirements across fragmented documentation: engineering specifications, vendor equipment submittals, Requests For Information (RFIs), procurement schedules, commissioning logs, and ongoing site correspondence. Discrepancies that slip through—such as a vendor supplying a UPS with a 10-minute battery runtime when the specification mandated 15 minutes—cause catastrophic rework, schedule delays, and contractual disputes on site.

**EPCmind** solves this by providing:
1. **Ask Documents (Grounded RAG):** Natural-language Q&A across the project knowledge base with verifiable source citations and strict semantic distance thresholding (`MAX_DISTANCE = 1.5`).
2. **Compliance Check (Automated Auditing):** Requirement-by-requirement comparison between engineering specifications and vendor submittals, classifying findings into `Match`, `Deviation`, or `Cannot verify` with severity ratings (`Critical`, `Moderate`, `Low`).
3. **Automated Email Sync & Sandboxed Ingestion:** IMAP synchronization with Gmail to monitor site correspondence, saving emails to local persistent storage while providing on-demand sandboxed ingestion into the vector store.
4. **Multi-Format Ingestion & Sandbox Defense:** Format-aware parsing preserving tables and sections across `.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`, and `.md`, with magic-byte validation and zip-bomb rejection.
5. **Interactive Interfaces:** High-performance React 18 engineering Dashboard with lifted persistent chat state and an interactive React 19 product Landing experience.

---

## 2. Repository Layout & Architecture

```text
EPCmind/ (Repository Root)
├── AGENTS.md                  # Master agent context & instruction manual
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
│   ├── main.py                # FastAPI endpoints, CORS, background email poller
│   ├── rag.py                 # Grounded Q&A prompt assembly & semantic distance filter
│   ├── compilance.py          # Specification vs. Submittal compliance engine & JSON caching
│   ├── email_ingest.py        # Gmail IMAP sync, email store, on-demand ingestion
│   ├── email_store.json       # Persistent metadata store for fetched and ingested emails
│   ├── sandbox_check.py       # Isolated security validator (magic bytes, zip-bomb defense)
│   ├── vector_store.py        # ChromaDB client, embeddings, metadata, and search
│   ├── chunker.py             # Section-aware & table-aware chunking and classification
│   ├── exctractors.py         # Multi-format parsers (PDF, DOCX, XLSX, CSV, TXT)
│   ├── llm_api_provider.py    # Dual-mode LLM router (Colab/ngrok or Ollama) & local embeddings
│   ├── ingest.py              # Ingestion script to populate ChromaDB from Sample_docs
│   ├── last_compliance_check.json # Cached results from the last compliance check run
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Container configuration for backend deployment
│   └── .env                   # Environment variables (API URLs, Gmail IMAP credentials)
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
│       │   ├── Documents.jsx        # Document inventory and drag-and-drop file upload
│       │   └── Emails.jsx           # Email inbox view, sync trigger, per-email ingest
│       └── components/
│           ├── Sidebar.jsx          # Collapsible responsive navigation rail
│           ├── NavBar/Navbar.jsx    # Top navigation bar with breadcrumb & mobile toggle
│           ├── ColdStartBanner.jsx  # Dismissible cold-start warning
│           ├── ComplianceResultCard.jsx # Requirement comparison card (match/deviation)
│           ├── ChatMessage.jsx      # Message bubble with citation chips
│           ├── DocumentBadge.jsx    # Badges for Specification, Submittal, Email, etc.
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

| Layer | Primary Technologies | Key Libraries & Specifications |
|---|---|---|
| **Backend API** | Python 3.10+, FastAPI | `fastapi==0.139.2`, `uvicorn==0.51.0`, `pydantic==2.13.4`, `python-multipart==0.0.32` |
| **Vector Database** | ChromaDB (Persistent) | `chromadb==1.5.9` (collection: `epc_documents`, default path: `./chroma_db`) |
| **Document Parsers** | Python libraries | `python-docx==1.2.0`, `pypdf==6.14.2`, `pandas==3.0.3`, `html2text==2024.2.26` |
| **Active LLM Router** | Qwen 2.5 | Dual-mode: Cloud via Colab/ngrok (`QWEN_API_URL`) or local Ollama (`qwen2.5:3b`) |
| **Embeddings** | SentenceTransformer | `all-MiniLM-L6-v2` (384 dimensions), local GPU/CUDA auto-detection |
| **Email Sync** | Python standard library | `imaplib` (IMAP4_SSL), RFC-2047 decoding, MIME multipart extraction |
| **Security Sandbox** | Subprocess isolation | Magic-byte signature checking, zip-bomb validation (200MB limit) |
| **Dashboard UI** | React 18, Vite 5 | Tailwind CSS v3, GSAP 3.12, `@gsap/react`, Axios 1.18, React Router v6 |
| **Landing UI** | React 19, Vite 6 | Tailwind CSS v4, GSAP 3.12, React Router v7 |

---

## 4. Deep Dive: Backend Pipeline & Logic

### 4.1 Document Extraction (`backend/exctractors.py`)
- **DOCX (`extract_docx`)**: Iterates body elements via `iter_block_items` preserving both paragraphs and tables. Table rows are converted to pipe-delimited text bounded by `[TABLE]` and `[/TABLE]` tags.
- **PDF (`extract_pdf`)**: Extracts page by page using `pypdf.PdfReader` with `[PAGE N]` annotations.
- **Excel/CSV (`extract_excel`)**: Reads sheets via Pandas, dynamically locates the true header row (first row with >= 60% non-null cells), strips unnamed columns, and outputs clean dictionary records for every valid row.
- **Universal Entrypoint (`extract_file`)**: Automatically dispatches based on extension (`.docx`, `.pdf`, `.txt`, `.md`, `.xlsx`, `.xls`, `.csv`) and tags content as `structured` or `unstructured`.

### 4.2 Security Sandboxing (`backend/sandbox_check.py`)
- **Subprocess Isolation**: Executes document parsing inside a separate subprocess with sanitized environment variables.
- **Magic-Byte Signature Verification**: Validates file headers against allowed formats (`%PDF` for PDF, `PK` for DOCX/XLSX) to prevent spoofed file attacks.
- **Zip-Bomb Protection**: Inspects the uncompressed payload size of zipped Office documents (`.docx`, `.xlsx`) before extraction and rejects files exceeding 200MB.

### 4.3 Document Chunking & Classification (`backend/chunker.py`)
- **Document Header Preservation (`extract_doc_header`)**: Extracts the initial title block lines before numbered sections begin and prepends this identity to every chunk so contextual identity is preserved.
- **Unstructured Splitting (`chunk_unstructured`)**: Splits on section headers while strictly guarding `[TABLE]` blocks from being divided across chunk boundaries. Sub-splits long text up to `max_chunk_chars=1200`.
- **Structured Splitting (`chunk_structured`)**: Converts each row of an Excel/CSV spreadsheet into an independent labeled chunk containing document type, project name, and key-value attributes.
- **Document Classifier (`classify_doc_type`)**: Maps file names to domain categories: `Specification`, `Vendor Submittal`, `RFI`, `Procurement Schedule`, `Commissioning Record`, or `Email` (prefixed with `email:` or `email_`).

### 4.4 LLM Provider & Embedding Architecture (`backend/llm_api_provider.py`)
The system routes all AI operations through two centralized functions:
```python
def ask_ai(prompt: str, system_instruction: str = ...) -> str: ...
def embed_text(text: str) -> list[float]: ...
```
- **Dual-Mode LLM Routing**:
  - If `QWEN_API_URL` is set in `.env` → Calls the external Colab/ngrok Qwen generation endpoint (`POST {QWEN_API_URL}/generate`).
  - If `QWEN_API_URL` is unset or commented out → Calls local Ollama (`POST http://localhost:11434/api/generate` with model `qwen2.5:3b`).
- **Embedding Generation**:
  - Uses `SentenceTransformer("all-MiniLM-L6-v2")` producing 384-dimensional vector embeddings.
  - Hardware acceleration automatically engages CUDA when `torch.cuda.is_available()` is true; falls back to CPU otherwise.
  - Loads with `local_files_only=True` after first download to eliminate unnecessary external network requests and prevent httpx connection drops during server reloads.

### 4.5 Vector Store Operations (`backend/vector_store.py`)
- Manages persistent ChromaDB client at `./chroma_db` with collection `epc_documents`.
- `add_chunks(chunks)`: Embeds chunk texts and persists them with IDs and metadata (`filename`, `filetype`, `doc_type`, `document_type`, `document_id`).
- `search(query, n_results=5, filter_document_type=None)`: Performs vector similarity search, optionally filtered by `document_type`.
- `list_documents()`: Groups chunks by `document_id` to report document inventory and chunk counts.
- `delete_document(document_id)`: Removes all chunks associated with a specific document from ChromaDB.

### 4.6 Grounded RAG Engine (`backend/rag.py`)
- Retrieves top matching chunks via `search()`.
- **Relevance Filtering (`MAX_DISTANCE = 1.5`)**: Drops chunks whose L2 distance exceeds 1.5 to eliminate irrelevant document pollution.
- Returns `"No relevant information found in the documents."` if no retrieved chunk satisfies the threshold.
- Formats context blocks as `[Source N: <doc_type> — <filename>]\n<chunk_text>` and instructs the LLM to answer solely using the provided context and to cite source numbers.

### 4.7 Compliance Check Engine (`backend/compilance.py`)
- Compares specifications against vendor submittals across engineering requirements (autonomy, capacity, efficiency, topology, warranty, etc.).
- Enforces strict JSON output schema:
  - `requirement`: Name of the compared parameter.
  - `specified_value`: Value required by the specification, or `"Not stated"`.
  - `submitted_value`: Value offered by the submittal, or `"Not stated"`.
  - `status`: `"Match"` | `"Deviation"` | `"Cannot verify"`. (If either value is `"Not stated"`, status MUST be `"Cannot verify"`).
  - `severity`: `"Critical"` | `"Moderate"` | `"Low"` for deviations, otherwise `null`.
- Caches results to `backend/last_compliance_check.json` with an ISO timestamp.

### 4.8 Email Ingestion Pipeline (`backend/email_ingest.py`)
- **IMAP Synchronization (`sync_emails`)**: Connects over SSL to Gmail (`IMAP_HOST`, `IMAP_PORT`, `EMAIL_ADDRESS`, `EMAIL_APP_PASSWORD`), fetches new emails, decodes headers (RFC-2047), extracts clean plain text from multipart/HTML bodies via `html2text`, and stores metadata + raw bytes in `email_store.json`.
- **Background Polling**: An asyncio task (`_email_poll_loop` in `main.py`) executes `sync_emails()` at regular intervals (`EMAIL_POLL_INTERVAL_MINUTES`, default 5 minutes).
- **On-Demand Manual Ingestion (`ingest_email`)**: Emails are NOT automatically written to ChromaDB to prevent vector pollution. Ingestion is triggered explicitly per-email by the user:
  1. Ingests email subject, sender, timestamp, and body text as an `"Email"` document.
  2. Extracts attachments (`.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`, `.md`), validates them through `sandbox_check.py`, chunks them, and adds them to ChromaDB.
  3. Updates ingestion status in `email_store.json`.

### 4.9 REST API Endpoints (`backend/main.py`)
| Method | Endpoint | Request Payload / Params | Response Structure | Purpose |
|---|---|---|---|---|
| `GET` | `/` | None | `{"status": "ok"}` | Health check |
| `POST` | `/ask` | `{"question": str, "document_type": str \| null}` | `{"answer": str, "sources": [...]}` | Grounded Q&A with filtered source citations |
| `GET` | `/documents` | None | `{"documents": [...]}` | Document inventory |
| `POST` | `/upload` | Multipart `file: UploadFile` | `{"filename", "document_type", "chunks_added", "status"}` | Sandboxed parse, chunk, and index |
| `DELETE` | `/documents/{document_id}` | Path param `document_id` | `{"status": "success", "message": str}` | Delete document chunks and disk file |
| `POST` | `/compliance-check` | `{"document_ids": list[str]}` | `{"results": [...], "ran_at": str}` | Run comparison engine and persist cache |
| `GET` | `/compliance-check` | None | `{"results": [...], "ran_at": str}` | Read cached comparison findings |
| `GET` | `/stats` | None | `{"total_documents", "total_chunks", "deviations_found"}` | Dashboard headline metrics |
| `GET` | `/emails` | None | `{"emails": [...]}` | List fetched email records from store |
| `POST` | `/email/sync` | None | `{"fetched": int, "errors": [...]}` | Manually trigger IMAP synchronization |
| `POST` | `/email/ingest/{uid}` | Path param `uid` | `{"chunks_added": int, "errors": [...]}` | Ingest specific email & attachments to ChromaDB |
| `GET` | `/email/status` | None | `{"total_fetched", "total_ingested", "last_sync", ...}` | Email sync summary metrics |

---

## 5. Deep Dive: Frontend Architecture

### 5.1 Centralized API Client (`Dashboard/src/api/client.js`)
- All network interaction is consolidated into `client.js`. Direct calls to `fetch()` or `axios` in UI components are forbidden.
- Default base URL configured via `import.meta.env.VITE_API_BASE` (defaults to `http://localhost:8000`).
- Configured with a `180000ms` (3-minute) timeout to handle local LLM inference latencies.

### 5.2 Dashboard Pages & State Management
- **Persistent Chat State (`App.jsx`)**: The conversation state (`chatMessages`, `chatDocType`) is elevated to the `Layout` component in `App.jsx`, ensuring chat history and selected document filters persist uninterrupted when users switch between Dashboard tabs.
- **Home (`pages/Home.jsx`)**: Displays three summary metric cards (`Total Documents`, `Vector Chunks`, `Open Deviations`), recent audit findings, and direct navigation links.
- **Ask Documents (`pages/AskDocuments.jsx`)**: Interactive grounded chat with document-type filtering, source citation chips, and keyboard shortcut support (`Enter` sends, `Shift+Enter` creates new line).
- **Compliance Check (`pages/ComplianceCheck.jsx`)**: Left panel configures audit scope with animated radar sweep; right panel displays requirement comparison cards categorized by status and severity.
- **Documents (`pages/Documents.jsx`)**: Document inventory with chunk counts, delete action, and a drag-and-drop file upload zone with progress feedback.
- **Emails (`pages/Emails.jsx`)**: Displays fetched emails with sender avatars, date, body preview, attachment badges, a "Sync Now" trigger, and individual "Ingest" buttons for indexing into ChromaDB.
- **Document Badges (`components/DocumentBadge.jsx`)**: Color-coded badges for document types: Specification (sky), Vendor Submittal (purple), RFI (amber), Procurement Schedule (emerald), Commissioning Record (indigo), and Email (rose).

### 5.3 Landing Page (`Landing/`)
- A single-page narrative experience built with React 19, Tailwind CSS v4, and GSAP.
- Demonstrates the core value proposition: catching discrepancies such as 15-minute specified UPS autonomy vs. 10-minute vendor submittal.
- Runs on port 5174.

---

## 6. How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Ollama with model `qwen2.5:3b`, OR an active Colab/ngrok Qwen tunnel URL.
- (Optional) NVIDIA GPU with CUDA driver for accelerated vector embeddings.

### 1. Start Ollama (If using local model)
```powershell
ollama run qwen2.5:3b
```

### 2. Backend Setup
```powershell
cd backend
python -m venv .venv

# Activate virtual environment (Windows PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Index sample documents into ChromaDB:
python ingest.py

# Start FastAPI server:
uvicorn main:app --reload --port 8000
```
API documentation available at `http://localhost:8000/docs`.

### 3. Dashboard Setup
```powershell
cd Dashboard
npm install
npm run dev                  # http://localhost:5173
```

### 4. Landing Page Setup (Optional)
```powershell
cd Landing
npm install
npm run dev -- --port 5174   # http://localhost:5174
```

---

## 7. Canonical Demo Walkthrough

1. **Dashboard Overview:** Open `http://localhost:5173/` and verify the metrics reflect indexed documents (~4 sample documents, ~42 chunks, 11 deviations).
2. **Ask Documents:** Navigate to `/ask`, filter by `Specification`, and ask:
   > *"What battery-backup autonomy does the UPS specification require?"*
   Confirm the answer indicates 15 minutes minimum at 500 kW full rated load, citing `[Source 1: Specification — UPS_System_Specification.docx]`.
3. **Compliance Check:** Navigate to `/compliance` and run the audit. Inspect the critical deviation:
   - **Requirement:** Battery Backup / Autonomy
   - **Specified Value:** 15 minutes minimum at full rated load (500 kW)
   - **Submitted Value:** 10 minutes at full rated load (500 kW)
   - **Status:** Deviation
   - **Severity:** Critical
4. **Email Ingestion:** Navigate to `/emails`, review fetched site emails, click **Ingest** on an email of interest, and confirm its contents and attachments appear in document search and `/ask` queries.

---

## 8. Agent Operating Rules & Constraints

1. **Preserve the LLM Abstraction Barrier:**
   - All LLM interactions must pass through `ask_ai()` in [llm_api_provider.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/llm_api_provider.py).
   - Never import requests, Ollama, or external AI clients directly into `rag.py`, `compilance.py`, or `main.py`.
2. **Controlled Email Ingestion:**
   - Emails must NOT be auto-ingested into ChromaDB upon fetch. Ingestion must remain an explicit user action via `POST /email/ingest/{uid}` to prevent polluting the vector index.
3. **Strict Sandbox Pipeline:**
   - All user-uploaded files and email attachments must be validated by [sandbox_check.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/sandbox_check.py) prior to parsing and chunking.
4. **Grounded Retrieval & Distance Thresholding:**
   - Maintain `MAX_DISTANCE = 1.5` in [rag.py](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/backend/rag.py). Never relax the prompt instructions requiring source citations (`[Source N: ...]`).
5. **Centralized Frontend API Calls:**
   - All network requests in `Dashboard/` must reside in [Dashboard/src/api/client.js](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/api/client.js). Components must not invoke `fetch` or `axios` directly.
6. **Chat State Preservation:**
   - Do not move chat state back into `AskDocuments.jsx`. Maintain chat state elevation in [App.jsx](file:///c:/Users/shubh/Desktop/SIH%20pro/EPCmind/Dashboard/src/App.jsx) so route changes do not wipe user queries.
7. **Table & Section Integrity:**
   - Ensure table extraction and section chunking preserve `[TABLE]` bounding tags so tabular engineering data is never fragmented across chunks.
