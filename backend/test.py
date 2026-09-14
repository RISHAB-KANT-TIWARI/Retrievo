from vector_store import search

results = search("What is the battery backup requirement?", n_results=3)

for r in results:
    print(f"\n[{r['metadata']['document_type']}] {r['metadata']['filename']} (distance: {r['distance']:.3f})")
    print(r["text"][:300])