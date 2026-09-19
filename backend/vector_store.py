import chromadb
from llm_api_provider import embed_text
import os
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

os.makedirs(CHROMA_PATH, exist_ok=True)
_chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
_collection = _chroma_client.get_or_create_collection(name="epc_documents")


def add_chunks(chunks: list[dict]):
    ids = []
    texts = []
    metadatas = []
    embeddings = []

    for chunk in chunks:
        ids.append(chunk["chunk_id"])
        texts.append(chunk["text"])
        embeddings.append(embed_text(chunk["text"]))
        metadatas.append({
            "filename": chunk["filename"],
            "document_id": chunk["document_id"],
            "stored_filename": chunk["stored_filename"],
            "filetype": chunk["filetype"],
            "doc_type": chunk["doc_type"],
            "document_type": chunk["document_type"],
        })

    _collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def search(query: str, n_results: int = 8, filter_document_type: str = None):
    query_embedding = embed_text(query)
    where_filter = {"document_type": filter_document_type} if filter_document_type else None

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where_filter,
    )

    matches = []
    for i in range(len(results["ids"][0])):
        matches.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return matches


def list_documents():
    """
    Groups all stored chunks by document_id (NOT filename — two
    uploads can share a filename but never a document_id).
    """
    all_data = _collection.get(include=["metadatas"])

    grouped = {}
    for metadata in all_data["metadatas"]:
        doc_id = metadata["document_id"]
        if doc_id not in grouped:
            grouped[doc_id] = {
                "document_id": doc_id,
                "filename": metadata["filename"],
                "stored_filename": metadata.get("stored_filename"),
                "document_type": metadata["document_type"],
                "filetype": metadata["filetype"],
                "chunk_count": 0,
            }
        grouped[doc_id]["chunk_count"] += 1

    return list(grouped.values())


def get_stats():
    documents = list_documents()
    total_documents = len(documents)
    total_chunks = sum(doc["chunk_count"] for doc in documents)

    return {
        "total_documents": total_documents,
        "total_chunks": total_chunks,
    }


def delete_document(document_id: str):
    """
    Removes all chunks belonging to a specific upload (by document_id,
    not filename) from ChromaDB.
    """
    _collection.delete(where={"document_id": document_id})

def get_document_chunks(document_id: str):
    """
    Returns ALL chunks of one specific document (no semantic search) —
    used when the user has explicitly selected a single document to
    ask about, so nothing gets missed.
    """
    data = _collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )

    items = list(zip(data["ids"], data["documents"], data["metadatas"]))
    # chunk_id format is "{document_id}_{index}" — sort by that index
    items.sort(key=lambda x: int(x[0].split("_")[-1]))

    return [{"text": text, "metadata": meta} for _, text, meta in items]