from vector_store import search, get_document_chunks, keyword_search
from llm_api_provider import ask_ai
from sentence_transformers import CrossEncoder

_reranker = None

def _get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker
MAX_DISTANCE = 1.5
MAX_FULL_DOC_CHARS = 60000  # safety cap — agar ek document itna bada hai, top-K pe fallback karo


def ask_with_rag(question: str, n_results: int = 8, filter_document_type: str = None,
                  document_id: str = None, provider: str = "qwen"):

    if document_id:
        # Ek specific document select hai — uska POORA content do, search mat karo
        chunks = get_document_chunks(document_id)
        combined_text = "\n\n".join(c["text"] for c in chunks)

        if chunks and len(combined_text) <= MAX_FULL_DOC_CHARS:
            filename = chunks[0]["metadata"]["filename"]
            context = f"[Full document: {filename}]\n{combined_text}"
            prompt = f"""You are an AI assistant for a data centre EPC project. Answer the question using ONLY the context below — this is the COMPLETE content of the selected document, nothing is missing. If the answer isn't in the context, say so clearly.

CONTEXT:
{context}

QUESTION: {question}

ANSWER:"""
            return ask_ai(prompt, provider=provider)
        # Agar document bahut bada hai (60,000 char se zyada), neeche wale normal search pe fallback

    # Normal path: semantic top-K search (saare documents mein se, ya bade document ke liye fallback)
    semantic_chunks = search(question, n_results=15, filter_document_type=filter_document_type)
    keyword_chunks = keyword_search(question, n_results=15, filter_document_type=filter_document_type)

    seen, candidates = set(), []
    for c in semantic_chunks + keyword_chunks:
        key = (c["metadata"]["document_id"], c["text"])
        if key not in seen:
            seen.add(key)
            candidates.append(c)

    if not candidates:
        return "No relevant information found in the documents."

    pairs = [[question, c["text"]] for c in candidates]
    scores = _get_reranker().predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    relevant_chunks = [c for c, s in ranked[:n_results]]

    if not relevant_chunks:
        return "No relevant information found in the documents."

    context_blocks = []
    for i, c in enumerate(relevant_chunks):
        context_blocks.append(
            f"[Source {i+1}: {c['metadata']['document_type']} — {c['metadata']['filename']}]\n{c['text']}"
        )
    context = "\n\n".join(context_blocks)

    prompt = f"""You are an AI assistant for a data centre EPC project. Answer the question using ONLY the context below. If the answer isn't in the context, say so clearly. Cite which source(s) you used by number.

CONTEXT:
{context}

QUESTION: {question}

ANSWER (cite sources like [Source 1], [Source 2]):"""

    return ask_ai(prompt, provider=provider)