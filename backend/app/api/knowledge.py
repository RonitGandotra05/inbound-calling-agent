"""
Knowledge API – Upload, list, and delete knowledge base documents.
"""

import uuid
import logging
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.models.models import Company, KnowledgeDocument
from app.models.schemas import DocumentResponse
from app.utils.document_parser import parse_buffer, get_supported_types
from app.utils.embeddings import index_document

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("")
async def list_documents(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge documents for a company."""
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.company_id == company_id)
        .order_by(KnowledgeDocument.uploaded_at.desc())
    )
    docs = result.scalars().all()
    return {"documents": [DocumentResponse.model_validate(d) for d in docs]}


@router.post("", status_code=202)
async def upload_document(
    company_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document and index it into the vector store."""

    # Validate company
    company_q = await db.execute(
        select(Company.id).where(Company.id == company_id)
    )
    if company_q.scalar_one_or_none() is None:
        raise HTTPException(404, "Company not found")

    # Validate file
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    supported = get_supported_types()
    if ext not in supported:
        raise HTTPException(
            400, f"Unsupported file type '{ext}'. Supported: {', '.join(supported)}"
        )

    buffer = await file.read()
    if len(buffer) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")

    # Create DB record
    doc_id = uuid.uuid4()
    namespace = f"company_{company_id}"
    doc = KnowledgeDocument(
        id=doc_id,
        company_id=company_id,
        filename=f"{doc_id}.{ext}",
        original_name=file.filename,
        content_type=ext,
        file_size=len(buffer),
        pinecone_namespace=namespace,
        status="processing",
    )
    db.add(doc)
    await db.flush()

    # Parse & index (inline for now – could be background task)
    try:
        parsed = parse_buffer(buffer, ext, file.filename or "")
        content = parsed["content"]

        if len(content) < 10:
            raise ValueError("Document appears to be empty or too short")

        logger.info("Parsed %d chars from %s", len(content), file.filename)

        result = index_document(
            company_id,
            str(doc_id),
            content,
            metadata={"filename": file.filename, "contentType": ext, **parsed.get("metadata", {})},
        )

        doc.status = "indexed"
        doc.chunk_count = result.get("indexed", 0)
        doc.indexed_at = datetime.utcnow()

    except Exception as exc:
        logger.exception("Failed to process document %s", doc_id)
        doc.status = "failed"
        doc.error_message = str(exc)

    await db.flush()

    return {
        "message": "Document uploaded and processed",
        "documentId": str(doc_id),
        "status": doc.status,
        "chunkCount": doc.chunk_count,
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a knowledge document."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(404, "Document not found")

    await db.delete(doc)
    await db.flush()

    return {"message": "Document deleted"}
