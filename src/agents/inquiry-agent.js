const { StructuredTool } = require('langchain/tools');
const { BaseCategoryAgent } = require('./base-agent');
const { createInquiry, getServices } = require('../utils/db-operations');
const companyConfig = require('../config/company');

// Helper function to get available services - REMOVE CACHE CALL
async function getAvailableServices() {
  // Remove the problematic cache call
  // const cachedServices = agentPreloader.getCachedServices();
  // if (cachedServices && cachedServices.length > 0) {
  //   return cachedServices;
  // }
  
  // Fall back to direct fetch
  try {
    const dbServices = await getServices();
    const allServices = new Set([...companyConfig.services, ...dbServices]);
    return Array.from(allServices);
  } catch (error) {
    console.error('Error getting available services:', error);
    // Fallback to config if DB fetch fails
    return companyConfig.services; 
  }
}

// Define the system prompt generator function
async function generateInquirySystemPrompt() {
  const availableServices = await getAvailableServices();
  
  return `You are an inquiry handling agent for ${companyConfig.name}, responsible for providing information about our services.
Your task is to help users learn about our services and record their inquiries.

When responding to an inquiry:
1. Be friendly and informative.
2. Collect the customer's name.
3. Confirm their phone number (which you already have from the call).
4. Identify which service they're interested in (options: ${availableServices.join(', ')}).
5. Provide detailed information about the requested service.
6. Answer any questions they have about features, pricing, or availability.
7. Record the inquiry using the create_inquiry tool.
8. Offer to schedule a follow-up call or booking if they're interested.

Be knowledgeable, helpful, and focus on explaining our services clearly.`;
}

// Create the InquiryAgent class
class InquiryAgent extends BaseCategoryAgent {
  constructor() {
    // Initialize with temporary prompt, will be updated in init
    super('inquiry', '');
    this.initAgent();
  }
  
  async initAgent() {
    // Update the system prompt with available services
    this.systemPrompt = await generateInquirySystemPrompt();
    
    // Add inquiry-specific tools
    this.addTool(new StructuredTool({
      name: 'create_inquiry',
      description: 'Records a service inquiry in the system',
      schema: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'The name of the customer'
          },
          serviceName: {
            type: 'string',
            description: 'The service the customer is inquiring about'
          },
          phoneNumber: {
            type: 'string',
            description: 'The customer\'s phone number'
          },
          transcript: {
            type: 'string',
            description: 'The conversation transcript'
          }
        },
        required: ['customerName', 'serviceName', 'phoneNumber'],
      },
      func: async ({ customerName, serviceName, phoneNumber, transcript }) => {
        try {
          // Record the inquiry in the database
          const inquiry = await createInquiry({
            customerName,
            serviceName,
            phoneNumber,
            transcript
          });
          
          return JSON.stringify({
            success: true,
            inquiryId: inquiry.enquiry_id,
            message: 'Inquiry recorded successfully',
            details: {
              name: inquiry.customer_name,
              service: inquiry.service_name,
              date: inquiry.date_of_enquiry
            }
          });
        } catch (error) {
          console.error('Error recording inquiry:', error);
          return JSON.stringify({
            success: false,
            error: error.message
          });
        }
      }
    }));
    
    // Add service information tool
    this.addTool(new StructuredTool({
      name: 'get_service_info',
      description: 'Gets detailed information about a specific service',
      schema: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The name of the service to get information about'
          }
        },
        required: ['serviceName'],
      },
      func: async ({ serviceName }) => {
        // Get service information from company config
        const serviceInfo = {};
        
        // Get available services (preferably from cache)
        const availableServices = await getAvailableServices();
        
        // Map company services to information based on the company config
        availableServices.forEach(service => {
          // Generate consistent information based on service name and company details
          const pricing = service.includes('Support') ? '$99/month' :
                         service.includes('Development') ? '$5,000+ (project based)' :
                         service.includes('Network') ? '$150/month per node' :
                         service.includes('Cloud') ? 'Pay-as-you-go' :
                         service.includes('Security') ? '$199/month' :
                         '$100-500/month';
          
          const features = [];
          
          if (service.includes('Support')) {
            features.push('24/7 helpdesk support', 'Remote troubleshooting', 'Hardware and software assistance');
          } else if (service.includes('Development')) {
            features.push('Custom application development', 'Software integration', 'Agile methodology');
          } else if (service.includes('Network')) {
            features.push('Network design', 'Security monitoring', 'Performance optimization');
          } else if (service.includes('Cloud')) {
            features.push('Cloud migration', 'Cloud security', 'Infrastructure management');
          } else if (service.includes('Security')) {
            features.push('Vulnerability assessments', 'Security training', 'Incident response');
          } else {
            features.push('Professional consulting', 'Regular maintenance', 'Technical support');
          }
          
          // Create service info object
          serviceInfo[service] = {
            description: `${companyConfig.name} offers comprehensive ${service} tailored to meet your business needs.`,
            pricing: pricing,
            features: features,
            contactEmail: companyConfig.contactInfo.email,
            contactPhone: companyConfig.contactInfo.phone,
            businessHours: {
              weekdays: `${companyConfig.businessHours.weekdays.open} - ${companyConfig.businessHours.weekdays.close}`,
              weekends: `${companyConfig.businessHours.weekend.open} - ${companyConfig.businessHours.weekend.close}`
            }
          };
        });
        
        // Return the service information or a not found message
        const info = serviceInfo[serviceName];
        if (info) {
          return JSON.stringify(info);
        } else {
          return JSON.stringify({
            error: 'Service not found',
            availableServices: Object.keys(serviceInfo),
            message: `We don't currently offer ${serviceName}. Please check our available services.`
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

// Create a singleton instance of the inquiry agent
const inquiryAgent = new InquiryAgent();

// Export the agent and a function to run it
module.exports = {
  InquiryAgent,
  inquiryAgent,
  handleInquiry: async (query, conversationData = {}) => {
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
    return await inquiryAgent.run(query, conversationHistory);
  }
}; 