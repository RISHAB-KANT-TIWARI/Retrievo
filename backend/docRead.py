from backend.exctractors import extract_file
import os

folder = "Sample_docs"
for filename in os.listdir(folder):
    path = os.path.join(folder, filename)
    result = extract_file(path)
    print(f"\n=== {result['filename']} ({result['doc_type']}) ===")
    print(result["text"][:300], "...")  # just preview first 300 chars