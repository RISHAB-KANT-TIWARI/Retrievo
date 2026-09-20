import re
import difflib
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
from vector_store import list_documents, delete_document
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
    candidates = extract_filename_candidates(req.message)
    matched = match_documents(candidates) if candidates else []

    if is_delete_intent(req.message) and matched:
        # Destructive — NEVER auto-execute, just report what was understood
        return {
            "type": "confirm_delete",
            "matched_documents": [
                {"document_id": d["document_id"], "filename": d["filename"]} for d in matched
            ],
        }

    # Not a delete — treat as a question. If exactly one document was
    # mentioned by name, auto-switch to it (full content, non-destructive).
    document_id = matched[0]["document_id"] if len(matched) == 1 else None
    answer = ask_with_rag(req.message, document_id=document_id, provider=req.provider)

    sources = []
    if not document_id:
        from rag import MAX_DISTANCE
        chunks = search(req.message)
        sources = [
            {
                "filename": c["metadata"]["filename"],
                "document_type": c["metadata"]["document_type"],
                "text": c["text"],
                "distance": c["distance"],
            }
            for c in chunks if c["distance"] <= MAX_DISTANCE
        ]

    return {
        "type": "answer",
        "answer": answer,
        "sources": sources,
        "auto_selected_document": matched[0]["filename"] if document_id else None,
    }


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
                os.remove(file_path)
        if match:
            deleted.append(match["filename"])
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
            timeout=30,
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


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(BASE_DIR, "uploaded_docs")
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".jpg", ".jpeg", ".png"}
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
            timeout=30,
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

    if not chunks:
        return {"status": "error", "message": "No content could be extracted from this file."}

    add_chunks(chunks)

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
            os.remove(file_path)

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