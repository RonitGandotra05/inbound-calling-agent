import { NextResponse } from 'next/server';
import * as twilioUtils from '../../../../utils/twilio';
import { getOrCreateConversation, addMessage, getLastMessages } from '../../../../utils/conversation';
import { transcribeAudio, refineTranscription } from '../../../../utils/speech-processing';
import { textToSpeech } from '../../../../utils/tts';
import { processQuery } from '../../../../agents/orchestrator';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { handleBooking } from '../../../../agents/booking-agent';
import { handleComplaint } from '../../../../agents/complaint-agent';
import { handleInquiry } from '../../../../agents/inquiry-agent';
import { handleFeedback } from '../../../../agents/feedback-agent';

// Handler for speech input from Twilio
export async function POST(request) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    const speechResult = formData.get('SpeechResult');
    const confidence = formData.get('Confidence');
    
    console.log('Received speech input:', { callSid, from, speechResult, confidence });
    
    // Refine the transcription to fix common STT errors
    const refinedText = await refineTranscription(speechResult);
    console.log('Refined text:', refinedText);
    
    // Determine the intent of the user (booking, complaint, inquiry, feedback)
    let response;
    const conversationData = {
      phoneNumber: from,
      transcript: refinedText
    };
    
    // Simple keyword-based intent detection
    // In a real system, you'd use a more sophisticated intent classification
    if (refinedText.toLowerCase().includes('book') || 
        refinedText.toLowerCase().includes('appoint') || 
        refinedText.toLowerCase().includes('schedul')) {
      // Handle booking intent
      const agentResponse = await handleBooking(refinedText, conversationData);
      response = twilioUtils.sayText(agentResponse);
    } 
    else if (refinedText.toLowerCase().includes('complain') || 
             refinedText.toLowerCase().includes('issue') || 
             refinedText.toLowerCase().includes('problem')) {
      // Handle complaint intent
      const agentResponse = await handleComplaint(refinedText, conversationData);
      response = twilioUtils.sayText(agentResponse);
    }
    else if (refinedText.toLowerCase().includes('feedback') || 
             refinedText.toLowerCase().includes('suggest') || 
             refinedText.toLowerCase().includes('review')) {
      // Handle feedback intent
      const agentResponse = await handleFeedback(refinedText, conversationData);
      response = twilioUtils.sayText(agentResponse);
    }
    else {
      // Default to inquiry for general questions
      const agentResponse = await handleInquiry(refinedText, conversationData);
      response = twilioUtils.sayText(agentResponse);
    }
    
    // Return the TwiML response
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers['Content-Type']
      }
    });
  } catch (error) {
    console.error('Error processing speech input:', error);
    
    // Generate TwiML with an error message
    const response = twilioUtils.sayText(
      "I'm sorry, but I couldn't process your request. Could you please try again?"
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