import gc
import json
import os
from datetime import datetime

from requests.exceptions import RequestException
from fastapi import HTTPException

from exctractors import extract_file
from llm_api_provider import ask_ai
from vector_store import list_documents, _collection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploaded_docs"))
COMPLIANCE_FILE = os.path.join(BASE_DIR, "last_compliance_check.json")
MAX_COMPLIANCE_CHARS = int(os.getenv("MAX_COMPLIANCE_CHARS", 150000))


def _get_chunks_text(document_id: str) -> str:
    """Retrieve and concatenate all chunk texts for a document from ChromaDB."""
    results = _collection.get(
        where={"document_id": document_id},
        include=["documents"],
    )
    return "\n".join(results.get("documents", []))


def run_compliance_check(document_ids: list[str]):
    if not document_ids or len(document_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="Select at least 2 documents to compare (e.g. a Specification and a Vendor Submittal)."
        )

    all_docs = {d["document_id"]: d for d in list_documents()}

    sections = []
    total_chars = 0

    for doc_id in document_ids:
        if doc_id not in all_docs:
            raise HTTPException(status_code=404, detail="One of the selected documents was not found.")

        doc = all_docs[doc_id]

        # Email documents have no file on disk — pull text from ChromaDB chunks
        if doc["document_type"] == "Email":
            text = _get_chunks_text(doc_id)
            if not text.strip():
                raise HTTPException(status_code=404, detail=f"Email '{doc['filename']}' has no content in the knowledge base.")
        else:
            file_path = os.path.join(UPLOAD_DIR, doc["stored_filename"])
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"File '{doc['filename']}' missing from disk.")

            extracted = extract_file(file_path)
            text = extracted.get("text")
            if text is None:
                text = "\n".join(
                    ", ".join(f"{k}: {v}" for k, v in row.items())
                    for row in extracted.get("records", [])
                )

        total_chars += len(text)
        sections.append(f"=== {doc['document_type'].upper()} — {doc['filename']} ===\n{text}")

    if total_chars > MAX_COMPLIANCE_CHARS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Selected documents are too large to compare in one go "
                f"({total_chars:,} characters, limit is {MAX_COMPLIANCE_CHARS:,}). "
                "Select fewer documents and try again."
            )
        )

    combined_docs = "\n\n".join(sections)

    prompt = f"""{combined_docs}

You are a compliance auditor. Carefully read ALL documents above. Identify every factual data point, specification, requirement, or claim that appears in ANY of the documents — do NOT assume what fields to look for, discover them from the actual content.

Then cross-compare those data points across the documents:
- If a value appears in one document, check whether the same data point appears in the other document(s).
- If both documents state a value for the same data point, compare them.

Respond with ONLY a JSON array, no markdown formatting, no explanation, no code fences. Each item must have exactly these fields:
- "requirement": short name of the data point being compared (derived from the document content)
- "specified_value": the value from the first document, or "Not stated" if absent
- "submitted_value": the value from the second document, or "Not stated" if absent
- "status": exactly one of "Match", "Deviation", or "Cannot verify"
- "severity": "Critical", "Moderate", or "Low" if status is "Deviation", otherwise null

IMPORTANT: If either specified_value or submitted_value is "Not stated", status MUST be "Cannot verify" — never "Match". A match requires both values to be actually present and equivalent.
Example format:
[{{"requirement": "Battery Autonomy", "specified_value": "15 minutes", "submitted_value": "10 minutes", "status": "Deviation", "severity": "Critical"}}]
"""

    try:
        raw_response = ask_ai(prompt)
    except RequestException:
        raise HTTPException(
        status_code=503,
        detail="AI model is currently unreachable — check if the Colab notebook/ngrok tunnel is still running."
    )

    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()

    try:
        results = json.loads(cleaned)
    except json.JSONDecodeError:
        return []

    return results


def save_compliance_results(results):
    data = {
        "results": results,
        "ran_at": datetime.now().isoformat(),
    }
    with open(COMPLIANCE_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return data


def load_compliance_results():
    if not os.path.exists(COMPLIANCE_FILE):
        return {"results": [], "ran_at": None}
    with open(COMPLIANCE_FILE, "r") as f:
        return json.load(f)