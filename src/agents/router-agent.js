/**
 * Router Agent
 * Combines the refiner and classifier functionality into a single agent.
 * Cleans user input and determines intent in one LLM call.
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { cerebrasChat } = require('../utils/llm');

// Router agent state
class RouterState {
    constructor() {
        this.rawQuery = '';
        this.refinedQuery = '';
        this.intent = '';  // 'information' | 'action' | 'unclear'
        this.actionType = '';  // 'booking' | 'complaint' | 'feedback' | null
        this.confidence = 0;
        this.language = 'en';
        this.errors = [];
    }
}

// System prompt for routing
const ROUTER_SYSTEM_PROMPT = `You are a query router for a customer service phone system.

Your job is to:
1. Clean the user's query (fix typos, remove filler words, translate non-English to English)
2. Determine the user's intent

Intent categories:
- "information": User wants to learn something (hours, prices, services, policies, etc.)
- "action": User wants to DO something (book appointment, file complaint, give feedback)
- "unclear": Cannot determine intent, need clarification

If intent is "action", also determine action type:
- "booking": Schedule appointment, reservation, meeting
- "complaint": Report problem, issue, dissatisfaction
- "feedback": Share opinion, suggestion, review

Respond in this exact JSON format:
{
  "refinedQuery": "<cleaned query in English>",
  "intent": "<information|action|unclear>",
  "actionType": "<booking|complaint|feedback|null>",
  "confidence": <0.0-1.0>
}`;

/**
 * Route a user query to determine intent
 */
async function routeQuery(rawQuery, conversationHistory = []) {
    try {
        // Build context from history
        let historyContext = '';
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-5);
            historyContext = '\n\nRecent conversation:\n' +
                recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        }

        const messages = [
            { role: 'system', content: ROUTER_SYSTEM_PROMPT },
            { role: 'user', content: `Route this query: "${rawQuery}"${historyContext}` }
        ];

        const response = await cerebrasChat(messages, {
            temperature: 0.2,
            maxTokens: 256
        });

        // Parse JSON response
        const responseText = response.choices?.[0]?.text || response;
        let result;

        try {
            // Extract JSON from response (handle potential text wrapping)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse router response:', responseText);
            // Fallback - assume information request
            result = {
                refinedQuery: rawQuery,
                intent: 'information',
                actionType: null,
                confidence: 0.5
            };
        }

        return {
            refinedQuery: result.refinedQuery || rawQuery,
            intent: result.intent || 'information',
            actionType: result.actionType || null,
            confidence: result.confidence || 0.5,
            errors: []
        };

    } catch (error) {
        console.error('Router agent error:', error);
        return {
            refinedQuery: rawQuery,
            intent: 'information',
            actionType: null,
            confidence: 0,
            errors: [`Router error: ${error.message}`]
        };
    }
}

/**
 * Create router agent workflow (for LangGraph visualization)
 */
function createRouterWorkflow() {
    const workflow = new StateGraph({
        channels: {
            rawQuery: {},
            refinedQuery: {},
            intent: {},
            actionType: {},
            confidence: {},
            language: {},
            errors: {}
        }
    });

    workflow.addNode('route', async (state) => {
        const result = await routeQuery(state.rawQuery);
        return {
            ...state,
            refinedQuery: result.refinedQuery,
            intent: result.intent,
            actionType: result.actionType,
            confidence: result.confidence,
            errors: result.errors
        };
    });

    workflow.addEdge('route', END);
    workflow.setEntryPoint('route');

    return workflow.compile();
}

module.exports = {
    routeQuery,
    createRouterWorkflow,
    RouterState
};
