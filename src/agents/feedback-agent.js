const { StructuredTool } = require('langchain/tools');
const { BaseCategoryAgent } = require('./base-agent');
const { recordFeedback } = require('../utils/db-operations');
const companyConfig = require('../config/company');

// Helper function to get available services - REMOVE CACHE CALL
async function getAvailableServices() {
  // Remove the problematic cache call
  // const cachedServices = agentPreloader.getCachedServices();
  // if (cachedServices && cachedServices.length > 0) {
  //   return cachedServices;
  // }
  
  // Fall back to company config services
  // This agent might not need dynamic DB services like inquiry/complaint might
  console.warn('Feedback Agent: Using static services from config.');
  return companyConfig.services;
}

// Define the system prompt generator function
async function generateFeedbackSystemPrompt() {
  const availableServices = await getAvailableServices();
  
  return `You are a feedback collection agent for ${companyConfig.name}, responsible for gathering customer feedback.
Your task is to collect detailed feedback about our services to help us improve.

When collecting feedback:
1. Be friendly and appreciative of the customer's time.
2. Collect the customer's name.
3. Confirm their phone number (which you already have from the call).
4. Ask which service they're providing feedback for (options: ${availableServices.join(', ')}).
5. Ask open-ended questions about their experience.
6. Ask for specific suggestions for improvement.
7. Summarize their feedback to ensure you've captured it correctly.
8. Record the feedback using the record_feedback tool.
9. Thank them for their valuable input.

Be engaging, non-defensive, and genuinely interested in their thoughts and experiences.`;
}

// Create the FeedbackAgent class
class FeedbackAgent extends BaseCategoryAgent {
  constructor() {
    // Initialize with temporary prompt, will be updated in init
    super('feedback', '');
    this.initAgent();
  }
  
  async initAgent() {
    // Update the system prompt with available services
    this.systemPrompt = await generateFeedbackSystemPrompt();
    
    // Add feedback-specific tools
    this.addTool(new StructuredTool({
      name: 'record_feedback',
      description: 'Records customer feedback in the system',
      schema: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'The name of the customer'
          },
          serviceName: {
            type: 'string',
            description: 'The service the feedback is about'
          },
          phoneNumber: {
            type: 'string',
            description: 'The customer\'s phone number'
          },
          transcript: {
            type: 'string',
            description: 'The full feedback transcript'
          },
          summary: {
            type: 'string',
            description: 'A concise summary of the feedback'
          }
        },
        required: ['customerName', 'serviceName', 'phoneNumber', 'summary'],
      },
      func: async ({ customerName, serviceName, phoneNumber, transcript, summary }) => {
        try {
          // Record the feedback in the database
          const feedback = await recordFeedback({
            customerName,
            serviceName,
            phoneNumber,
            transcript,
            summary
          });
          
          return JSON.stringify({
            success: true,
            feedbackId: feedback.feedback_id,
            message: 'Feedback recorded successfully. Thank you for your input!',
            details: {
              name: feedback.customer_name,
              service: feedback.service_name,
              date: feedback.date_of_feedback
            }
          });
        } catch (error) {
          console.error('Error recording feedback:', error);
          return JSON.stringify({
            success: false,
            error: error.message
          });
        }
      }
    }));
  }
  
  // Override run to ensure agent is initialized
  async run(query, conversationHistory = []) {
    if (!this.systemPrompt) {
      await this.initAgent();
    }
    return super.run(query, conversationHistory);
  }
}

// Create a singleton instance of the feedback agent
const feedbackAgent = new FeedbackAgent();

// Export the agent and a function to run it
module.exports = {
  FeedbackAgent,
  feedbackAgent,
  handleFeedback: async (query, conversationData = {}) => {
    // Extract phone and transcript from conversation data
    const { phoneNumber, transcript } = conversationData;
    
    // Add conversation context to the conversation history
    const conversationHistory = [];
    if (phoneNumber) {
      conversationHistory.push({
        role: 'system',
        content: `Customer phone number: ${phoneNumber}`
      });
    }
    
    // Run the agent with the provided query and context
    return await feedbackAgent.run(query, conversationHistory);
  }
}; 