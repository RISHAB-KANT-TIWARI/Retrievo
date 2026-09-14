import sys
import json
import os
import zipfile

from exctractors import extract_file

MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024  # 200MB safety cap (zip-bomb protection)

MAGIC_BYTES = {
    ".pdf": [b"%PDF"],
    ".docx": [b"PK"],
    ".xlsx": [b"PK"],
    ".xls": [b"\xD0\xCF\x11\xE0"],
}


def check_magic_bytes(path, ext):
    """Confirms the file's actual content matches its extension —
    catches a renamed/fake file (e.g. a .exe renamed to .pdf)."""
    if ext not in MAGIC_BYTES:
        return True  # .txt/.md/.csv have no fixed signature — skip
    with open(path, "rb") as f:
        header = f.read(8)
    return any(header.startswith(sig) for sig in MAGIC_BYTES[ext])


def check_zip_bomb(path, ext):
    """DOCX/XLSX are ZIP files under the hood. Checks the total
    UNCOMPRESSED size before fully extracting — catches a tiny file
    crafted to explode into gigabytes when opened."""
    if ext not in (".docx", ".xlsx"):
        return True
    try:
        with zipfile.ZipFile(path) as z:
            total = sum(info.file_size for info in z.infolist())
            if total > MAX_UNCOMPRESSED_SIZE:
                return False
    except zipfile.BadZipFile:
        return False
    return True


def main():
    file_path = sys.argv[1]
    ext = os.path.splitext(file_path)[1].lower()

    if not check_magic_bytes(file_path, ext):
        print(json.dumps({
            "status": "rejected",
            "reason": f"File content doesn't match a real {ext} file (extension may be spoofed)."
        }))
        return

    if not check_zip_bomb(file_path, ext):
        print(json.dumps({
            "status": "rejected",
            "reason": "File expands to a suspiciously large size and was rejected."
        }))
        return

    try:
        extracted = extract_file(file_path)
        print(json.dumps({"status": "ok", "data": extracted}))
    except Exception as e:
        print(json.dumps({
            "status": "rejected",
            "reason": f"Could not safely process file: {e}"
        }))


if __name__ == "__main__":
    main()