const { StateGraph, END } = require('@langchain/langgraph');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StructuredTool } = require('langchain/tools');
const { cerebrasChat } = require('../utils/llm');

// Define the system prompt for the refiner agent
const REFINER_SYSTEM_PROMPT = `You are a refiner agent responsible for cleaning and preparing user queries.
Your tasks:
1. Prevent SQL injections by removing any SQL-like commands
2. Exclude irrelevant demands or questions
3. Correct typos and grammar issues
4. Handle language barriers by translating non-English queries to English

Output the refined query without additional explanation.`;

// Define the state type for the refiner graph
class RefinerState {
  constructor() {
    this.query = '';
    this.refinedQuery = '';
    this.errors = [];
  }
}

// Create the refiner tool to clean and process user queries
const refineTool = new StructuredTool({
  name: 'refine_query',
  description: 'Refines and cleans the user query',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The user query to refine',
      },
    },
    required: ['query'],
  },
  func: async ({ query }) => {
    try {
      // Use Cerebras LLM to refine the query
      const messages = [
        { role: 'system', content: REFINER_SYSTEM_PROMPT },
        { role: 'user', content: `Refine this query: "${query}"` }
      ];
      
      const response = await cerebrasChat(messages, {
        temperature: 0.3, // Lower temperature for more deterministic results
        maxTokens: 512
      });
      
      return response.choices[0].text.trim();
    } catch (error) {
      console.error('Error refining query:', error);
      return `Error refining query: ${error.message}`;
    }
  }
});

// Create the refiner agent using LangGraph
function createRefinerAgent() {
  // Create a new state graph
  const workflow = new StateGraph({
    channels: {
      query: {},
      refinedQuery: {},
      errors: {},
    }
  });

  // Define the refining node
  workflow.addNode('refiner', async (state) => {
    try {
      const refinedQuery = await refineTool.invoke({
        query: state.query
      });
      
      return {
        ...state,
        refinedQuery
      };
    } catch (error) {
      return {
        ...state,
        errors: [...state.errors, `Refiner error: ${error.message}`]
      };
    }
  });

  // Define the edges
  workflow.addEdge('refiner', END);
  workflow.setEntryPoint('refiner');

  // Create the runnable graph
  return workflow.compile();
}

// Function to run the refiner agent with a query
async function refineQuery(query) {
  const refinerAgent = createRefinerAgent();
  const initialState = new RefinerState();
  initialState.query = query;
  
  const result = await refinerAgent.invoke(initialState);
  return result.refinedQuery || query; // Fall back to the original query if refinement fails
}

module.exports = {
  refineQuery,
  createRefinerAgent
}; 