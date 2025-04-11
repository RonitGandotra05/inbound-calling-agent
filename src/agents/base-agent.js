const { StateGraph, END } = require('@langchain/langgraph');
const { StructuredTool } = require('langchain/tools');
const { cerebrasChat } = require('../utils/llm');
const db = require('../lib/db');

// Define the base state for all category agents
class BaseCategoryState {
  constructor() {
    this.query = '';
    this.conversationHistory = [];
    this.response = '';
    this.responseValidated = false;
    this.retryFlag = false;
    this.retryFeedback = '';
    this.errors = [];
    this.tools = [];
    this.toolsCalled = [];
    this.toolsResults = [];
  }
}

// Define a base SQL query tool that all agents can use
const executeSqlQueryTool = new StructuredTool({
  name: 'execute_sql_query',
  description: 'Executes a SQL query on the database',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The SQL query to execute',
      }
    },
    required: ['query'],
  },
  func: async ({ query }) => {
    try {
      // First verify that the query is read-only (SELECT)
      if (!query.trim().toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }
      
      const result = await db.query(query, []);
      return JSON.stringify(result.rows);
    } catch (error) {
      console.error('Error executing SQL query:', error);
      return `Error: ${error.message}`;
    }
  }
});

// Base class for creating category-specific agents
class BaseCategoryAgent {
  constructor(category, systemPrompt) {
    this.category = category;
    this.systemPrompt = systemPrompt;
    this.tools = [executeSqlQueryTool];
    this.stateClass = BaseCategoryState;
  }
  
  // Function to process the user query and return a response
  async processTool({ query, conversationHistory = [], tools = [] }) {
    try {
      // Format conversation history for context
      let historyText = '';
      if (conversationHistory && conversationHistory.length > 0) {
        historyText = '\n\nRecent conversation history:\n' + 
          conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      }
      
      // Format available tools
      let toolsText = '';
      if (tools && tools.length > 0) {
        toolsText = '\n\nAvailable tools:\n' + 
          tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
      }
      
      // Use Cerebras LLM to generate a response
      const messages = [
        { role: 'system', content: this.systemPrompt + toolsText },
        { 
          role: 'user', 
          content: `${query}${historyText}` 
        }
      ];
      
      const response = await cerebrasChat(messages, {
        temperature: 0.7,
        maxTokens: 1024
      });
      
      return response.choices[0].text.trim();
    } catch (error) {
      console.error(`Error processing ${this.category} query:`, error);
      return `I apologize, but I'm having trouble processing your request at the moment. Could you please try again?`;
    }
  }
  
  // Create the agent workflow using LangGraph
  createAgentWorkflow() {
    const workflow = new StateGraph({
      channels: {
        query: {},
        conversationHistory: {},
        response: {},
        responseValidated: {},
        retryFlag: {},
        retryFeedback: {},
        errors: {},
        tools: {},
        toolsCalled: {},
        toolsResults: {}
      }
    });

    // Define the processing node
    workflow.addNode(this.category, async (state) => {
      try {
        if (state.retryFlag) {
          // If we're retrying, append the feedback to the query
          state.query = `${state.query}\n\nPrevious attempt feedback: ${state.retryFeedback}`;
        }
        
        const response = await this.processTool({
          query: state.query,
          conversationHistory: state.conversationHistory,
          tools: this.tools
        });
        
        return {
          ...state,
          response,
          retryFlag: false,
          retryFeedback: ''
        };
      } catch (error) {
        return {
          ...state,
          errors: [...state.errors, `${this.category} agent error: ${error.message}`],
          response: `I apologize, but I'm having trouble processing your request at the moment. Could you please try again?`
        };
      }
    });

    // Define the edges
    workflow.addEdge(this.category, END);
    workflow.setEntryPoint(this.category);

    // Create the runnable graph
    return workflow.compile();
  }
  
  // Run the agent with a query and history
  async run(query, conversationHistory = []) {
    const agentWorkflow = this.createAgentWorkflow();
    const initialState = new this.stateClass();
    initialState.query = query;
    initialState.conversationHistory = conversationHistory;
    initialState.tools = this.tools;
    
    const result = await agentWorkflow.invoke(initialState);
    return {
      response: result.response,
      errors: result.errors
    };
  }
  
  // Method to add additional tools to this agent
  addTool(tool) {
    this.tools.push(tool);
    return this;
  }
}

module.exports = {
  BaseCategoryAgent,
  BaseCategoryState,
  executeSqlQueryTool
}; 