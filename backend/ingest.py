import os
from exctractors import extract_file
from chunker import chunk_document
from vector_store import add_chunks

folder = "Sample_docs"

for filename in os.listdir(folder):
    path = os.path.join(folder, filename)
    extracted = extract_file(path)
    chunks = chunk_document(extracted)
    add_chunks(chunks)
    print(f"Ingested {len(chunks)} chunks from {filename}")

print("Done. Vector DB ready at ./chroma_db")