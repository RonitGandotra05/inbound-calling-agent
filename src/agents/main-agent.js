const { StateGraph, END } = require('@langchain/langgraph');
const { cerebrasChat } = require('../utils/llm');
const { transcribeAudio } = require('../utils/speech-processing');
const { textToSpeech } = require('../utils/tts');
const { createBooking, registerComplaint, recordFeedback, createInquiry } = require('../utils/db-operations');
const db = require('../lib/db');

// Define the state type for the agent graph
class AgentState {
  constructor() {
    this.query = '';                // Original audio transcription
    this.refinedQuery = '';         // Cleaned and preprocessed query
    this.category = '';             // Classified intent (booking, complaint, etc.)
    this.response = '';             // Generated response to user
    this.customerName = '';         // Extracted customer name
    this.phoneNumber = '';          // Customer phone number
    this.service = '';              // Service being discussed
    this.dbAction = null;           // Database action to perform
    this.conversationHistory = [];  // Conversation context
    this.errors = [];               // Errors during processing
  }
}

// System prompts for different agent roles
const REFINER_PROMPT = `You are a refiner agent that processes user queries. Your tasks:
1. Correct typos and grammar issues
2. Remove filler words and hesitations
3. Extract the user's intent clearly
4. Maintain the original meaning of the query

Output only the refined query without explanations.`;

const CLASSIFIER_PROMPT = `You are an intent classifier agent. Categorize the user query into one of these categories:
1. booking - Scheduling appointments or reservations
2. complaint - Issues, problems, or dissatisfaction
3. inquiry - General questions or information requests
4. feedback - Customer opinions or suggestions

Respond with only the category name (booking, complaint, inquiry, or feedback).`;

// Create the main agent function
async function processInboundCall(audioBuffer, phoneNumber, conversationHistory = []) {
  try {
    // Create the agent graph
    const workflow = createAgentGraph();
    
    // Create initial state
    const initialState = new AgentState();
    
    // Transcribe audio using Whisper API
    const transcribedText = await transcribeAudio(audioBuffer);
    initialState.query = transcribedText;
    initialState.phoneNumber = phoneNumber;
    initialState.conversationHistory = conversationHistory;
    
    console.log(`Transcribed text: "${transcribedText}"`);
    
    // Invoke the agent graph
    const result = await workflow.invoke(initialState);
    
    // Generate speech from the response
    const audioResponse = await textToSpeech(result.response);
    
    return {
      transcribedText: result.query,
      refinedQuery: result.refinedQuery,
      category: result.category,
      response: result.response,
      customerName: result.customerName,
      service: result.service,
      audioResponse,
      dbActionResult: result.dbActionResult,
      errors: result.errors
    };
  } catch (error) {
    console.error('Error processing inbound call:', error);
    
    // Fallback response in case of errors
    const fallbackResponse = "I'm sorry, I encountered an issue processing your request. Please try again later.";
    const fallbackAudio = await textToSpeech(fallbackResponse);
    
    return {
      transcribedText: '',
      refinedQuery: '',
      category: '',
      response: fallbackResponse,
      customerName: '',
      service: '',
      audioResponse: fallbackAudio,
      dbActionResult: null,
      errors: [error.message]
    };
  }
}

// Create the agent workflow graph
function createAgentGraph() {
  // Create a new state graph
  const workflow = new StateGraph({
    channels: {
      query: {},
      refinedQuery: {},
      category: {},
      response: {},
      customerName: {},
      phoneNumber: {},
      service: {},
      dbAction: {},
      conversationHistory: {},
      errors: {}
    }
  });

  // Add nodes for each step in the process
  
  // 1. Refiner node - Clean and preprocess the query
  workflow.addNode('refiner', async (state) => {
    try {
      // Call LLM to refine the query
      const messages = [
        { role: 'system', content: REFINER_PROMPT },
        { role: 'user', content: state.query }
      ];
      
      const response = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      return {
        ...state,
        refinedQuery: response.trim()
      };
    } catch (error) {
      return {
        ...state,
        refinedQuery: state.query, // Fall back to original query
        errors: [...state.errors, `Refiner error: ${error.message}`]
      };
    }
  });

  // 2. Classifier node - Determine query intent
  workflow.addNode('classifier', async (state) => {
    try {
      // Call LLM to classify the query
      const messages = [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: state.refinedQuery }
      ];
      
      const response = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 256
      });
      
      // Validate the category
      const category = response.trim().toLowerCase();
      const validCategories = ['booking', 'complaint', 'inquiry', 'feedback'];
      
      if (!validCategories.includes(category)) {
        return {
          ...state,
          category: 'inquiry', // Default to inquiry for invalid categories
          errors: [...state.errors, `Invalid category detected: ${category}, defaulting to inquiry`]
        };
      }
      
      return {
        ...state,
        category
      };
    } catch (error) {
      return {
        ...state,
        category: 'inquiry', // Default to inquiry in case of error
        errors: [...state.errors, `Classifier error: ${error.message}`]
      };
    }
  });

  // 3. Handler nodes for each category
  
  // 3.1 Booking handler
  workflow.addNode('booking_handler', async (state) => {
    try {
      // Extract booking information
      const systemPrompt = `You are a booking assistant for a company. 
      Extract the following information from the user's query:
      1. Customer name
      2. Service required
      3. Appointment date
      4. Appointment time
      
      Format your response as JSON: {"customerName": "...", "serviceRequired": "...", "appointmentDate": "YYYY-MM-DD", "appointmentTime": "HH:MM"}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      // Call LLM to extract booking details
      const extractionResponse = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      // Parse booking details
      const bookingDetails = JSON.parse(extractionResponse);
      
      // Generate response to user
      const responsePrompt = `You are a helpful booking assistant. The user wants to book ${bookingDetails.serviceRequired} on ${bookingDetails.appointmentDate} at ${bookingDetails.appointmentTime}.
      
      Respond to the user confirming their booking details in a friendly, professional manner. Keep your response concise (2-3 sentences).`;
      
      const responseMessages = [
        { role: 'system', content: responsePrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      const response = await cerebrasChat(responseMessages, {
        temperature: 0.7,
        maxTokens: 512
      });
      
      // Prepare database action
      const dbAction = {
        action: 'createBooking',
        data: {
          customerName: bookingDetails.customerName,
          serviceRequired: bookingDetails.serviceRequired,
          phoneNumber: state.phoneNumber,
          appointmentDate: bookingDetails.appointmentDate,
          appointmentTime: bookingDetails.appointmentTime,
          transcript: state.query
        }
      };
      
      return {
        ...state,
        customerName: bookingDetails.customerName,
        service: bookingDetails.serviceRequired,
        response: response.trim(),
        dbAction
      };
    } catch (error) {
      const fallbackResponse = "I apologize, but I couldn't process your booking request. Could you please provide your name, the service you need, and when you'd like to schedule it?";
      
      return {
        ...state,
        response: fallbackResponse,
        errors: [...state.errors, `Booking handler error: ${error.message}`]
      };
    }
  });

  // 3.2 Complaint handler
  workflow.addNode('complaint_handler', async (state) => {
    try {
      // Extract complaint information
      const systemPrompt = `You are a customer service assistant handling complaints.
      Extract the following information from the user's query:
      1. Customer name
      2. Service they're having issues with
      3. A summary of their complaint
      
      Format your response as JSON: {"customerName": "...", "service": "...", "summary": "..."}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      // Call LLM to extract complaint details
      const extractionResponse = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      // Parse complaint details
      const complaintDetails = JSON.parse(extractionResponse);
      
      // Generate response to user
      const responsePrompt = `You are an empathetic customer service assistant. The user has a complaint about ${complaintDetails.service}.
      
      Respond to the user acknowledging their complaint in a caring, professional manner. Assure them their issue will be addressed promptly. Keep your response concise (2-3 sentences).`;
      
      const responseMessages = [
        { role: 'system', content: responsePrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      const response = await cerebrasChat(responseMessages, {
        temperature: 0.7,
        maxTokens: 512
      });
      
      // Prepare database action
      const dbAction = {
        action: 'registerComplaint',
        data: {
          customerName: complaintDetails.customerName,
          phoneNumber: state.phoneNumber,
          service: complaintDetails.service,
          transcript: state.query,
          summary: complaintDetails.summary
        }
      };
      
      return {
        ...state,
        customerName: complaintDetails.customerName,
        service: complaintDetails.service,
        response: response.trim(),
        dbAction
      };
    } catch (error) {
      const fallbackResponse = "I apologize, but I couldn't process your complaint. Could you please provide your name and tell me more about the issue you're experiencing?";
      
      return {
        ...state,
        response: fallbackResponse,
        errors: [...state.errors, `Complaint handler error: ${error.message}`]
      };
    }
  });

  // 3.3 Inquiry handler
  workflow.addNode('inquiry_handler', async (state) => {
    try {
      // Extract inquiry information
      const systemPrompt = `You are a knowledgeable customer service assistant handling inquiries.
      Extract the following information from the user's query:
      1. Customer name (if present)
      2. Service they're inquiring about
      
      Format your response as JSON: {"customerName": "...", "serviceName": "..."}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      // Call LLM to extract inquiry details
      const extractionResponse = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      // Parse inquiry details
      const inquiryDetails = JSON.parse(extractionResponse);
      
      // Generate response to user
      const responsePrompt = `You are a helpful customer service assistant. The user has an inquiry about ${inquiryDetails.serviceName}.
      
      Respond to the user's inquiry in a helpful, informative manner. If you don't know specific details, provide general information about the service. Keep your response concise but complete (3-4 sentences).`;
      
      const responseMessages = [
        { role: 'system', content: responsePrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      const response = await cerebrasChat(responseMessages, {
        temperature: 0.7,
        maxTokens: 512
      });
      
      // Prepare database action
      const dbAction = {
        action: 'createInquiry',
        data: {
          customerName: inquiryDetails.customerName || "Unknown",
          serviceName: inquiryDetails.serviceName,
          phoneNumber: state.phoneNumber,
          transcript: state.query
        }
      };
      
      return {
        ...state,
        customerName: inquiryDetails.customerName || "Unknown",
        service: inquiryDetails.serviceName,
        response: response.trim(),
        dbAction
      };
    } catch (error) {
      const fallbackResponse = "I apologize, but I couldn't process your inquiry. Could you please clarify what specific information or service you're interested in?";
      
      return {
        ...state,
        response: fallbackResponse,
        errors: [...state.errors, `Inquiry handler error: ${error.message}`]
      };
    }
  });

  // 3.4 Feedback handler
  workflow.addNode('feedback_handler', async (state) => {
    try {
      // Extract feedback information
      const systemPrompt = `You are a customer service assistant collecting feedback.
      Extract the following information from the user's query:
      1. Customer name
      2. Service they're providing feedback on
      3. A summary of their feedback
      
      Format your response as JSON: {"customerName": "...", "serviceName": "...", "summary": "..."}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      // Call LLM to extract feedback details
      const extractionResponse = await cerebrasChat(messages, {
        temperature: 0.3,
        maxTokens: 512
      });
      
      // Parse feedback details
      const feedbackDetails = JSON.parse(extractionResponse);
      
      // Generate response to user
      const responsePrompt = `You are a grateful customer service assistant. The user has provided feedback about ${feedbackDetails.serviceName}.
      
      Thank the user for their feedback in a warm, appreciative manner. Assure them that their input is valuable and will be used to improve services. Keep your response concise (2-3 sentences).`;
      
      const responseMessages = [
        { role: 'system', content: responsePrompt },
        { role: 'user', content: state.refinedQuery }
      ];
      
      const response = await cerebrasChat(responseMessages, {
        temperature: 0.7,
        maxTokens: 512
      });
      
      // Prepare database action
      const dbAction = {
        action: 'recordFeedback',
        data: {
          customerName: feedbackDetails.customerName,
          serviceName: feedbackDetails.serviceName,
          phoneNumber: state.phoneNumber,
          transcript: state.query,
          summary: feedbackDetails.summary
        }
      };
      
      return {
        ...state,
        customerName: feedbackDetails.customerName,
        service: feedbackDetails.serviceName,
        response: response.trim(),
        dbAction
      };
    } catch (error) {
      const fallbackResponse = "Thank you for your feedback. We appreciate you taking the time to share your thoughts with us. Is there anything specific about our services you'd like to comment on?";
      
      return {
        ...state,
        response: fallbackResponse,
        errors: [...state.errors, `Feedback handler error: ${error.message}`]
      };
    }
  });

  // 4. Database action node - Perform the appropriate database action
  workflow.addNode('db_action', async (state) => {
    if (!state.dbAction) {
      return state;
    }
    
    try {
      let result = null;
      
      // Execute the appropriate database action
      switch (state.dbAction.action) {
        case 'createBooking':
          result = await createBooking(state.dbAction.data);
          break;
        case 'registerComplaint':
          result = await registerComplaint(state.dbAction.data);
          break;
        case 'createInquiry':
          result = await createInquiry(state.dbAction.data);
          break;
        case 'recordFeedback':
          result = await recordFeedback(state.dbAction.data);
          break;
        default:
          console.warn(`Unknown database action: ${state.dbAction.action}`);
      }
      
      return {
        ...state,
        dbActionResult: result
      };
    } catch (error) {
      return {
        ...state,
        errors: [...state.errors, `Database action error: ${error.message}`]
      };
    }
  });

  // Define the edges in the graph
  
  // Start with the refiner
  workflow.setEntryPoint('refiner');
  workflow.addEdge('refiner', 'classifier');
  
  // From classifier to the appropriate handler based on category
  workflow.addConditionalEdges(
    'classifier',
    (state) => {
      // Route to the appropriate handler based on category
      switch (state.category) {
        case 'booking': return 'booking_handler';
        case 'complaint': return 'complaint_handler';
        case 'inquiry': return 'inquiry_handler';
        case 'feedback': return 'feedback_handler';
        default: return 'inquiry_handler'; // Default to inquiry
      }
    }
  );
  
  // All handlers go to database action
  workflow.addEdge('booking_handler', 'db_action');
  workflow.addEdge('complaint_handler', 'db_action');
  workflow.addEdge('inquiry_handler', 'db_action');
  workflow.addEdge('feedback_handler', 'db_action');
  
  // From database action to the end
  workflow.addEdge('db_action', END);

  // Create the runnable graph
  return workflow.compile();
}

module.exports = {
  processInboundCall,
  createAgentGraph,
  AgentState
}; 