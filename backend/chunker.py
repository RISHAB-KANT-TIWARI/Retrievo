import re


def extract_doc_header(text):
    """
    Grabs the first few non-numbered lines (title block) before
    the first '1.1' style section heading — this is the doc's identity,
    prepended to every chunk so parent context isn't lost.
    """
    lines = text.split("\n")
    header_lines = []
    for line in lines:
        if re.match(r'^\d+\.\d+\s+[A-Z]', line.strip()):
            break
        if line.strip():
            header_lines.append(line.strip())
        if len(header_lines) >= 4:
            break
    return " | ".join(header_lines)


def chunk_unstructured(text, filename, max_chunk_chars=1200):
    doc_header = extract_doc_header(text)

    section_pattern = r'\n(?=\d+\.\d+\s+[A-Z])'
    sections = re.split(section_pattern, text)

    chunks = []
    for section in sections:
        section = section.strip()
        if not section:
            continue

        labeled_section = f"{doc_header}\n\n{section}" if doc_header else section

        if "[TABLE]" in labeled_section and len(labeled_section) <= max_chunk_chars * 2:
            chunks.append(labeled_section)
            continue

        if len(labeled_section) <= max_chunk_chars:
            chunks.append(labeled_section)
        else:
            paragraphs = labeled_section.split("\n")
            current = ""
            in_table = False
            for para in paragraphs:
                if "[TABLE]" in para:
                    in_table = True
                if "[/TABLE]" in para:
                    in_table = False

                if len(current) + len(para) > max_chunk_chars and not in_table:
                    if current.strip():
                        chunks.append(current.strip())
                    current = para + "\n"
                else:
                    current += para + "\n"
            if current.strip():
                chunks.append(current.strip())

    return chunks


def chunk_structured(records, doc_type_label, project_name):
    chunks = []
    for record in records:
        lines = [f"Document Type: {doc_type_label}", f"Project: {project_name}"]
        for key, val in record.items():
            lines.append(f"{key}: {val}")
        chunk_text = "\n".join(lines)
        chunks.append(chunk_text)
    return chunks


def classify_doc_type(filename, text=""):
    fname = filename.lower()
    if fname.startswith("email:") or fname.startswith("email_"):
        return "Email"
    elif "spec" in fname:
        return "Specification"
    elif "submittal" in fname:
        return "Vendor Submittal"
    elif "rfi" in fname:
        return "RFI"
    elif "schedule" in fname or "procurement" in fname:
        return "Procurement Schedule"
    elif "commission" in fname:
        return "Commissioning Record"
    return "Unknown"


def chunk_document(extracted, document_id, stored_filename, project_name="Ironwood Point Data Center"):
    """
    Takes the dict from extract_file() plus a unique document_id
    (assigned at upload time) and returns a list of chunk dicts.
    document_id — not filename — is the real identity of this upload,
    since two uploads can share the same filename.
    """
    doc_type_label = classify_doc_type(extracted["filename"], extracted.get("text", ""))

    if extracted["doc_type"] == "unstructured":
        raw_chunks = chunk_unstructured(extracted["text"], extracted["filename"])
    else:
        raw_chunks = chunk_structured(extracted["records"], doc_type_label, project_name)

    result = []
    for i, chunk_text in enumerate(raw_chunks):
        result.append({
            "text": chunk_text,
            "filename": extracted["filename"],       # for DISPLAY only
            "document_id": document_id,               # real identity
            "stored_filename": stored_filename,        # actual name on disk
            "filetype": extracted["filetype"],
            "doc_type": extracted["doc_type"],
            "document_type": doc_type_label,
            "chunk_id": f"{document_id}_{i}",          # unique — no more collisions
        })
    return result