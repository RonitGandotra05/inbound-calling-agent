import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseBuffer, getSupportedTypes } from '@/utils/document-parser';
import { indexDocument } from '@/utils/embeddings';
import { v4 as uuidv4 } from 'uuid';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * GET /api/knowledge - List documents for a company
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        if (!companyId) {
            return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
        }

        const result = await query(
            `SELECT id, filename, original_name, content_type, file_size, 
              chunk_count, status, error_message, uploaded_at, indexed_at
       FROM knowledge_documents
       WHERE company_id = $1
       ORDER BY uploaded_at DESC`,
            [companyId]
        );

        return NextResponse.json({ documents: result.rows });

    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

/**
 * POST /api/knowledge - Upload a document
 */
export async function POST(request) {
    try {
        const formData = await request.formData();

        const companyId = formData.get('companyId');
        const file = formData.get('file');

        if (!companyId) {
            return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
        }

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: 'file is required' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate file type
        const supportedTypes = getSupportedTypes();
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!supportedTypes.includes(ext)) {
            return NextResponse.json(
                { error: `Unsupported file type. Supported: ${supportedTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify company exists
        const companyCheck = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
        if (companyCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Create document record
        const documentId = uuidv4();
        const filename = `${documentId}.${ext}`;
        const namespace = `company_${companyId}`;

        await query(
            `INSERT INTO knowledge_documents 
       (id, company_id, filename, original_name, content_type, file_size, pinecone_namespace, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')`,
            [documentId, companyId, filename, file.name, ext, file.size, namespace]
        );

        // Process document asynchronously
        processDocumentAsync(documentId, companyId, file, ext);

        return NextResponse.json({
            message: 'Document uploaded and queued for processing',
            documentId,
            status: 'processing'
        }, { status: 202 });

    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }
}

/**
 * DELETE /api/knowledge - Delete a document
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
        }

        // Get document info
        const docResult = await query(
            'SELECT company_id, filename FROM knowledge_documents WHERE id = $1',
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Delete from database (vectors will be orphaned but that's OK for now)
        await query('DELETE FROM knowledge_documents WHERE id = $1', [documentId]);

        // TODO: Delete vectors from Pinecone

        return NextResponse.json({ message: 'Document deleted successfully' });

    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}

/**
 * Process document in background
 */
async function processDocumentAsync(documentId, companyId, file, contentType) {
    try {
        console.log(`Processing document ${documentId}...`);

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse document
        const { content, metadata } = await parseBuffer(buffer, contentType, file.name);

        if (!content || content.length < 10) {
            throw new Error('Document appears to be empty or too short');
        }

        console.log(`Parsed ${content.length} characters from ${file.name}`);

        // Index into Pinecone
        const indexResult = await indexDocument(companyId, documentId, content, {
            filename: file.name,
            contentType,
            ...metadata
        });

        // Update document status
        await query(
            `UPDATE knowledge_documents 
       SET status = 'indexed', chunk_count = $1, indexed_at = NOW()
       WHERE id = $2`,
            [indexResult.indexed, documentId]
        );

        console.log(`Document ${documentId} indexed successfully (${indexResult.indexed} chunks)`);

    } catch (error) {
        console.error(`Failed to process document ${documentId}:`, error);

        await query(
            `UPDATE knowledge_documents 
       SET status = 'failed', error_message = $1
       WHERE id = $2`,
            [error.message, documentId]
        );
    }
}
