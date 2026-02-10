/**
 * Conversation Agent
 * RAG-powered Q&A agent that uses the company's uploaded knowledge base.
 * Retrieves relevant context from Pinecone and generates informed responses.
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { cerebrasChat } = require('../utils/llm');
const { searchKnowledge } = require('../utils/embeddings');
const { generateCompanyContext } = require('../config/company-config');

// Conversation agent state
class ConversationState {
    constructor() {
        this.query = '';
        this.companyId = '';
        this.companyContext = null;
        this.retrievedContext = [];
        this.response = '';
        this.conversationHistory = [];
        this.errors = [];
    }
}

/**
 * Generate system prompt for conversation agent
 */
function generateSystemPrompt(companyContext) {
    return `You are a helpful customer service agent for ${companyContext.companyName}.

COMPANY INFORMATION:
- Services offered: ${companyContext.services}
- Business hours: ${companyContext.businessHours}
- Contact email: ${companyContext.contactEmail}
- Contact phone: ${companyContext.contactPhone}

YOUR ROLE:
- Answer customer questions accurately using the provided knowledge base context
- Be friendly, professional, and concise
- If you're unsure, acknowledge it and offer to connect them with a human
- Keep responses appropriate for phone conversation (spoken, not too long)

IMPORTANT:
- Only provide information that is in the knowledge base or company context
- Don't make up information that isn't provided
- If asked about something not in the knowledge base, say you'll need to check and offer alternatives`;
}

/**
 * Handle an information query using RAG
 */
async function handleInformationQuery(query, companyId, companyContext, conversationHistory = []) {
    try {
        // Step 1: Retrieve relevant context from knowledge base
        let retrievedContext = [];
        try {
            retrievedContext = await searchKnowledge(query, companyId, { topK: 5 });
        } catch (ragError) {
            console.warn('RAG retrieval failed, proceeding without context:', ragError.message);
        }

        // Step 2: Build context for LLM
        const contextText = retrievedContext.length > 0
            ? '\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n' +
            retrievedContext.map((doc, i) => `[${i + 1}] ${doc.content}`).join('\n\n')
            : '\n\n(No specific knowledge base content found for this query)';

        // Step 3: Build conversation history
        let historyText = '';
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6);
            historyText = '\n\nCONVERSATION HISTORY:\n' +
                recentHistory.map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n');
        }

        // Step 4: Generate response
        const systemPrompt = generateSystemPrompt(companyContext);

        const messages = [
            { role: 'system', content: systemPrompt + contextText },
            { role: 'user', content: `Customer query: "${query}"${historyText}\n\nRespond naturally as if speaking on the phone.` }
        ];

        const response = await cerebrasChat(messages, {
            temperature: 0.7,
            maxTokens: 512
        });

        const responseText = response.choices?.[0]?.text || response;

        return {
            response: responseText.trim(),
            retrievedContext,
            errors: []
        };

    } catch (error) {
        console.error('Conversation agent error:', error);
        return {
            response: companyContext.fallbackMessage ||
                "I apologize, but I'm having trouble accessing that information right now. Would you like me to have someone call you back?",
            retrievedContext: [],
            errors: [`Conversation error: ${error.message}`]
        };
    }
}

/**
 * Create conversation agent workflow
 */
function createConversationWorkflow() {
    const workflow = new StateGraph({
        channels: {
            query: {},
            companyId: {},
            companyContext: {},
            retrievedContext: {},
            response: {},
            conversationHistory: {},
            errors: {}
        }
    });

    workflow.addNode('retrieve', async (state) => {
        let retrievedContext = [];
        try {
            retrievedContext = await searchKnowledge(state.query, state.companyId, { topK: 5 });
        } catch (error) {
            console.warn('Retrieval failed:', error.message);
        }
        return { ...state, retrievedContext };
    });

    workflow.addNode('generate', async (state) => {
        const result = await handleInformationQuery(
            state.query,
            state.companyId,
            state.companyContext,
            state.conversationHistory
        );
        return {
            ...state,
            response: result.response,
            errors: [...state.errors, ...result.errors]
        };
    });

    workflow.addEdge('retrieve', 'generate');
    workflow.addEdge('generate', END);
    workflow.setEntryPoint('retrieve');

    return workflow.compile();
}

module.exports = {
    handleInformationQuery,
    createConversationWorkflow,
    ConversationState
};
