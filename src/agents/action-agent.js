/**
 * Action Agent
 * Unified agent for handling all action-based interactions:
 * - Bookings (appointments, reservations)
 * - Complaints (issues, problems)
 * - Feedback (opinions, suggestions)
 * 
 * Uses flexible JSONB schema to store type-specific data.
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { cerebrasChat } = require('../utils/llm');
const { query } = require('../lib/db');
const { generateCompanyContext } = require('../config/company-config');

// Action agent state
class ActionState {
    constructor() {
        this.query = '';
        this.actionType = '';  // booking | complaint | feedback
        this.companyId = '';
        this.companyContext = null;
        this.customerPhone = '';
        this.conversationHistory = [];
        this.collectedData = {};
        this.isComplete = false;
        this.response = '';
        this.interactionId = null;
        this.errors = [];
    }
}

// Field requirements per action type
const ACTION_SCHEMAS = {
    booking: {
        required: ['customerName', 'serviceId', 'preferredDate', 'preferredTime'],
        optional: ['notes'],
        prompts: {
            customerName: "May I have your name for the booking?",
            serviceId: "Which service would you like to book?",
            preferredDate: "What date works best for you?",
            preferredTime: "What time would you prefer?"
        }
    },
    complaint: {
        required: ['customerName', 'issueDescription'],
        optional: ['serviceId', 'urgency'],
        prompts: {
            customerName: "May I have your name?",
            issueDescription: "Please describe the issue you're experiencing.",
            urgency: "How urgent is this issue? (low, medium, high)"
        }
    },
    feedback: {
        required: ['customerName', 'feedbackContent'],
        optional: ['serviceId', 'rating'],
        prompts: {
            customerName: "May I have your name?",
            feedbackContent: "What feedback would you like to share with us?",
            rating: "On a scale of 1-5, how would you rate your experience?"
        }
    }
};

/**
 * Generate system prompt for action agent
 */
function generateActionPrompt(actionType, companyContext, collectedData, schema) {
    const typeLabels = {
        booking: 'appointment booking',
        complaint: 'complaint registration',
        feedback: 'feedback collection'
    };

    const missingFields = schema.required.filter(f => !collectedData[f]);

    return `You are handling a ${typeLabels[actionType]} for ${companyContext.companyName}.

SERVICES AVAILABLE: ${companyContext.services}
BUSINESS HOURS: ${companyContext.businessHours}

ALREADY COLLECTED:
${Object.entries(collectedData).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none yet)'}

STILL NEEDED:
${missingFields.map(f => `- ${f}`).join('\n') || '(all required info collected!)'}

YOUR TASK:
${missingFields.length > 0
            ? `Ask for the next missing piece of information naturally. Focus on: ${missingFields[0]}`
            : `Confirm all details with the customer and let them know you're processing their ${actionType}.`
        }

Be conversational, professional, and efficient. Keep responses appropriate for phone.`;
}

/**
 * Handle an action request (booking, complaint, feedback)
 */
async function handleAction(
    query,
    actionType,
    companyId,
    companyContext,
    customerPhone,
    conversationHistory = [],
    existingData = {}
) {
    try {
        const schema = ACTION_SCHEMAS[actionType];
        if (!schema) {
            throw new Error(`Unknown action type: ${actionType}`);
        }

        // Step 1: Extract any data from the current query
        const extractedData = await extractDataFromQuery(query, actionType, existingData);
        const collectedData = { ...existingData, ...extractedData };

        // Step 2: Check if we have all required fields
        const missingFields = schema.required.filter(f => !collectedData[f]);
        const isComplete = missingFields.length === 0;

        // Step 3: Generate response
        const systemPrompt = generateActionPrompt(actionType, companyContext, collectedData, schema);

        let historyText = '';
        if (conversationHistory.length > 0) {
            historyText = '\n\nCONVERSATION:\n' +
                conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Customer said: "${query}"${historyText}` }
        ];

        const llmResponse = await cerebrasChat(messages, {
            temperature: 0.7,
            maxTokens: 256
        });

        const responseText = (llmResponse.choices?.[0]?.text || llmResponse).trim();

        // Step 4: If complete, save to database
        let interactionId = null;
        if (isComplete) {
            interactionId = await saveInteraction(companyId, actionType, customerPhone, collectedData);
        }

        return {
            response: responseText,
            collectedData,
            isComplete,
            interactionId,
            errors: []
        };

    } catch (error) {
        console.error('Action agent error:', error);
        return {
            response: "I apologize, but I'm having trouble processing that. Could you please repeat?",
            collectedData: existingData,
            isComplete: false,
            interactionId: null,
            errors: [`Action error: ${error.message}`]
        };
    }
}

/**
 * Extract structured data from natural language query
 */
async function extractDataFromQuery(queryText, actionType, existingData) {
    const extractPrompt = `Extract structured data from this customer message for a ${actionType}.

Message: "${queryText}"

Already known: ${JSON.stringify(existingData)}

Extract any new information. Return JSON only:
{
  "customerName": "<name or null>",
  "serviceId": "<service name mentioned or null>",
  "preferredDate": "<date or null>",
  "preferredTime": "<time or null>",
  "issueDescription": "<issue description or null>",
  "feedbackContent": "<feedback or null>",
  "rating": <1-5 or null>,
  "urgency": "<low|medium|high or null>",
  "notes": "<any additional notes or null>"
}

Only include fields with actual values extracted, use null for missing.`;

    try {
        const response = await cerebrasChat([
            { role: 'system', content: 'You extract structured data from text. Respond with JSON only.' },
            { role: 'user', content: extractPrompt }
        ], { temperature: 0.1, maxTokens: 256 });

        const text = response.choices?.[0]?.text || response;
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            // Filter out null values
            return Object.fromEntries(
                Object.entries(extracted).filter(([_, v]) => v !== null && v !== undefined)
            );
        }
    } catch (error) {
        console.warn('Data extraction failed:', error.message);
    }

    return {};
}

/**
 * Save completed interaction to database
 */
async function saveInteraction(companyId, type, customerPhone, data) {
    try {
        const result = await query(
            `INSERT INTO interactions (
        company_id, type, customer_name, customer_phone, data, summary
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
            [
                companyId,
                type,
                data.customerName || 'Unknown',
                customerPhone,
                JSON.stringify(data),
                generateSummary(type, data)
            ]
        );

        console.log(`Created ${type} interaction:`, result.rows[0].id);
        return result.rows[0].id;
    } catch (error) {
        console.error('Failed to save interaction:', error);
        throw error;
    }
}

/**
 * Generate a summary of the interaction
 */
function generateSummary(type, data) {
    switch (type) {
        case 'booking':
            return `Booking for ${data.serviceId} on ${data.preferredDate} at ${data.preferredTime}`;
        case 'complaint':
            return `Issue: ${data.issueDescription?.substring(0, 100)}...`;
        case 'feedback':
            return `Feedback${data.rating ? ` (${data.rating}/5)` : ''}: ${data.feedbackContent?.substring(0, 100)}...`;
        default:
            return `${type} from ${data.customerName}`;
    }
}

/**
 * Create action agent workflow
 */
function createActionWorkflow() {
    const workflow = new StateGraph({
        channels: {
            query: {},
            actionType: {},
            companyId: {},
            companyContext: {},
            customerPhone: {},
            conversationHistory: {},
            collectedData: {},
            isComplete: {},
            response: {},
            interactionId: {},
            errors: {}
        }
    });

    workflow.addNode('process_action', async (state) => {
        const result = await handleAction(
            state.query,
            state.actionType,
            state.companyId,
            state.companyContext,
            state.customerPhone,
            state.conversationHistory,
            state.collectedData
        );

        return {
            ...state,
            response: result.response,
            collectedData: result.collectedData,
            isComplete: result.isComplete,
            interactionId: result.interactionId,
            errors: [...state.errors, ...result.errors]
        };
    });

    workflow.addEdge('process_action', END);
    workflow.setEntryPoint('process_action');

    return workflow.compile();
}

module.exports = {
    handleAction,
    createActionWorkflow,
    ActionState,
    ACTION_SCHEMAS
};
