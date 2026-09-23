import tempfile
import uuid
import zipfile
import os
import gc
import pandas as pd
from docx import Document
from docx.document import Document as _Document
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph
import pypdf
from pdf2image import convert_from_path
from PIL import Image
import pytesseract


MAX_ZIP_ENTRIES = 20
MAX_ENTRY_SIZE = 10 * 1024 * 1024  

def iter_block_items(parent):
    if isinstance(parent, _Document):
        parent_elm = parent.element.body
    elif isinstance(parent, _Cell):
        parent_elm = parent._tc
    else:
        raise ValueError("Unsupported parent type")
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def extract_docx(path):
    doc = Document(path)
    full_text = []
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            if block.text.strip():
                full_text.append(block.text)
        elif isinstance(block, Table):
            full_text.append("[TABLE]")
            for row in block.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells)
                full_text.append(row_text)
            full_text.append("[/TABLE]")
    return "\n".join(full_text)


# STEP: OCR_CONFIG add kiya — "--psm 6" batata hai Tesseract ko ki page ek
# single uniform text block hai (paragraphs + tables sab), jo raw column-wise
# result-sheet / form jaisी layouts pe default psm se kaafi behtar accuracy deta hai.
OCR_CONFIG = "--psm 6"


def extract_pdf(path):
    reader = pypdf.PdfReader(path)
    full_text = []
    ocr_dpi = int(os.getenv("OCR_DPI", 300))  # STEP: 250 se 300 kiya — sharper image, better OCR digits/tables

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""

        if len(text.strip()) < 20:
            # Page has little/no real text — likely a scanned image, fall back to OCR
            try:
                images = convert_from_path(
                    path, dpi=ocr_dpi,
                    first_page=i + 1, last_page=i + 1
                )
                if images:
                    text = pytesseract.image_to_string(images[0], config=OCR_CONFIG)
                    del images
                    gc.collect()
            except Exception as e:
                text = f"[OCR failed for this page: {e}]"

        full_text.append(f"[PAGE {i+1}]\n{text}")

    return "\n".join(full_text)


def extract_image(path):
    """
    OCR on a standalone image (jpg/png) — e.g. a screenshot, a photo of a
    result sheet, or an image attached in chat. Not PDF-embedded — the
    whole file IS the image.
    """
    img = Image.open(path)
    # Convert to grayscale — improves OCR accuracy on photos/screenshots
    # with color noise, without hurting clean scans.
    img = img.convert("L")
    text = pytesseract.image_to_string(img, config=OCR_CONFIG)
    return text


def extract_txt(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_excel(path):
    """
    Returns a list of dicts — one clean dict per real row.
    Junk columns, empty cells, and blank rows are already dropped here.
    """
    raw = pd.read_excel(path, header=None)

    header_row_idx = 0
    for i in range(min(5, len(raw))):
        non_null = raw.iloc[i].notna().sum()
        if non_null >= len(raw.columns) * 0.6:
            header_row_idx = i
            break

    df = pd.read_excel(path, header=header_row_idx)
    df = df.dropna(axis=1, how="all")
    df.columns = [str(c).strip() for c in df.columns]

    records = []
    for _, row in df.iterrows():
        pairs = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val) or str(val).strip() == "":
                continue
            if col.startswith("Unnamed"):
                continue
            pairs[col] = str(val).strip()

        if not pairs:
            continue

        records.append(pairs)

    return records


def extract_file(path):
    """
    Universal entry point. Detects file type by extension,
    returns normalized content + metadata dict.
    """
    ext = os.path.splitext(path)[1].lower()

    if ext == ".docx":
        content = extract_docx(path)
        doc_type = "unstructured"
    elif ext == ".pdf":
        content = extract_pdf(path)
        doc_type = "unstructured"
    elif ext in [".jpg", ".jpeg", ".png"]:
        content = extract_image(path)
        doc_type = "unstructured"
    elif ext in [".txt", ".md"]:
        content = extract_txt(path)
        doc_type = "unstructured"
    elif ext in [".xlsx", ".xls", ".csv"]:
        content = extract_excel(path)
        doc_type = "structured"
    elif ext == ".zip":
        texts = []
        with zipfile.ZipFile(path) as z:
            entries = [i for i in z.infolist() if not i.is_dir()]
            if len(entries) > MAX_ZIP_ENTRIES:
                raise ValueError(f"Zip has too many files ({len(entries)} > {MAX_ZIP_ENTRIES} limit)")

            for info in entries:
                name = info.filename
                if ".." in name or os.path.isabs(name):
                    continue  # zip-slip guard
                entry_ext = os.path.splitext(name)[1].lower()
                if entry_ext == ".zip":
                    continue  # block nested zips
                if info.file_size > MAX_ENTRY_SIZE:
                    continue  # single file too big, skip it
                if entry_ext not in [".txt", ".md", ".csv", ".pdf", ".docx", ".xlsx", ".xls"]:
                    continue  # unsupported type inside zip

                tmp_path = os.path.join(tempfile.gettempdir(), f"zipentry_{uuid.uuid4().hex}{entry_ext}")
                try:
                    with z.open(info) as src, open(tmp_path, "wb") as dst:
                        dst.write(src.read())
                    sub_result = extract_file(tmp_path)
                    texts.append(f"[FROM {name}]\n" + sub_result.get("text", ""))
                except Exception:
                    continue  # one bad file shouldn't kill the whole batch
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
        # return {"text": "\n\n".join(texts)}
        content = "\n\n".join(texts)
        doc_type = "unstructured"
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    result = {
        "filename": os.path.basename(path),
        "filetype": ext,
        "doc_type": doc_type,
    }

    if doc_type == "structured":
        result["records"] = content
    else:
        result["text"] = content

    return result