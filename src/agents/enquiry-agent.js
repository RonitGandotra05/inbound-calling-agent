const { StructuredTool } = require('langchain/tools');
const { BaseCategoryAgent } = require('./base-agent');
const db = require('../lib/db');

// Define the system prompt for the enquiry agent
const ENQUIRY_SYSTEM_PROMPT = `You are an enquiry agent responsible for answering general information requests.
Your task is to provide helpful, accurate, and concise responses to user queries.
Use the available tools to fetch information from the database when needed.
Focus on being informative and addressing the user's question directly.

When responding:
1. If the query requires database information, use the execute_sql_query tool.
2. Provide clear and concise answers based on the available information.
3. If you cannot find the answer, acknowledge that and suggest alternative ways to get the information.`;

// Create the EnquiryAgent class
class EnquiryAgent extends BaseCategoryAgent {
  constructor() {
    super('enquiry', ENQUIRY_SYSTEM_PROMPT);
    
    // Add enquiry-specific tools
    this.addTool(new StructuredTool({
      name: 'fetch_faqs',
      description: 'Fetches frequently asked questions and their answers',
      schema: {
        type: 'object',
        properties: {},
        required: [],
      },
      func: async () => {
        try {
          // This is a mock function - in a real implementation, we would fetch from the database
          return JSON.stringify([
            { question: 'What are your business hours?', answer: 'Our business hours are Monday-Friday, 9 AM to 5 PM.' },
            { question: 'How do I contact customer support?', answer: 'You can contact customer support at support@example.com or call 1-800-123-4567.' },
            { question: 'Do you offer refunds?', answer: 'Yes, we offer refunds within 30 days of purchase with a valid receipt.' }
          ]);
        } catch (error) {
          console.error('Error fetching FAQs:', error);
          return 'Error fetching FAQs';
        }
      }
    }));
  }
}

// Create a singleton instance of the enquiry agent
const enquiryAgent = new EnquiryAgent();

// Export the agent and a function to run it
module.exports = {
  EnquiryAgent,
  enquiryAgent,
  handleEnquiry: async (query, conversationHistory = []) => {
    return await enquiryAgent.run(query, conversationHistory);
  }
}; 