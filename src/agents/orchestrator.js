const { StateGraph, END } = require('@langchain/langgraph');
const { RunnableSequence } = require('@langchain/core/runnables');

// Import all the agent modules
const { refineQuery } = require('./refiner');
const { classifyIntent } = require('./classifier');
const { handleEnquiry } = require('./enquiry-agent');
const { handleComplaint } = require('./complaint-agent');
const { handleBooking } = require('./booking-agent');
const { handleFeedback } = require('./feedback-agent');
const { validateResponse } = require('./validator');

// Import conversation utilities
const conversationUtils = require('../utils/conversation');

// Define the state type for the orchestrator graph
class OrchestratorState {
  constructor() {
    this.originalQuery = '';
    this.refinedQuery = '';
    this.category = '';
    this.response = '';
    this.isValid = false;
    this.validationFeedback = '';
    this.conversationId = null;
    this.conversationHistory = [];
    this.retries = 0;
    this.maxRetries = 2;
    this.completed = false;
    this.errors = [];
  }
}

// Create the main orchestrator agent using LangGraph
function createOrchestratorAgent() {
  // Create a new state graph
  const workflow = new StateGraph({
    channels: {
      originalQuery: {},
      refinedQuery: {},
      category: {},
      response: {},
      isValid: {},
      validationFeedback: {},
      conversationId: {},
      conversationHistory: {},
      retries: {},
      maxRetries: {},
      completed: {},
      errors: {},
    }
  });

  // Define nodes for each step in the process
  
  // 1. Refiner node
  workflow.addNode('refiner', async (state) => {
    try {
      const refinedQuery = await refineQuery(state.originalQuery);
      return {
        ...state,
        refinedQuery
      };
    } catch (error) {
      return {
        ...state,
        refinedQuery: state.originalQuery, // Fall back to original
        errors: [...state.errors, `Refiner error: ${error.message}`]
      };
    }
  });

  // 2. Classifier node
  workflow.addNode('classifier', async (state) => {
    try {
      const category = await classifyIntent(state.refinedQuery, state.conversationHistory);
      return {
        ...state,
        category
      };
    } catch (error) {
      return {
        ...state,
        category: 'enquiry', // Default to enquiry in case of error
        errors: [...state.errors, `Classifier error: ${error.message}`]
      };
    }
  });

  // 3. Category handler nodes
  workflow.addNode('enquiry_handler', async (state) => {
    try {
      const result = await handleEnquiry(state.refinedQuery, state.conversationHistory);
      return {
        ...state,
        response: result.response,
        errors: [...state.errors, ...result.errors]
      };
    } catch (error) {
      return {
        ...state,
        response: 'I apologize, but I encountered an issue while processing your enquiry. Could you please try again?',
        errors: [...state.errors, `Enquiry handler error: ${error.message}`]
      };
    }
  });

  workflow.addNode('complaint_handler', async (state) => {
    try {
      const result = await handleComplaint(state.refinedQuery, state.conversationHistory);
      return {
        ...state,
        response: result.response,
        errors: [...state.errors, ...result.errors]
      };
    } catch (error) {
      return {
        ...state,
        response: 'I apologize, but I encountered an issue while processing your complaint. Could you please try again?',
        errors: [...state.errors, `Complaint handler error: ${error.message}`]
      };
    }
  });

  workflow.addNode('booking_handler', async (state) => {
    try {
      const result = await handleBooking(state.refinedQuery, state.conversationHistory);
      return {
        ...state,
        response: result.response,
        errors: [...state.errors, ...result.errors]
      };
    } catch (error) {
      return {
        ...state,
        response: 'I apologize, but I encountered an issue while processing your booking request. Could you please try again?',
        errors: [...state.errors, `Booking handler error: ${error.message}`]
      };
    }
  });

  workflow.addNode('feedback_handler', async (state) => {
    try {
      const result = await handleFeedback(state.refinedQuery, state.conversationHistory);
      return {
        ...state,
        response: result.response,
        errors: [...state.errors, ...result.errors]
      };
    } catch (error) {
      return {
        ...state,
        response: 'I apologize, but I encountered an issue while processing your feedback. Could you please try again?',
        errors: [...state.errors, `Feedback handler error: ${error.message}`]
      };
    }
  });

  // 4. Validator node
  workflow.addNode('validator', async (state) => {
    try {
      const validationResult = await validateResponse(state.refinedQuery, state.response);
      return {
        ...state,
        isValid: validationResult.isValid,
        validationFeedback: validationResult.feedback || ''
      };
    } catch (error) {
      return {
        ...state,
        isValid: true, // Default to valid in case of validation error
        errors: [...state.errors, `Validator error: ${error.message}`]
      };
    }
  });

  // 5. Response storage node
  workflow.addNode('store_response', async (state) => {
    if (state.conversationId) {
      try {
        // Store the response in the conversation history
        await conversationUtils.addMessage(
          state.conversationId,
          state.response,
          'assistant'
        );
      } catch (error) {
        console.error('Error storing response:', error);
      }
    }
    
    return {
      ...state,
      completed: true
    };
  });

  // Define the conditional edges in the graph
  
  // 1. Always go from refiner to classifier
  workflow.addEdge('refiner', 'classifier');
  
  // 2. From classifier to the appropriate handler based on category
  workflow.addConditionalEdges(
    'classifier',
    (state) => {
      // Route to the appropriate handler based on category
      switch (state.category) {
        case 'enquiry': return 'enquiry_handler';
        case 'complaint': return 'complaint_handler';
        case 'booking': return 'booking_handler';
        case 'feedback': return 'feedback_handler';
        default: return 'enquiry_handler'; // Default to enquiry
      }
    }
  );
  
  // 3. From all handlers to validator
  ['enquiry_handler', 'complaint_handler', 'booking_handler', 'feedback_handler'].forEach(handler => {
    workflow.addEdge(handler, 'validator');
  });
  
  // 4. From validator either back to the handler (if invalid) or to store_response (if valid)
  workflow.addConditionalEdges(
    'validator',
    (state) => {
      if (!state.isValid && state.retries < state.maxRetries) {
        // Not valid and still have retries left, go back to the handler
        let handlerNode;
        switch (state.category) {
          case 'enquiry': handlerNode = 'enquiry_handler'; break;
          case 'complaint': handlerNode = 'complaint_handler'; break;
          case 'booking': handlerNode = 'booking_handler'; break;
          case 'feedback': handlerNode = 'feedback_handler'; break;
          default: handlerNode = 'enquiry_handler'; break;
        }
        
        // Increment retry counter
        state.retries += 1;
        
        return handlerNode;
      } else {
        // Either valid or out of retries, proceed to store the response
        return 'store_response';
      }
    }
  );
  
  // 5. From store_response to the end
  workflow.addEdge('store_response', END);
  
  // Set the entrypoint
  workflow.setEntryPoint('refiner');

  // Create the runnable graph
  return workflow.compile();
}

// Function to process a user query through the agent graph
async function processQuery(query, conversationId, conversationHistory = []) {
  const orchestratorAgent = createOrchestratorAgent();
  const initialState = new OrchestratorState();
  initialState.originalQuery = query;
  initialState.conversationId = conversationId;
  initialState.conversationHistory = conversationHistory;
  
  const result = await orchestratorAgent.invoke(initialState);
  
  return {
    refinedQuery: result.refinedQuery,
    category: result.category,
    response: result.response,
    isValid: result.isValid,
    errors: result.errors,
    completed: result.completed
  };
}

module.exports = {
  processQuery,
  createOrchestratorAgent
}; 