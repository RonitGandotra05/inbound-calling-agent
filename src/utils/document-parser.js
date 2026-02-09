/**
 * Document Parser
 * Parses various document formats into plain text for indexing.
 * Supports: PDF, TXT, MD, JSON, DOCX
 */

const fs = require('fs').promises;
const path = require('path');

// Dynamic imports for parsers (to handle optional dependencies)
let pdfParse = null;
let mammoth = null;

/**
 * Initialize optional parsers
 */
async function initParsers() {
    try {
        pdfParse = require('pdf-parse');
    } catch (e) {
        console.warn('pdf-parse not installed - PDF parsing disabled');
    }

    try {
        mammoth = require('mammoth');
    } catch (e) {
        console.warn('mammoth not installed - DOCX parsing disabled');
    }
}

// Initialize on module load
initParsers();

/**
 * Parse a document file into plain text
 * @param {string} filePath - Path to the file
 * @param {string} contentType - MIME type or file extension
 * @returns {Promise<{content: string, metadata: Object}>}
 */
async function parseDocument(filePath, contentType) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const type = normalizeContentType(contentType || ext);

    console.log(`Parsing document: ${filePath} (type: ${type})`);

    switch (type) {
        case 'pdf':
            return parsePDF(filePath);
        case 'txt':
        case 'md':
            return parseText(filePath);
        case 'json':
            return parseJSON(filePath);
        case 'docx':
            return parseDOCX(filePath);
        default:
            throw new Error(`Unsupported document type: ${type}`);
    }
}

/**
 * Parse document from buffer (for uploads)
 */
async function parseBuffer(buffer, contentType, filename) {
    const type = normalizeContentType(contentType);

    switch (type) {
        case 'pdf':
            return parsePDFBuffer(buffer);
        case 'txt':
        case 'md':
            return { content: buffer.toString('utf-8'), metadata: { filename } };
        case 'json':
            return parseJSONBuffer(buffer);
        case 'docx':
            return parseDOCXBuffer(buffer);
        default:
            throw new Error(`Unsupported document type: ${type}`);
    }
}

/**
 * Normalize content type to simple extension
 */
function normalizeContentType(contentType) {
    const typeMap = {
        'application/pdf': 'pdf',
        'text/plain': 'txt',
        'text/markdown': 'md',
        'application/json': 'json',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };

    return typeMap[contentType] || contentType.replace(/^\./, '').toLowerCase();
}

/**
 * Parse PDF file
 */
async function parsePDF(filePath) {
    if (!pdfParse) {
        throw new Error('PDF parsing not available - install pdf-parse');
    }

    const dataBuffer = await fs.readFile(filePath);
    return parsePDFBuffer(dataBuffer);
}

async function parsePDFBuffer(buffer) {
    if (!pdfParse) {
        throw new Error('PDF parsing not available - install pdf-parse');
    }

    const data = await pdfParse(buffer);

    return {
        content: cleanText(data.text),
        metadata: {
            pages: data.numpages,
            info: data.info
        }
    };
}

/**
 * Parse plain text file
 */
async function parseText(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
        content: cleanText(content),
        metadata: {}
    };
}

/**
 * Parse JSON file (expects FAQ-like structure)
 */
async function parseJSON(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseJSONBuffer(Buffer.from(content));
}

function parseJSONBuffer(buffer) {
    const data = JSON.parse(buffer.toString('utf-8'));

    // Handle various JSON structures
    let text = '';

    if (Array.isArray(data)) {
        // Array of Q&A pairs or facts
        text = data.map(item => {
            if (item.question && item.answer) {
                return `Q: ${item.question}\nA: ${item.answer}`;
            }
            if (item.title && item.content) {
                return `${item.title}\n${item.content}`;
            }
            if (typeof item === 'string') {
                return item;
            }
            return JSON.stringify(item);
        }).join('\n\n');
    } else if (typeof data === 'object') {
        // Object with sections
        text = Object.entries(data).map(([key, value]) => {
            if (typeof value === 'string') {
                return `${key}: ${value}`;
            }
            if (Array.isArray(value)) {
                return `${key}:\n${value.map(v => `- ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
        }).join('\n\n');
    }

    return {
        content: cleanText(text),
        metadata: { originalFormat: 'json' }
    };
}

/**
 * Parse DOCX file
 */
async function parseDOCX(filePath) {
    if (!mammoth) {
        throw new Error('DOCX parsing not available - install mammoth');
    }

    const result = await mammoth.extractRawText({ path: filePath });
    return {
        content: cleanText(result.value),
        metadata: {
            messages: result.messages
        }
    };
}

async function parseDOCXBuffer(buffer) {
    if (!mammoth) {
        throw new Error('DOCX parsing not available - install mammoth');
    }

    const result = await mammoth.extractRawText({ buffer });
    return {
        content: cleanText(result.value),
        metadata: {
            messages: result.messages
        }
    };
}

/**
 * Clean extracted text
 */
function cleanText(text) {
    return text
        // Normalize whitespace
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        // Remove excessive newlines
        .replace(/\n{3,}/g, '\n\n')
        // Remove excessive spaces
        .replace(/ {2,}/g, ' ')
        // Trim lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
}

/**
 * Get supported file types
 */
function getSupportedTypes() {
    const types = ['txt', 'md', 'json'];

    if (pdfParse) types.push('pdf');
    if (mammoth) types.push('docx');

    return types;
}

module.exports = {
    parseDocument,
    parseBuffer,
    normalizeContentType,
    cleanText,
    getSupportedTypes
};
