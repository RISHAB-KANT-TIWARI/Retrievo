import re
import difflib
from datetime import datetime, timezone
from fastapi.responses import FileResponse
import requests
from llm_api_provider import QWEN_API_URL, ask_vision, ask_ai
from fastapi import UploadFile, File, Form
import subprocess
import sys
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import ask_with_rag
from compilance import run_compliance_check
from vector_store import add_chunks
from vector_store import search
from vector_store import _collection
from vector_store import list_documents, delete_document, get_document_chunks
from vector_store import get_stats
from chunker import chunk_document
from exctractors import extract_file
from email_ingest import sync_emails, ingest_email, list_emails, get_email_status
import uuid
import os
import shutil
from compilance import save_compliance_results, load_compliance_results
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMAIL_POLL_INTERVAL = int(os.getenv("EMAIL_POLL_INTERVAL_MINUTES", "5")) * 60


async def _email_poll_loop():
    logger.info("Email poller started (interval=%ds)", EMAIL_POLL_INTERVAL)
    while True:
        try:
            result = sync_emails()
            if result["fetched"] > 0:
                log_action("email_received", {"count": result["fetched"]})
                logger.info("Email sync: fetched %d new email(s)", result["fetched"])
            if result["errors"]:
                logger.warning("Email sync errors: %s", result["errors"])
        except Exception:
            logger.exception("Unhandled error in email poll loop")
        await asyncio.sleep(EMAIL_POLL_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    poll_task = asyncio.create_task(_email_poll_loop())
    try:
        yield
    finally:
        poll_task.cancel()
        try:
            await poll_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="EPC Intelligence API", lifespan=lifespan)


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/")
def root():
    return {"status": "ok"}


class AskRequest(BaseModel):
    question: str
    document_type: str | None = None
    document_id: str | None = None
    provider: str = "qwen"


@app.post("/ask")
def ask(req: AskRequest):
    from rag import MAX_DISTANCE
    answer = ask_with_rag(
        req.question,
        filter_document_type=req.document_type,
        document_id=req.document_id,
        provider=req.provider,
    )

    sources = []
    if not req.document_id:
        chunks = search(req.question, filter_document_type=req.document_type)
        sources = [
            {
                "filename": c["metadata"]["filename"],
                "document_type": c["metadata"]["document_type"],
                "text": c["text"],
                "distance": c["distance"],
            }
            for c in chunks if c["distance"] <= MAX_DISTANCE
        ]

    return {"answer": answer, "sources": sources}


# ── Agentic document routing (natural-language switch/delete) ───────────────
# Pure code-based (regex + fuzzy match) — NO extra AI call, so it's fast and
# doesn't burn extra model credit/GPU time on every single message.

FILENAME_PATTERN = re.compile(r'[\w\-]+\.\w{2,5}')
DELETE_KEYWORDS = ("delete", "remove", "hata", "hatao", "hatado", "erase")


def extract_filename_candidates(text: str) -> list[str]:
    return FILENAME_PATTERN.findall(text)


def is_delete_intent(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in DELETE_KEYWORDS)


def match_documents(candidates: list[str]) -> list[dict]:
    """
    Fuzzy-matches whatever filename-like text the user typed (even with
    typos) against the REAL document list — never trusts raw user input
    directly, only uses it to find the closest actual match.
    """
    all_docs = list_documents()
    all_filenames = [d["filename"] for d in all_docs]

    matched = []
    matched_ids = set()
    for cand in candidates:
        close = difflib.get_close_matches(cand, all_filenames, n=1, cutoff=0.55)
        if close:
            doc = next(d for d in all_docs if d["filename"] == close[0])
            if doc["document_id"] not in matched_ids:
                matched.append(doc)
                matched_ids.add(doc["document_id"])
    return matched


class AgentRequest(BaseModel):
    message: str
    provider: str = "qwen"


@app.post("/agent/ask")
def agent_ask(req: AgentRequest):
    #it is the feature of AI to ask the history of document uploading and deleting
    #START HERE
    HISTORY_KEYWORDS = ("uploaded", "deleted", "upload hua", "delete hua", "kab aya", "history", "on date", "removed")
    if any(kw in req.message.lower() for kw in HISTORY_KEYWORDS) and not is_delete_intent(req.message):
        if os.path.exists(AUDIT_LOG_PATH):
            with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
                lines = f.readlines()[-80:]
            log_text = "\n".join(lines)
            prompt = f"""System activity log (JSON lines):
{log_text}

Answer using ONLY this log. QUESTION: {req.message}
ANSWER:"""
            answer = ask_ai(prompt, provider=req.provider)
            return {"type": "answer", "answer": answer, "sources": []}
    #END HERE 
    if not is_delete_intent(req.message):
        candidates = extract_filename_candidates(req.message)
        matched = match_documents(candidates) if candidates else []
        document_id = matched[0]["document_id"] if len(matched) == 1 else None
        document_ids = [d["document_id"] for d in matched] if len(matched) > 1 else None
        answer = ask_with_rag(req.message, document_id=document_id, document_ids=document_ids, provider=req.provider)
        return {"type": "answer", "answer": answer, "sources": []}

    all_docs = list_documents()
    file_list_str = "\n".join(f"- {d['filename']}" for d in all_docs)

    intent_prompt = f"""Available documents:
{file_list_str}

User message: "{req.message}"

Return ONLY JSON: {{"delete_targets": [...filenames...], "question": "...non-delete question part, else empty..."}}
Respect except/besides exclusions."""
    raw = ask_ai(intent_prompt, system_instruction="Return only valid JSON.")
    try:
        parsed = json.loads(raw.strip().strip("`").replace("json", "", 1).strip())
    except Exception:
        parsed = {"delete_targets": [], "question": req.message}

    delete_targets = parsed.get("delete_targets", [])
    question = parsed.get("question", "")

    answer_data = None
    if question.strip():
        candidates = extract_filename_candidates(question) or extract_filename_candidates(req.message)
        matched_q = match_documents(candidates) if candidates else []
        document_id = matched_q[0]["document_id"] if len(matched_q) == 1 else None
        document_ids = [d["document_id"] for d in matched_q] if len(matched_q) > 1 else None
        answer_data = ask_with_rag(question, document_id=document_id, document_ids=document_ids, provider=req.provider)

    # Conditional-delete recheck — agar koi answer nikla hai, delete-list usse dobara verify karo
    if answer_data and delete_targets:
        recheck_prompt = f"""Original request: "{req.message}"
Computed answer: "{answer_data}"

Based on the answer, which files should still be deleted? Respect any
condition in the request (e.g. "if X then don't delete").
Candidates: {delete_targets}
Return ONLY a JSON array of filenames that should actually be deleted."""
        raw2 = ask_ai(recheck_prompt, system_instruction="Return only a valid JSON array.")
        try:
            delete_targets = json.loads(raw2.strip().strip("`").replace("json", "", 1).strip())
        except Exception:
            pass

    matched_delete = [d for d in all_docs if d["filename"] in delete_targets]

    if matched_delete:
        return {
            "type": "confirm_delete",
            "matched_documents": [{"document_id": d["document_id"], "filename": d["filename"]} for d in matched_delete],
            "answer": answer_data,
        }
    return {"type": "answer", "answer": answer_data or "I couldn't understand that request.", "sources": []}
class DeleteConfirmedRequest(BaseModel):
    document_ids: list[str]


@app.post("/agent/delete-confirmed")
def agent_delete_confirmed(req: DeleteConfirmedRequest):
    """
    Only called AFTER the user has explicitly confirmed — reuses the exact
    same delete logic (ChromaDB + disk) as the manual Remove button.
    """
    docs = list_documents()
    deleted = []
    for doc_id in req.document_ids:
        match = next((d for d in docs if d["document_id"] == doc_id), None)
        delete_document(doc_id)
        if match and match.get("stored_filename"):
            file_path = os.path.join(UPLOAD_DIR, match["stored_filename"])
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except PermissionError:
                    import time
                    time.sleep(0.5)
                    try:
                        os.remove(file_path)
                    except PermissionError:
                        print(f"Could not delete {file_path} — file in use, skipping disk cleanup")
        if match:
            deleted.append(match["filename"])
    log_action("agent_delete", {"deleted": deleted})
    return {"status": "success", "deleted": deleted}


# ── Vision (image chat) ───────────────────────────────────────────────────

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB
VISION_SYSTEM_INSTRUCTION = (
    "You are looking at an image the user has attached to their question. "
    "Describe what you actually see in the image — objects, animals, people, "
    "scenes, colors, text, or anything relevant — and answer the user's "
    "question based on the image content. Do not assume the image contains "
    "extracted document text unless it clearly does (e.g. a scanned page, "
    "screenshot, or form)."
)


@app.post("/ask-image")
def ask_image(
    question: str = Form(...),
    document_type: str | None = Form(None),
    image: UploadFile = File(...),
):
    original_filename = os.path.basename(image.filename)
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        return {"status": "error", "message": f"Image type '{file_ext}' not allowed."}

    content = image.file.read()
    if len(content) > MAX_IMAGE_SIZE:
        return {"status": "error", "message": "Image too large. Max size is 15 MB"}

    temp_id = uuid.uuid4().hex
    temp_path = os.path.join(UPLOAD_DIR, f"chatimg_{temp_id}_{original_filename}")
    with open(temp_path, "wb") as f:
        f.write(content)

    sandbox_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "TEMP": os.environ.get("TEMP", ""),
        "TMP": os.environ.get("TMP", ""),
    }

    try:
        result = subprocess.run(
            [sys.executable, "sandbox_check.py", temp_path],
            capture_output=True,
            text=True,
            timeout=180,
            env=sandbox_env,
            cwd=BASE_DIR,
        )
    except subprocess.TimeoutExpired:
        os.remove(temp_path)
        return {"status": "error", "message": "Image took too long to process and was rejected for safety."}

    if result.returncode != 0 or not result.stdout.strip():
        print("SANDBOX STDERR:", result.stderr)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"status": "error", "message": "Image processing crashed and was rejected for safety."}

    try:
        sandbox_result = json.loads(result.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"status": "error", "message": "Unexpected sandbox output — image rejected for safety."}

    if sandbox_result["status"] != "ok":
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"status": "error", "message": sandbox_result.get("reason", "Image rejected by security check.")}

    try:
        answer = ask_vision(question, temp_path, system_instruction=VISION_SYSTEM_INSTRUCTION)
    except Exception as e:
        return {"status": "error", "message": f"Vision model error: {e}"}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return {"answer": answer}


@app.get("/documents")
def get_documents():
    return {"documents": list_documents()}

@app.get("/related/{document_id}")
def get_related(document_id: str):
    chunks = get_document_chunks(document_id)
    if not chunks:
        return {"related": []}
    sample_text = chunks[0]["text"][:500]
    results = search(sample_text, n_results=5)
    related, seen = [], {document_id}
    for r in results:
        rid = r["metadata"]["document_id"]
        if rid not in seen:
            seen.add(rid)
            related.append({"filename": r["metadata"]["filename"], "document_id": rid, "snippet": r["text"][:150]})
        if len(related) >= 3:
            break
    return {"related": related}

@app.get("/documents/{document_id}/content")
def get_document_content(document_id: str):
    chunks = get_document_chunks(document_id)
    if not chunks:
        return {"status": "error", "message": "Document not found"}
    return {"text": "\n\n".join(c["text"] for c in chunks)}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(BASE_DIR, "uploaded_docs")
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
@app.get("/documents/{document_id}/file")
def get_document_file(document_id: str):
    docs = list_documents()
    match = next((d for d in docs if d["document_id"] == document_id), None)
    if not match or not match.get("stored_filename"):
        return {"status": "error", "message": "File not found"}
    file_path = os.path.join(UPLOAD_DIR, match["stored_filename"])
    if not os.path.exists(file_path):
        return {"status": "error", "message": "File missing on disk"}
    return FileResponse(
        file_path,
        headers={"Content-Disposition": f'inline; filename="{match["filename"]}"'},
    )

AUDIT_LOG_PATH = os.path.join(BASE_DIR, "audit_log.jsonl")

def log_action(action: str, details: dict):
    entry = {"time": datetime.now(timezone.utc).isoformat(), "action": action, "details": details}
    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".jpg", ".jpeg", ".png",".zip"}
MAX_FILE_SIZE = 50 * 1024 * 1024


@app.post("/upload")
def upload_document(file: UploadFile = File(...)):
    original_filename = os.path.basename(file.filename)
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        return {"status": "error", "message": f"File type '{file_ext}' not allowed."}

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        return {"status": "error", "message": "File too large. Max size is 50 MB"}

    document_id = uuid.uuid4().hex
    stored_filename = f"{document_id}_{original_filename}"
    save_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(save_path, "wb") as f:
        f.write(content)

    sandbox_env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "TEMP": os.environ.get("TEMP", ""),
        "TMP": os.environ.get("TMP", ""),
    }

    try:
        result = subprocess.run(
            [sys.executable, "sandbox_check.py", save_path],
            capture_output=True,
            text=True,
            timeout=180,
            env=sandbox_env,
            cwd=BASE_DIR,
        )
    except subprocess.TimeoutExpired:
        os.remove(save_path)
        return {"status": "error", "message": "File took too long to process and was rejected for safety."}

    if result.returncode != 0 or not result.stdout.strip():
        print("SANDBOX STDERR:", result.stderr)
        os.remove(save_path)
        return {"status": "error", "message": "File processing crashed and was rejected for safety."}

    try:
        sandbox_result = json.loads(result.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        os.remove(save_path)
        return {"status": "error", "message": "Unexpected sandbox output — file rejected for safety."}

    if sandbox_result["status"] != "ok":
        os.remove(save_path)
        return {"status": "error", "message": sandbox_result.get("reason", "File rejected by security check.")}

    extracted = sandbox_result["data"]
    extracted["filename"] = original_filename

    chunks = chunk_document(extracted, document_id=document_id, stored_filename=stored_filename)
    if chunks and extracted.get("filetype") != ".zip":
        sample = extracted.get("text", "")[:3000] if extracted["doc_type"] == "unstructured" else str(extracted.get("records", ""))[:3000]
        summary = ask_ai(
            f"Summarize this document in 1-2 short sentences (max 200 characters) — mention key names, numbers, and topics:\n\n{sample}",
            system_instruction="You summarize documents for a search index. Be factual, extremely concise."
        )
        summary = summary.strip()[:200]  # hard cap — DB bloat na ho
        for c in chunks:
            c["document_summary"] = summary
    if not chunks:
        return {"status": "error", "message": "No content could be extracted from this file."}

    add_chunks(chunks)

    log_action("upload", {"document_id": document_id, "filename": original_filename, "chunks": len(chunks)})
    return {
        "filename": original_filename,
        "document_id": document_id,
        "document_type": chunks[0]["document_type"],
        "chunks_added": len(chunks),
        "status": "success",
    }


@app.delete("/documents/{document_id}")
def remove_document(document_id: str):
    docs = list_documents()
    match = next((d for d in docs if d["document_id"] == document_id), None)

    delete_document(document_id)

    if match and match.get("stored_filename"):
        file_path = os.path.join(UPLOAD_DIR, match["stored_filename"])
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except PermissionError:
                import time
                time.sleep(0.5)
                try:
                    os.remove(file_path)
                except PermissionError:
                    print(f"Could not delete {file_path} — file in use, skipping disk cleanup")
    log_action("delete", {"document_id": document_id, "filename": match["filename"] if match else None})
    return {"status": "success", "message": "Document removed"}


class ComplianceRequest(BaseModel):
    document_ids: list[str]


@app.post("/compliance-check")
def compliance_check(req: ComplianceRequest):
    results = run_compliance_check(req.document_ids)
    data = save_compliance_results(results)
    return data


@app.get("/compliance-check")
def get_last_compliance_check():
    return load_compliance_results()


@app.get("/stats")
def stats():
    doc_data = get_stats()
    compliance_data = load_compliance_results()
    deviations = sum(1 for r in compliance_data["results"] if r.get("status") == "Deviation")
    return {
        "total_documents": doc_data["total_documents"],
        "total_chunks": doc_data["total_chunks"],
        "deviations_found": deviations,
    }

@app.get("/audit-log")
def get_audit_log(limit: int = 50):
    if not os.path.exists(AUDIT_LOG_PATH):
        return {"logs": []}
    with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()[-limit:]
    return {"logs": [json.loads(l) for l in lines]}

@app.get("/emails")
def get_emails():
    return {"emails": list_emails()}


@app.post("/email/sync")
def email_sync():
    result = sync_emails()
    return result


@app.post("/email/ingest/{uid}")
def email_ingest(uid: str):
    result = ingest_email(uid)
    return result


@app.get("/email/status")
def email_status():
    return get_email_status()


@app.post("/timeline/ask")
def timeline_ask(req: AgentRequest):
    if not os.path.exists(AUDIT_LOG_PATH):
        return {"answer": "No history recorded yet."}
    with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()[-30:]
    log_text = "\n".join(lines)
    prompt = f"""Below is a system activity log (JSON lines — timestamp, action, details).

LOG:
{log_text}

Answer the user's question using ONLY this log. Be specific about dates and filenames.

QUESTION: {req.message}

ANSWER:"""
    answer = ask_ai(prompt, provider=req.provider)
    return {"answer": answer}

