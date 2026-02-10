"""
Embeddings & Pinecone Vector Store Utility.
Handles document chunking, embedding generation, and semantic search.
"""

import math
from pinecone import Pinecone
from openai import OpenAI
from app.config.settings import get_settings

settings = get_settings()

# Lazy-initialized clients
_pinecone_index = None
_openai_client = None


def _get_openai() -> OpenAI | None:
    global _openai_client
    if _openai_client is None and settings.openai_api_key:
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


def _get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is None:
        if not settings.pinecone_api_key:
            return None
        pc = Pinecone(api_key=settings.pinecone_api_key)
        _pinecone_index = pc.Index(settings.pinecone_index)
    return _pinecone_index


def generate_embedding(text: str) -> list[float]:
    """Generate embedding using OpenAI text-embedding-ada-002."""
    client = _get_openai()
    if client is None:
        # Fallback: deterministic mock embedding for dev/testing
        return _mock_embedding(text)

    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=text,
    )
    return response.data[0].embedding


def _mock_embedding(text: str) -> list[float]:
    """Deterministic 1536-dim pseudo-embedding for testing without OpenAI."""
    embedding = [0.0] * 1536
    h = 0
    for ch in text:
        h = ((h << 5) - h) + ord(ch)
        h &= 0xFFFFFFFF
    for i in range(1536):
        embedding[i] = math.sin(h * (i + 1)) * 0.5
    return embedding


# ── Chunking ──────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks, breaking at sentence boundaries."""
    chunks: list[str] = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Try to break at sentence boundary
        if end < len(text):
            last_period = text.rfind(".", start, end)
            last_newline = text.rfind("\n", start, end)
            break_point = max(last_period, last_newline, start + chunk_size // 2)
        else:
            break_point = end

        chunk = text[start:break_point].strip()
        if len(chunk) > 50:
            chunks.append(chunk)

        start = break_point - overlap
        if start < 0:
            start = break_point

    return chunks


# ── Indexing ──────────────────────────────────────────────────────────

def index_document(
    company_id: str,
    document_id: str,
    content: str,
    metadata: dict | None = None,
    chunk_size: int = 1000,
) -> dict:
    """Chunk a document, embed each chunk, and upsert into Pinecone."""
    idx = _get_pinecone_index()
    if idx is None:
        return {"total": 0, "indexed": 0, "error": "Pinecone not configured"}

    chunks = chunk_text(content, chunk_size)
    namespace = f"company_{company_id}"
    vectors = []

    for i, chunk in enumerate(chunks):
        emb = generate_embedding(chunk)
        vec_id = f"{document_id}_chunk_{i}"
        vec_meta = {
            "content": chunk,
            "documentId": document_id,
            "companyId": company_id,
            "chunkIndex": i,
            **(metadata or {}),
        }
        vectors.append({"id": vec_id, "values": emb, "metadata": vec_meta})

    # Upsert in batches of 100
    for batch_start in range(0, len(vectors), 100):
        batch = vectors[batch_start : batch_start + 100]
        idx.upsert(vectors=batch, namespace=namespace)

    return {"total": len(chunks), "indexed": len(vectors)}


# ── Search ────────────────────────────────────────────────────────────

def search_knowledge(
    query: str,
    company_id: str,
    top_k: int = 5,
    min_score: float = 0.7,
) -> list[dict]:
    """Search Pinecone for relevant knowledge chunks."""
    idx = _get_pinecone_index()
    if idx is None:
        return []

    query_emb = generate_embedding(query)
    namespace = f"company_{company_id}"

    results = idx.query(
        vector=query_emb,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
    )

    return [
        {
            "content": m.metadata.get("content", ""),
            "score": m.score,
            "documentId": m.metadata.get("documentId"),
            "chunkIndex": m.metadata.get("chunkIndex"),
        }
        for m in results.matches
        if m.score >= min_score
    ]


def delete_company_vectors(company_id: str) -> bool:
    """Delete all vectors for a company namespace."""
    idx = _get_pinecone_index()
    if idx is None:
        return False
    idx.delete(delete_all=True, namespace=f"company_{company_id}")
    return True
