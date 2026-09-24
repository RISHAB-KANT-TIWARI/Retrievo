"""
email_ingest.py
---------------
Handles fetching emails from Gmail via IMAP and ingesting them (or their
attachments) into ChromaDB on demand.

Key design decisions:
- Emails are FETCHED automatically on a schedule but NOT auto-ingested.
  A human must click "Ingest" in the UI for a specific email.
- State is persisted in email_store.json alongside the module so
  restarts don't re-fetch everything.
- Security: attachment bytes are written to a temp file, run through the
  existing sandbox_check.py (same path as /upload), and deleted after.
- HTML bodies are converted to clean plain text via html2text.
- All IMAP credentials come from environment variables only.
"""

import imaplib
import email as email_lib
import email.header
import email.policy
import json
import os
import subprocess
import sys
import tempfile
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

import html2text

from chunker import chunk_document
from vector_store import add_chunks

logger = logging.getLogger(__name__)

# ── paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_PATH = os.path.join(BASE_DIR, "email_store.json")

# ── defaults (overridden via .env) ───────────────────────────────────────────
IMAP_HOST = os.getenv("IMAP_HOST", "imap.gmail.com")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD", "")

# Allowed attachment extensions (same policy as /upload)
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".jpg", ".jpeg", ".png",".zip"}
MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024  # 50 MB


# ── persistent store helpers ─────────────────────────────────────────────────

def _load_store() -> dict:
    """Load the email store JSON, creating it if it doesn't exist."""
    if os.path.exists(STORE_PATH):
        try:
            with open(STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {
        "fetched_uids": [],       # list of UID strings we've already fetched
        "ingested_uids": [],      # list of UID strings successfully ingested
        "emails": {},             # uid -> email metadata dict
        "last_sync": None,        # ISO timestamp of last IMAP sync
        "last_sync_error": None,  # last error string if sync failed
    }


def _save_store(store: dict) -> None:
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)


# ── IMAP helpers ─────────────────────────────────────────────────────────────

def _decode_header(raw) -> str:
    """Safely decode an email header that may be RFC-2047 encoded."""
    if raw is None:
        return ""
    parts = email.header.decode_header(raw)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                decoded.append(part.decode(charset or "utf-8", errors="replace"))
            except (LookupError, UnicodeDecodeError):
                decoded.append(part.decode("utf-8", errors="replace"))
        else:
            decoded.append(str(part))
    return "".join(decoded)


def _extract_body(msg) -> str:
    """
    Walk a parsed email.Message and return the best available plain-text body.
    Prefer text/plain; fall back to HTML-stripped text/html.
    """
    h2t = html2text.HTML2Text()
    h2t.ignore_links = True
    h2t.ignore_images = True
    h2t.body_width = 0  # no hard wrapping

    plain_parts = []
    html_parts = []

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            # Skip attachments
            if "attachment" in disp:
                continue
            if ctype == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    plain_parts.append(payload.decode(charset, errors="replace"))
            elif ctype == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html_parts.append(payload.decode(charset, errors="replace"))
    else:
        ctype = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ctype == "text/html":
                html_parts.append(text)
            else:
                plain_parts.append(text)

    if plain_parts:
        return "\n".join(plain_parts).strip()
    if html_parts:
        return h2t.handle("\n".join(html_parts)).strip()
    return ""


def _collect_attachments(msg) -> list:
    """
    Return a list of dicts with keys: filename, data (bytes).
    Only attachments with allowed extensions are returned.
    """
    attachments = []
    if not msg.is_multipart():
        return attachments

    for part in msg.walk():
        disp = str(part.get("Content-Disposition", ""))
        if "attachment" not in disp:
            continue

        raw_name = part.get_filename()
        if not raw_name:
            continue
        filename = _decode_header(raw_name)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.info("Skipping attachment %s — unsupported type %s", filename, ext)
            continue

        data = part.get_payload(decode=True)
        if data is None:
            continue
        if len(data) > MAX_ATTACHMENT_SIZE:
            logger.warning("Skipping attachment %s — exceeds 50 MB limit", filename)
            continue

        attachments.append({"filename": filename, "data": data})

    return attachments


# ── sandbox helper (reuses existing sandbox_check.py) ───────────────────────

def _sandbox_process_file(save_path: str) -> Optional[dict]:
    """
    Runs sandbox_check.py on *save_path* (same as the /upload route).
    Returns the extracted data dict on success, or None on failure.
    """
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
        logger.error("Sandbox timeout for %s", save_path)
        return None

    if result.returncode != 0 or not result.stdout.strip():
        logger.error("Sandbox stderr for %s: %s", save_path, result.stderr)
        return None

    try:
        sandbox_result = json.loads(result.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        logger.error("Sandbox JSON parse failed for %s", save_path)
        return None

    if sandbox_result.get("status") != "ok":
        logger.warning(
            "Sandbox rejected %s: %s",
            save_path,
            sandbox_result.get("reason", "unknown reason"),
        )
        return None

    return sandbox_result["data"]


# ── IMAP sync (fetch → store, no ingestion) ──────────────────────────────────

def sync_emails() -> dict:
    """
    Connect to Gmail IMAP, fetch ALL emails we haven't stored yet,
    and persist their metadata + body text.  Does NOT ingest into ChromaDB.

    Returns: { fetched: int, errors: list[str] }
    """
    if not EMAIL_ADDRESS or not EMAIL_APP_PASSWORD:
        return {"fetched": 0, "errors": ["EMAIL_ADDRESS or EMAIL_APP_PASSWORD not configured"]}

    store = _load_store()
    known_uids = set(store.get("fetched_uids", []))
    errors = []
    fetched = 0

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        mail.select("INBOX")

        # Fetch ALL messages so we don't miss older ones on first run
        status, data = mail.search(None, "ALL")
        if status != "OK":
            raise RuntimeError(f"IMAP SEARCH failed: {status}")

        uids = data[0].split()

        for uid_bytes in uids:
            uid = uid_bytes.decode()
            if uid in known_uids:
                continue  # already stored

            try:
                status, msg_data = mail.fetch(uid_bytes, "(RFC822)")
                if status != "OK" or not msg_data or msg_data[0] is None:
                    errors.append(f"Failed to fetch UID {uid}")
                    continue

                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw, policy=email_lib.policy.compat32)

                subject = _decode_header(msg.get("Subject", "(no subject)"))
                sender = _decode_header(msg.get("From", "unknown"))
                date_str = msg.get("Date", "")

                # Parse date safely
                try:
                    parsed_date = email_lib.utils.parsedate_to_datetime(date_str)
                    date_iso = parsed_date.isoformat()
                except Exception:
                    date_iso = datetime.now(timezone.utc).isoformat()

                body = _extract_body(msg)

                # Collect attachment filenames for display (data stored as b64 for later)
                attachment_names = []
                if msg.is_multipart():
                    for part in msg.walk():
                        disp = str(part.get("Content-Disposition", ""))
                        if "attachment" in disp:
                            raw_name = part.get_filename()
                            if raw_name:
                                attachment_names.append(_decode_header(raw_name))

                import base64
                store["emails"][uid] = {
                    "uid": uid,
                    "subject": subject,
                    "sender": sender,
                    "date": date_iso,
                    "body": body,
                    "attachment_names": attachment_names,
                    "ingested": False,
                    "ingested_at": None,
                    "chunks_added": 0,
                    "ingest_error": None,
                    # store raw bytes as base64 so attachments can be extracted at ingest time
                    "_raw_b64": base64.b64encode(raw).decode(),
                }
                store["fetched_uids"].append(uid)
                known_uids.add(uid)
                fetched += 1

            except Exception as exc:
                errors.append(f"UID {uid}: {exc}")
                logger.exception("Error processing UID %s", uid)

        mail.logout()

    except Exception as exc:
        errors.append(str(exc))
        logger.exception("IMAP connection error")

    store["last_sync"] = datetime.now(timezone.utc).isoformat()
    store["last_sync_error"] = errors[0] if errors else None
    _save_store(store)

    return {"fetched": fetched, "errors": errors}


# ── per-email ingest into ChromaDB ──────────────────────────────────────────

def ingest_email(uid: str) -> dict:
    """
    Ingest a single previously-fetched email (by UID) into ChromaDB.
    Ingests:
      1. The email body as an unstructured "Email" document.
      2. Each allowed attachment, run through sandbox -> extract -> chunk.

    Returns: { chunks_added: int, errors: list[str] }
    """
    import base64

    store = _load_store()
    email_meta = store.get("emails", {}).get(uid)

    if email_meta is None:
        return {"chunks_added": 0, "errors": [f"UID {uid} not found. Run sync first."]}

    if email_meta.get("ingested"):
        return {"chunks_added": email_meta.get("chunks_added", 0), "errors": [], "already_ingested": True}

    errors = []
    total_chunks = 0
    document_id = uuid.uuid4().hex

    # ── 1. Ingest body ────────────────────────────────────────────────────────
    body_text = email_meta.get("body", "").strip()
    if body_text:
        subject = email_meta.get("subject", "(no subject)")
        sender = email_meta.get("sender", "unknown")
        date = email_meta.get("date", "")
        body_with_header = (
            f"Email Subject: {subject}\n"
            f"From: {sender}\n"
            f"Date: {date}\n\n"
            f"{body_text}"
        )
        extracted_body = {
            "filename": f"Email: {subject[:60]}",
            "filetype": ".txt",
            "doc_type": "unstructured",
            "text": body_with_header,
        }
        body_doc_id = f"{document_id}_body"
        body_chunks = chunk_document(
            extracted_body,
            document_id=body_doc_id,
            stored_filename=f"email_{uid}.txt",
        )
        # Override document_type to "Email" for all body chunks
        for c in body_chunks:
            c["document_type"] = "Email"
            c["filename"] = f"Email: {subject[:60]}"

        if body_chunks:
            add_chunks(body_chunks)
            total_chunks += len(body_chunks)

    # ── 2. Ingest attachments ─────────────────────────────────────────────────
    raw_b64 = email_meta.get("_raw_b64", "")
    if raw_b64:
        try:
            raw = base64.b64decode(raw_b64)
            msg = email_lib.message_from_bytes(raw, policy=email_lib.policy.compat32)
            attachments = _collect_attachments(msg)
        except Exception as exc:
            errors.append(f"Failed to decode raw email for attachments: {exc}")
            attachments = []

        for att in attachments:
            att_id = f"{document_id}_{uuid.uuid4().hex[:6]}"
            ext = os.path.splitext(att["filename"])[1].lower()
            tmp_path = os.path.join(tempfile.gettempdir(), f"{att_id}{ext}")
            try:
                with open(tmp_path, "wb") as f:
                    f.write(att["data"])

                extracted = _sandbox_process_file(tmp_path)
                if extracted is None:
                    errors.append(f"Attachment '{att['filename']}' rejected by security sandbox")
                    continue

                att_chunks = chunk_document(
                    extracted,
                    document_id=att_id,
                    stored_filename=att["filename"],
                )
                if att_chunks:
                    add_chunks(att_chunks)
                    total_chunks += len(att_chunks)

            except Exception as exc:
                errors.append(f"Attachment '{att['filename']}': {exc}")
                logger.exception("Error ingesting attachment %s", att["filename"])
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

    # ── 3. Update store ───────────────────────────────────────────────────────
    store["emails"][uid]["ingested"] = True
    store["emails"][uid]["ingested_at"] = datetime.now(timezone.utc).isoformat()
    store["emails"][uid]["chunks_added"] = total_chunks
    store["emails"][uid]["ingest_error"] = errors[0] if errors else None
    store.setdefault("ingested_uids", [])
    if uid not in store["ingested_uids"]:
        store["ingested_uids"].append(uid)
    _save_store(store)

    return {"chunks_added": total_chunks, "errors": errors}


# ── public read helpers ──────────────────────────────────────────────────────

def list_emails() -> list:
    """
    Return all fetched emails as a list of metadata dicts (no raw bytes).
    Sorted newest-first by date.
    """
    store = _load_store()
    emails = []
    for uid, meta in store.get("emails", {}).items():
        emails.append({
            "uid": uid,
            "subject": meta.get("subject", ""),
            "sender": meta.get("sender", ""),
            "date": meta.get("date", ""),
            "body_preview": meta.get("body", "")[:200],
            "attachment_names": meta.get("attachment_names", []),
            "ingested": meta.get("ingested", False),
            "ingested_at": meta.get("ingested_at"),
            "chunks_added": meta.get("chunks_added", 0),
            "ingest_error": meta.get("ingest_error"),
        })

    # Sort newest first (ISO strings sort correctly)
    emails.sort(key=lambda e: e["date"], reverse=True)
    return emails


def get_email_status() -> dict:
    """Return a summary of the email store state."""
    store = _load_store()
    total = len(store.get("emails", {}))
    ingested = len(store.get("ingested_uids", []))
    return {
        "total_fetched": total,
        "total_ingested": ingested,
        "last_sync": store.get("last_sync"),
        "last_sync_error": store.get("last_sync_error"),
        "email_configured": bool(EMAIL_ADDRESS and EMAIL_APP_PASSWORD),
    }
