import { VapiClient } from '@vapi-ai/server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if token exists
if (!process.env.VAPI_PRIVATE_KEY) {
  console.error('Error: VAPI_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const client = new VapiClient({ 
  token: process.env.VAPI_PRIVATE_KEY 
});

async function testVapiEndpoints() {
  try {
    console.log('1. Creating a phone number via Vapi API...');
    const phoneNumber = await client.phoneNumber.create({
      provider: "vapi"
    });
    console.log('Phone number created:', phoneNumber);
    
    console.log('\n2. Creating an assistant with the phone number...');
    const assistant = await client.assistant.create({
      name: "test-assistant",
      phone_number_id: phoneNumber.id,
      system_prompt: "You are a helpful AI receptionist.",
      first_message: "Hello, how can I assist you today?",
      model: {
        provider: "cerebras",
        model: "llama-3.3-70b"
      },
      voice: {
        provider: "11labs",
        voice_id: "Arnold"
      },
      transcriber: {
        provider: "11labs",
        model: "Scribe",
        language: "en"
      }
    });
    console.log('Assistant created:', assistant);
    
    // Clean up resources
    console.log('\n3. Cleaning up: Deleting the created assistant and phone number...');
    await client.assistant.delete(assistant.id);
    await client.phoneNumber.delete(phoneNumber.id);
    console.log('Resources cleaned up successfully');
    
    return { success: true };
  } catch (error) {
    console.error('Error testing Vapi endpoints:', error);
    return { 
      success: false, 
      error: error.message, 
      fallbackCommand: `
For phone number creation:
curl -X POST https://api.vapi.ai/phone-number \\
     -H "Authorization: Bearer ${process.env.VAPI_PRIVATE_KEY}" \\
     -H "Content-Type: application/json" \\
     -d '{"provider":"vapi"}'

For assistant creation:
curl -X POST https://api.vapi.ai/assistant \\
     -H "Authorization: Bearer ${process.env.VAPI_PRIVATE_KEY}" \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "test-assistant",
       "phone_number_id": "PHONE_NUMBER_ID",
       "system_prompt": "You are a helpful AI receptionist.",
       "first_message": "Hello, how can I assist you today?",
       "model": {
         "provider": "cerebras",
         "model": "llama-3.3-70b"
       },
       "voice": {
         "provider": "11labs",
         "voice_id": "Arnold"
       },
       "transcriber": {
         "provider": "11labs",
         "model": "Scribe",
         "language": "en"
       }
     }'

For deleting phone number:
curl -X DELETE https://api.vapi.ai/phone-number/PHONE_NUMBER_ID \\
     -H "Authorization: Bearer ${process.env.VAPI_PRIVATE_KEY}"

For deleting assistant:
curl -X DELETE https://api.vapi.ai/assistant/ASSISTANT_ID \\
     -H "Authorization: Bearer ${process.env.VAPI_PRIVATE_KEY}"
      `
    };
  }
}

// Execute the test
testVapiEndpoints()
  .then(result => {
    console.log('\nTest completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.log('\nFallback curl commands you can use:');
      console.log(result.fallbackCommand);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 