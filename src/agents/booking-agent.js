const { StructuredTool } = require('langchain/tools');
const { BaseCategoryAgent } = require('./base-agent');
const { createBooking } = require('../utils/db-operations');
const companyConfig = require('../config/company');

// Helper function to get available services
async function getAvailableServices() {
  // Fall back to company config services
  console.warn('Booking Agent: Using static services from config.');
  return companyConfig.services;
}

// Define the system prompt generator function
async function generateBookingSystemPrompt() {
  const availableServices = await getAvailableServices();
  
  return `You are a booking agent for ${companyConfig.name}, responsible for scheduling appointments.
Your task is to help users book appointments efficiently by collecting all necessary details.

When responding to a booking request:
1. Collect the customer's name.
2. Confirm their phone number (which you already have from the call).
3. Ask which service they need (options: ${availableServices.join(', ')}).
4. Ask when they would like to schedule the appointment (date and time).
5. Summarize the booking details and confirm with the user.
6. Create the booking using the create_booking tool.

Be friendly, professional, and efficient. Our business hours are:
- Weekdays: ${companyConfig.businessHours.weekdays.open} to ${companyConfig.businessHours.weekdays.close}
- Weekends: ${companyConfig.businessHours.weekend.open} to ${companyConfig.businessHours.weekend.close}`;
}

// Create the BookingAgent class
class BookingAgent extends BaseCategoryAgent {
  constructor() {
    // Initialize with temporary prompt, will be updated in init
    super('booking', '');
    this.initAgent();
  }
  
  async initAgent() {
    // Update the system prompt with available services
    this.systemPrompt = await generateBookingSystemPrompt();
    
    // Add booking-specific tools
    this.addTool(new StructuredTool({
      name: 'create_booking',
      description: 'Creates a new booking in the database',
      schema: {
        type: 'object',
        properties: {
          customerName: {
            type: 'string',
            description: 'The name of the customer'
          },
          serviceRequired: {
            type: 'string',
            description: 'The service being booked'
          },
          phoneNumber: {
            type: 'string',
            description: 'The customer\'s phone number'
          },
          appointmentDate: {
            type: 'string',
            description: 'The date for the appointment (YYYY-MM-DD)'
          },
          appointmentTime: {
            type: 'string',
            description: 'The time for the appointment (HH:MM)'
          },
          transcript: {
            type: 'string',
            description: 'The conversation transcript'
          }
        },
        required: ['customerName', 'serviceRequired', 'phoneNumber', 'appointmentDate', 'appointmentTime'],
      },
      func: async ({ customerName, serviceRequired, phoneNumber, appointmentDate, appointmentTime, transcript }) => {
        try {
          // Create booking in the database
          const booking = await createBooking({
            customerName,
            serviceRequired, 
            phoneNumber,
            appointmentDate,
            appointmentTime,
            transcript
          });
          
          return JSON.stringify({
            success: true,
            bookingId: booking.booking_id,
            message: 'Booking created successfully',
            details: {
              name: booking.customer_name,
              service: booking.service_required,
              date: booking.date_of_appointment,
              time: booking.time
            }
          });
        } catch (error) {
          console.error('Error creating booking:', error);
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

// Create a singleton instance of the booking agent
const bookingAgent = new BookingAgent();

// Export the agent and a function to run it
module.exports = {
  BookingAgent,
  bookingAgent,
  handleBooking: async (query, conversationData = {}) => {
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
    return await bookingAgent.run(query, conversationHistory);
  }
}; 