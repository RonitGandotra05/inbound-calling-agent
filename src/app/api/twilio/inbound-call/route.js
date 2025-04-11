import { NextResponse } from 'next/server';
import * as twilioUtils from '../../../../utils/twilio';
import { getOrCreateConversation } from '../../../../utils/conversation';
import companyConfig from '../../../../config/company';
import { preloadAgentResources } from '../../../../utils/agent-preloader';

// Handler for inbound calls
export async function POST(request) {
  try {
    // Start preloading agent resources in the background when a call comes in
    // This will happen asynchronously and not block the response
    const preloadPromise = preloadAgentResources();
    
    // Parse form data from Twilio
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    
    console.log(`Inbound call received from ${from} with SID ${callSid}`);
    
    // Create or get a conversation for this caller
    const conversation = await getOrCreateConversation(from, callSid);
    
    // Generate TwiML response with the company greeting and gather speech input
    const response = twilioUtils.gatherSpeechInput(
      '/api/twilio/speech-input',
      {
        prompt: companyConfig.greeting,
        language: 'en-US',
        speechTimeout: 'auto',
        enhanced: true
      }
    );
    
    // Log the preloading status once it's done (won't block response)
    preloadPromise.then(result => {
      console.log(`Agent resources preloaded: ${JSON.stringify(result)}`);
    }).catch(error => {
      console.error('Error preloading agent resources:', error);
    });
    
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers['Content-Type']
      }
    });
  } catch (error) {
    console.error('Error handling inbound call:', error);
    
    // Generate TwiML with an error message
    const response = twilioUtils.sayText(
      "I'm sorry, but an error occurred while processing your call. Please try again later."
    );
    
    return new NextResponse(response.body, {
      status: 500,
      headers: {
        'Content-Type': response.headers['Content-Type']
      }
    });
  }
}

// Handler for GET requests
export async function GET() {
  const response = twilioUtils.sayText("This endpoint only accepts POST requests from Twilio.");
  
  return new NextResponse(response.body, {
    status: 405,
    headers: {
      'Content-Type': response.headers['Content-Type']
    }
  });
} 