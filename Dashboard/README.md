# EPC Intelligence Platform — Frontend

React + Vite + Tailwind + GSAP, built against the dark "handcrafted" design
spec (liquid glass on Sidebar + Modals only, everything else solid dark
surfaces with 1px borders).

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_BASE if your FastAPI runs elsewhere
npm run dev
```

Runs at `http://localhost:5173` by default.

## Project structure

```
src/
├── api/client.js          ← the ONLY file that talks to FastAPI (read this first)
├── components/            ← reusable UI (Sidebar, ChatMessage, Modal, etc.)
├── pages/                 ← Home, AskDocuments, ComplianceCheck, Documents
├── lib/liquid-glass.js    ← liquid glass module (do not edit — reuse as-is)
├── lib/useLiquidGlass.js  ← React hook wrapper with cleanup
├── App.jsx                ← routing + layout shell
└── index.css              ← theme, shimmer/shake/radar keyframes
```

## FastAPI integration checklist

The frontend expects these five endpoints. Full request/response shapes
are documented as comments directly above each function in
`src/api/client.js` — that file is the single source of truth for the
contract between frontend and backend.

| Endpoint | Method | Used by |
|---|---|---|
| `/ask` | POST | `pages/AskDocuments.jsx` |
| `/compliance-check` | POST | `pages/ComplianceCheck.jsx` |
| `/upload` | POST (multipart) | `components/UploadDropzone.jsx` |
| `/documents` | GET | `pages/Documents.jsx` |
| `/stats` | GET | `pages/Home.jsx` |

Every page fails gracefully if its endpoint isn't built yet or the
backend is unreachable (empty state / toast notification instead of a
crash) — so you can build and test the frontend and backend in any order.

**CORS**: FastAPI needs `CORSMiddleware` allowing `http://localhost:5173`
(or whatever port Vite gives you) — see the snippet from earlier in this
project's setup.

## Design tokens spent

Per the design spec, liquid glass is intentionally rationed to two spots
only — do not add it elsewhere:
1. `components/Sidebar.jsx`
2. `components/Modal.jsx`

Everything else uses solid dark surfaces (`bg-surface`, `bg-surface-2`)
with 1px `border-border` edges to fake the "machined" look cheaply.
