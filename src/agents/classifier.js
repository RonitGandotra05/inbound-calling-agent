const { StateGraph, END } = require('@langchain/langgraph');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StructuredTool } = require('langchain/tools');
const { cerebrasChat } = require('../utils/llm');

// Define the system prompt for the classifier agent
const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier agent that categorizes user queries.
Your task is to analyze the user's query and classify it into one of the following categories:
1. enquiry - General questions or information requests
2. complaint - Issues, problems, or dissatisfaction
3. booking - Scheduling, reservations, or appointments
4. feedback - Comments, suggestions, or opinions

Based on the query content and conversation history, determine the most appropriate category.
Respond with ONLY the category name (e.g., "enquiry", "complaint", "booking", or "feedback").`;

// Define the state type for the classifier graph
class ClassifierState {
  constructor() {
    this.query = '';
    this.conversationHistory = [];
    this.category = '';
    this.errors = [];
  }
}

// Create the classifier tool to categorize queries
const classifyTool = new StructuredTool({
  name: 'classify_intent',
  description: 'Classifies the intent of a user query',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The refined user query',
      },
      conversationHistory: {
        type: 'array',
        description: 'Recent conversation history for context',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    },
    required: ['query'],
  },
  func: async ({ query, conversationHistory = [] }) => {
    try {
      // Format conversation history for context
      let historyText = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyText = '\n\nRecent conversation history:\n' + 
          conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      }
      
      // Use Cerebras LLM to classify the query
      const messages = [
        { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Classify this query: "${query}"${historyText}` 
        }
      ];
      
      const response = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 256
      });
      
      // Extract the category from the response
      const category = response.choices[0].text.trim().toLowerCase();
      
      // Validate that the category is one of the expected values
      const validCategories = ['enquiry', 'complaint', 'booking', 'feedback'];
      if (!validCategories.includes(category)) {
        return 'enquiry'; // Default to enquiry if invalid category
      }
      
      return category;
    } catch (error) {
      console.error('Error classifying query:', error);
      return 'enquiry'; // Default to enquiry in case of error
    }
  }
});

// Create the classifier agent using LangGraph
function createClassifierAgent() {
  // Create a new state graph
  const workflow = new StateGraph({
    channels: {
      query: {},
      conversationHistory: {},
      category: {},
      errors: {},
    }
  });

  // Define the classification node
  workflow.addNode('classifier', async (state) => {
    try {
      const category = await classifyTool.invoke({
        query: state.query,
        conversationHistory: state.conversationHistory
      });
      
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

  // Define the edges
  workflow.addEdge('classifier', END);
  workflow.setEntryPoint('classifier');

  // Create the runnable graph
  return workflow.compile();
}

// Function to run the classifier agent with a query and history
async function classifyIntent(query, conversationHistory = []) {
  const classifierAgent = createClassifierAgent();
  const initialState = new ClassifierState();
  initialState.query = query;
  initialState.conversationHistory = conversationHistory;
  
  const result = await classifierAgent.invoke(initialState);
  return result.category || 'enquiry'; // Default to enquiry if classification fails
}

module.exports = {
  classifyIntent,
  createClassifierAgent
}; 