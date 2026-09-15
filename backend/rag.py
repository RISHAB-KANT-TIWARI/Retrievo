from vector_store import search
from llm_api_provider import ask_ai

# L2 distance threshold: chunks above this are considered irrelevant and dropped.
# all-MiniLM-L6-v2 with L2 distance ranges 0–2 (0=identical, 2=opposite).
# 1.5 keeps genuinely related content while dropping clearly unrelated chunks.
MAX_DISTANCE = float(1.5)

def ask_with_rag(question: str, n_results: int = 5, filter_document_type: str = None, provider: str = "qwen"):
    chunks = search(question, n_results=n_results, filter_document_type=filter_document_type)
    relevant_chunks = [c for c in chunks if c["distance"] <= MAX_DISTANCE]

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

if __name__ == "__main__":
    question = "What is the battery backup requirement, and does the vendor submittal match it?"
    answer = ask_with_rag(question)
    print(answer)