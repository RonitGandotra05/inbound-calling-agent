const { StateGraph, END } = require('@langchain/langgraph');
const { RunnableSequence } = require('@langchain/core/runnables');
const { StructuredTool } = require('langchain/tools');
const { cerebrasChat } = require('../utils/llm');

// Define the system prompt for the validator agent
const VALIDATOR_SYSTEM_PROMPT = `You are a response validation agent responsible for ensuring that responses address user queries accurately.
Your task is to compare the user's original query with the response from another agent and determine if the response is relevant and helpful.

When evaluating responses:
1. Check if the response directly addresses the user's question or request.
2. Verify that all parts of the query are addressed in the response.
3. Ensure the response is helpful, accurate, and complete.
4. If the response is satisfactory, indicate that it's valid.
5. If the response is not satisfactory, explain why it falls short and what needs to be improved.

Respond with a JSON object with the following structure:
{
  "isValid": true/false,
  "feedback": "Only provide feedback if isValid is false, explaining why the response is inadequate."
}`;

// Define the state type for the validator graph
class ValidatorState {
  constructor() {
    this.originalQuery = '';
    this.response = '';
    this.isValid = false;
    this.feedback = '';
    this.errors = [];
  }
}

// Create the validator tool to check response quality
const validateResponseTool = new StructuredTool({
  name: 'validate_response',
  description: 'Validates if a response adequately addresses the original query',
  schema: {
    type: 'object',
    properties: {
      originalQuery: {
        type: 'string',
        description: 'The original user query',
      },
      response: {
        type: 'string',
        description: 'The response to validate',
      }
    },
    required: ['originalQuery', 'response'],
  },
  func: async ({ originalQuery, response }) => {
    try {
      // Use Cerebras LLM to validate the response
      const messages = [
        { role: 'system', content: VALIDATOR_SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Original Query: "${originalQuery}"\n\nResponse: "${response}"\n\nPlease validate this response.` 
        }
      ];
      
      const result = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      // Extract the JSON result
      const responseText = result.choices[0].text.trim();
      let validationResult;
      
      try {
        // Try to parse JSON from the response
        validationResult = JSON.parse(responseText);
      } catch (parseError) {
        // If not valid JSON, make a best effort to extract validation info
        const isValid = responseText.toLowerCase().includes('valid') && 
                       !responseText.toLowerCase().includes('not valid') &&
                       !responseText.toLowerCase().includes('invalid');
        
        validationResult = {
          isValid,
          feedback: isValid ? '' : 'The response does not adequately address the query.'
        };
      }
      
      return validationResult;
    } catch (error) {
      console.error('Error validating response:', error);
      // Default to valid in case of errors to prevent blocking the flow
      return {
        isValid: true,
        feedback: ''
      };
    }
  }
});

// Create the validator agent using LangGraph
function createValidatorAgent() {
  // Create a new state graph
  const workflow = new StateGraph({
    channels: {
      originalQuery: {},
      response: {},
      isValid: {},
      feedback: {},
      errors: {},
    }
  });

  // Define the validation node
  workflow.addNode('validator', async (state) => {
    try {
      const validationResult = await validateResponseTool.invoke({
        originalQuery: state.originalQuery,
        response: state.response
      });
      
      return {
        ...state,
        isValid: validationResult.isValid,
        feedback: validationResult.feedback || ''
      };
    } catch (error) {
      return {
        ...state,
        isValid: true, // Default to valid in case of errors
        errors: [...state.errors, `Validator error: ${error.message}`]
      };
    }
  });

  // Define the edges
  workflow.addEdge('validator', END);
  workflow.setEntryPoint('validator');

  // Create the runnable graph
  return workflow.compile();
}

// Function to run the validator agent with a query and response
async function validateResponse(originalQuery, response) {
  const validatorAgent = createValidatorAgent();
  const initialState = new ValidatorState();
  initialState.originalQuery = originalQuery;
  initialState.response = response;
  
  const result = await validatorAgent.invoke(initialState);
  return {
    isValid: result.isValid,
    feedback: result.feedback
  };
}

module.exports = {
  validateResponse,
  createValidatorAgent
}; 