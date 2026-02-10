/**
 * New Orchestrator
 * Simplified orchestration using 3 core agents:
 * - Router Agent: Clean query + determine intent
 * - Conversation Agent: RAG-powered Q&A
 * - Action Agent: Handle bookings/complaints/feedback
 */

const { StateGraph, END } = require('@langchain/langgraph');
const { routeQuery } = require('./router-agent');
const { handleInformationQuery } = require('./conversation-agent');
const { handleAction } = require('./action-agent');
const { getCompanyByPhone, generateCompanyContext } = require('../config/company-config');
const { query } = require('../lib/db');

// Main orchestrator state
class OrchestratorState {
  constructor() {
    this.originalQuery = '';
    this.refinedQuery = '';
    this.intent = '';
    this.actionType = null;
    this.response = '';
    this.companyId = '';
    this.companyContext = null;
    this.customerPhone = '';
    this.conversationHistory = [];
    this.actionData = {};
    this.isActionComplete = false;
    this.callId = null;
    this.errors = [];
  }
}

/**
 * Process a customer query through the agent system
 * @param {string} query - Customer's spoken query
 * @param {string} twilioNumber - The Twilio number that received the call
 * @param {string} customerPhone - Customer's phone number
 * @param {Array} conversationHistory - Previous messages in this call
 * @param {Object} actionData - Previously collected action data (for multi-turn)
 */
async function processQuery(
  queryText,
  twilioNumber,
  customerPhone,
  conversationHistory = [],
  actionData = {}
) {
  const startTime = Date.now();

  try {
    // Step 1: Get company config from Twilio number
    const company = await getCompanyByPhone(twilioNumber);

    if (!company) {
      console.warn(`No company found for Twilio number: ${twilioNumber}`);
      return {
        response: "I apologize, but this number is not configured. Please try again later.",
        intent: 'error',
        errors: ['Company not found for phone number']
      };
    }

    const companyContext = generateCompanyContext(company);

    // Step 2: Route the query
    const routeResult = await routeQuery(queryText, conversationHistory);

    const { refinedQuery, intent, actionType } = routeResult;

    console.log(`[Orchestrator] Intent: ${intent}, Action: ${actionType || 'N/A'}`);

    let response = '';
    let isActionComplete = false;
    let updatedActionData = actionData;
    let interactionId = null;

    // Step 3: Handle based on intent
    if (intent === 'information' || intent === 'unclear') {
      // Use conversation agent for information queries
      const conversationResult = await handleInformationQuery(
        refinedQuery,
        company.id,
        companyContext,
        conversationHistory
      );
      response = conversationResult.response;

    } else if (intent === 'action' && actionType) {
      // Use action agent for bookings/complaints/feedback
      const actionResult = await handleAction(
        refinedQuery,
        actionType,
        company.id,
        companyContext,
        customerPhone,
        conversationHistory,
        actionData
      );

      response = actionResult.response;
      updatedActionData = actionResult.collectedData;
      isActionComplete = actionResult.isComplete;
      interactionId = actionResult.interactionId;

    } else {
      // Fallback
      response = companyContext.fallbackMessage ||
        "I'm not sure I understood that. Could you please rephrase?";
    }

    const duration = Date.now() - startTime;
    console.log(`[Orchestrator] Processed in ${duration}ms`);

    return {
      response,
      refinedQuery,
      intent,
      actionType,
      actionData: updatedActionData,
      isActionComplete,
      interactionId,
      companyId: company.id,
      companyName: company.name,
      errors: routeResult.errors || []
    };

  } catch (error) {
    console.error('Orchestrator error:', error);
    return {
      response: "I apologize, but I'm experiencing technical difficulties. Please try again.",
      intent: 'error',
      errors: [`Orchestrator error: ${error.message}`]
    };
  }
}

/**
 * Create the orchestrator workflow for LangGraph visualization
 */
function createOrchestratorWorkflow() {
  const workflow = new StateGraph({
    channels: {
      originalQuery: {},
      refinedQuery: {},
      intent: {},
      actionType: {},
      response: {},
      companyId: {},
      companyContext: {},
      customerPhone: {},
      conversationHistory: {},
      actionData: {},
      isActionComplete: {},
      callId: {},
      errors: {}
    }
  });

  // Node: Route query
  workflow.addNode('router', async (state) => {
    const result = await routeQuery(state.originalQuery, state.conversationHistory);
    return {
      ...state,
      refinedQuery: result.refinedQuery,
      intent: result.intent,
      actionType: result.actionType,
      errors: [...state.errors, ...result.errors]
    };
  });

  // Node: Handle information queries
  workflow.addNode('conversation', async (state) => {
    const result = await handleInformationQuery(
      state.refinedQuery,
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

  // Node: Handle action queries
  workflow.addNode('action', async (state) => {
    const result = await handleAction(
      state.refinedQuery,
      state.actionType,
      state.companyId,
      state.companyContext,
      state.customerPhone,
      state.conversationHistory,
      state.actionData
    );
    return {
      ...state,
      response: result.response,
      actionData: result.collectedData,
      isActionComplete: result.isComplete,
      errors: [...state.errors, ...result.errors]
    };
  });

  // Conditional routing from router
  workflow.addConditionalEdges(
    'router',
    (state) => {
      if (state.intent === 'action' && state.actionType) {
        return 'action';
      }
      return 'conversation';
    }
  );

  // Both conversation and action go to END
  workflow.addEdge('conversation', END);
  workflow.addEdge('action', END);

  // Entry point
  workflow.setEntryPoint('router');

  return workflow.compile();
}

/**
 * Get the initial greeting for a company
 */
async function getGreeting(twilioNumber) {
  const company = await getCompanyByPhone(twilioNumber);

  if (!company) {
    return "Hello, thank you for calling. How may I assist you today?";
  }

  return company.greeting || `Hello, thank you for calling ${company.name}. How may I assist you today?`;
}

module.exports = {
  processQuery,
  createOrchestratorWorkflow,
  getGreeting,
  OrchestratorState
};