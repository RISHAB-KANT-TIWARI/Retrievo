import gc
import json
import os
from datetime import datetime

from requests.exceptions import RequestException
from fastapi import HTTPException

from exctractors import extract_file
from llm_api_provider import ask_ai
from vector_store import list_documents

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploaded_docs"))
COMPLIANCE_FILE = os.path.join(BASE_DIR, "last_compliance_check.json")
MAX_COMPLIANCE_CHARS = int(os.getenv("MAX_COMPLIANCE_CHARS", 150000))


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
    # (baaki prompt bilkul waisa hi rahega — jaisa pehle tha)

    prompt = f"""{combined_docs}

Compare every relevant requirement (battery autonomy, capacity, efficiency, topology, warranty, etc.) across the documents above. Use the SPECIFICATION documents as the source of required values, and the VENDOR SUBMITTAL (and other) documents as what was actually provided. If there are multiple submittals, compare each separately against the specification.

Respond with ONLY a JSON array, no markdown formatting, no explanation, no code fences. Each item must have exactly these fields:
- "requirement": short name of what's being compared
- "specified_value": the value from the specification, or "Not stated" if absent
- "submitted_value": the value from the submittal, or "Not stated" if absent
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