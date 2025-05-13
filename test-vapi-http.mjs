import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if token exists
if (!process.env.VAPI_PRIVATE_KEY) {
  console.error('Error: VAPI_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const VAPI_API_TOKEN = process.env.VAPI_PRIVATE_KEY;
const API_BASE_URL = 'https://api.vapi.ai';

// Create axios instance with authorization header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${VAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testVapiEndpoints() {
  try {
    console.log('1. Creating a phone number via Vapi API...');
    const phoneNumberResponse = await api.post('/phone-number', { 
      provider: "vapi" 
    });
    const phoneNumber = phoneNumberResponse.data;
    console.log('Phone number created:', phoneNumber);
    
    console.log('\n2. Creating an assistant with the phone number...');
    const assistantResponse = await api.post('/assistant', {
      name: "test-assistant",
      phoneNumberId: phoneNumber.id,
      messages: [
        {
          role: "system",
          content: "You are a helpful AI receptionist."
        }
      ],
      firstMessage: "Hello, how can I assist you today?",
      model: {
        provider: "cerebras",
        model: "llama-3.3-70b"
      },
      voice: {
        provider: "11labs",
        voiceId: "Arnold"
      },
      transcriber: {
        provider: "11labs",
        model: "scribe_v1",
        language: "en"
      }
    });
    const assistant = assistantResponse.data;
    console.log('Assistant created:', assistant);
    
    // Clean up resources
    console.log('\n3. Cleaning up: Deleting the created assistant and phone number...');
    await api.delete(`/assistant/${assistant.id}`);
    await api.delete(`/phone-number/${phoneNumber.id}`);
    console.log('Resources cleaned up successfully');
    
    return { success: true };
  } catch (error) {
    console.error('Error testing Vapi endpoints:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Execute the test
testVapiEndpoints()
  .then(result => {
    console.log('\nTest completed:', result.success ? 'SUCCESS' : 'FAILED');
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 