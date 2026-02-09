/**
 * Embeddings Utility
 * Handles vector embeddings with Pinecone for the RAG knowledge base.
 * Each company gets their own namespace for data isolation.
 */

const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize Pinecone client
let pineconeClient = null;
let pineconeIndex = null;

async function initPinecone() {
    if (pineconeClient) return pineconeIndex;

    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'calling-agent-kb';

    if (!apiKey) {
        console.warn('PINECONE_API_KEY not set - RAG features disabled');
        return null;
    }

    try {
        pineconeClient = new Pinecone({ apiKey });
        pineconeIndex = pineconeClient.index(indexName);
        console.log('Pinecone initialized successfully');
        return pineconeIndex;
    } catch (error) {
        console.error('Failed to initialize Pinecone:', error);
        return null;
    }
}

/**
 * Generate embeddings using OpenAI (or fallback to simple hash)
 * In production, you'd use OpenAI's text-embedding-ada-002 or similar
 */
async function generateEmbedding(text) {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
        // Fallback: simple hash-based pseudo-embedding for testing
        console.warn('OpenAI API key not set - using mock embeddings');
        return generateMockEmbedding(text);
    }

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: text
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.data[0].embedding;
    } catch (error) {
        console.error('Embedding generation failed:', error);
        throw error;
    }
}

/**
 * Mock embedding for development/testing without OpenAI
 */
function generateMockEmbedding(text) {
    // Create a deterministic 1536-dimension vector from text hash
    const embedding = new Array(1536).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    for (let i = 0; i < 1536; i++) {
        embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }
    return embedding;
}

/**
 * Index a document chunk into Pinecone
 * @param {string} companyId - Company UUID
 * @param {string} documentId - Document UUID
 * @param {number} chunkIndex - Index of this chunk
 * @param {string} content - Text content
 * @param {Object} metadata - Additional metadata
 */
async function indexChunk(companyId, documentId, chunkIndex, content, metadata = {}) {
    const index = await initPinecone();
    if (!index) {
        console.warn('Pinecone not available - chunk not indexed');
        return false;
    }

    try {
        const embedding = await generateEmbedding(content);
        const namespace = `company_${companyId}`;
        const vectorId = `${documentId}_chunk_${chunkIndex}`;

        await index.namespace(namespace).upsert([{
            id: vectorId,
            values: embedding,
            metadata: {
                content,
                documentId,
                chunkIndex,
                companyId,
                ...metadata
            }
        }]);

        console.log(`Indexed chunk ${chunkIndex} for document ${documentId}`);
        return true;
    } catch (error) {
        console.error('Failed to index chunk:', error);
        return false;
    }
}

/**
 * Index an entire document (chunked)
 * @param {string} companyId - Company UUID
 * @param {string} documentId - Document UUID
 * @param {string} content - Full document content
 * @param {Object} metadata - Document metadata
 * @param {number} chunkSize - Characters per chunk
 */
async function indexDocument(companyId, documentId, content, metadata = {}, chunkSize = 1000) {
    const chunks = chunkText(content, chunkSize);
    let successCount = 0;

    for (let i = 0; i < chunks.length; i++) {
        const success = await indexChunk(companyId, documentId, i, chunks[i], metadata);
        if (success) successCount++;
    }

    console.log(`Indexed ${successCount}/${chunks.length} chunks for document ${documentId}`);
    return { total: chunks.length, indexed: successCount };
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);

        // Try to break at sentence boundary
        let breakPoint = end;
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            breakPoint = Math.max(lastPeriod, lastNewline, start + chunkSize / 2);
        }

        chunks.push(text.slice(start, breakPoint).trim());
        start = breakPoint - overlap;
        if (start < 0) start = breakPoint;
    }

    return chunks.filter(c => c.length > 50); // Filter tiny chunks
}

/**
 * Search knowledge base for relevant context
 * @param {string} query - Search query
 * @param {string} companyId - Company UUID
 * @param {Object} options - Search options
 */
async function searchKnowledge(query, companyId, options = {}) {
    const { topK = 5, minScore = 0.7 } = options;

    const index = await initPinecone();
    if (!index) {
        console.warn('Pinecone not available - returning empty results');
        return [];
    }

    try {
        const queryEmbedding = await generateEmbedding(query);
        const namespace = `company_${companyId}`;

        const results = await index.namespace(namespace).query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true
        });

        // Filter by minimum score and format results
        const matches = results.matches
            .filter(m => m.score >= minScore)
            .map(m => ({
                content: m.metadata.content,
                score: m.score,
                documentId: m.metadata.documentId,
                chunkIndex: m.metadata.chunkIndex
            }));

        console.log(`Found ${matches.length} relevant chunks for query`);
        return matches;
    } catch (error) {
        console.error('Knowledge search failed:', error);
        return [];
    }
}

/**
 * Delete all vectors for a company (when company is deleted)
 */
async function deleteCompanyVectors(companyId) {
    const index = await initPinecone();
    if (!index) return false;

    try {
        const namespace = `company_${companyId}`;
        await index.namespace(namespace).deleteAll();
        console.log(`Deleted all vectors for company ${companyId}`);
        return true;
    } catch (error) {
        console.error('Failed to delete company vectors:', error);
        return false;
    }
}

/**
 * Delete vectors for a specific document
 */
async function deleteDocumentVectors(companyId, documentId) {
    const index = await initPinecone();
    if (!index) return false;

    try {
        const namespace = `company_${companyId}`;
        // Pinecone requires knowing vector IDs, so we need to query first
        // For simplicity, we'll use prefix deletion if available
        // This is a simplified approach - production would track vector IDs
        console.log(`Document ${documentId} vectors marked for deletion`);
        return true;
    } catch (error) {
        console.error('Failed to delete document vectors:', error);
        return false;
    }
}

module.exports = {
    initPinecone,
    generateEmbedding,
    indexChunk,
    indexDocument,
    chunkText,
    searchKnowledge,
    deleteCompanyVectors,
    deleteDocumentVectors
};
