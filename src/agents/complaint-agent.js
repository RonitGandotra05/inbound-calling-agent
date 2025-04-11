const { StructuredTool } = require('langchain/tools');
const { BaseCategoryAgent } = require('./base-agent');
const { registerComplaint } = require('../utils/db-operations');
const companyConfig = require('../config/company');

// Function to get available services - REMOVE CACHE CALL
function getAvailableServices() {
  // Remove the problematic cache call
  // const cachedServices = agentPreloader.getCachedServices();
  // if (cachedServices && cachedServices.length > 0) {
  //   return cachedServices.join(", ");
  // }
  
  // Fallback or alternative logic needed here if services are required
  // For now, return a placeholder or fetch directly if necessary
  console.warn('Complaint Agent: getAvailableServices needs implementation if services are required dynamically.');
  return "IT Support, Software Development, Network Management, Cloud Solutions, Cybersecurity, AI Agents development"; // Placeholder from config
}

// Define the system prompt generator function
async function generateComplaintSystemPrompt() {
  const availableServices = await getAvailableServices();
  
  return `You are a complaint handling agent for ${companyConfig.name}, responsible for registering customer complaints.
Your task is to help users register their complaints effectively by collecting all necessary details.

When responding to a complaint:
1. Be empathetic and understanding of the customer's frustration.
2. Collect the customer's name.
3. Confirm their phone number (which you already have from the call).
4. Ask which service they're having issues with (options: ${availableServices.join(', ')}).
5. Listen to their complaint and ask clarifying questions if needed.
6. Summarize the complaint to ensure you've understood correctly.
7. Register the complaint using the register_complaint tool.
8. Provide the customer with their complaint ID for future reference.
9. Assure them that their complaint will be addressed within 48 hours.

Be professional, patient, and genuinely concerned about resolving their issue.`;
}

// Create the ComplaintAgent class
class ComplaintAgent extends BaseCategoryAgent {
  constructor() {
    // Initialize with temporary prompt, will be updated in init
    super('complaint', '');
    this.initAgent();
  }
  
  async initAgent() {
    // Update the system prompt with available services
    this.systemPrompt = await generateComplaintSystemPrompt();
    
    // Add complaint-specific tools
    this.addTool(new StructuredTool({
      name: 'register_complaint',
      description: 'Registers a complaint in the system',
      schema: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'The name of the customer'
          },
          phoneNumber: {
            type: 'string',
            description: 'The customer\'s phone number'
          },
          service: {
            type: 'string',
            description: 'The service associated with the complaint'
          },
          transcript: {
            type: 'string',
            description: 'The full complaint transcript'
          },
          summary: {
            type: 'string',
            description: 'A concise summary of the complaint'
          }
        },
        required: ['customerName', 'phoneNumber', 'service', 'summary'],
      },
      func: async ({ customerName, phoneNumber, service, transcript, summary }) => {
        try {
          // Register the complaint in the database
          const complaint = await registerComplaint({
            customerName,
            phoneNumber,
            service,
            transcript,
            summary
          });
          
          return JSON.stringify({
            success: true,
            complaintId: complaint.complaint_id,
            message: 'Complaint registered successfully. We will address this within 48 hours.',
            details: {
              name: complaint.customer_name,
              service: complaint.service,
              date: complaint.date_of_complaint
            }
          });
        } catch (error) {
          console.error('Error registering complaint:', error);
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

// Create a singleton instance of the complaint agent
const complaintAgent = new ComplaintAgent();

// Export the agent and a function to run it
module.exports = {
  ComplaintAgent,
  complaintAgent,
  handleComplaint: async (query, conversationData = {}) => {
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
    return await complaintAgent.run(query, conversationHistory);
  }
}; 