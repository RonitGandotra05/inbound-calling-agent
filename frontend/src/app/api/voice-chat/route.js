import { NextResponse } from 'next/server';
import { transcribeAudio, refineTranscription } from '../../../utils/speech-processing';
import { textToSpeech } from '../../../utils/tts';
import { bookingAgent } from '../../../agents/booking-agent';
import { complaintAgent } from '../../../agents/complaint-agent';
import { inquiryAgent } from '../../../agents/inquiry-agent';
import { feedbackAgent } from '../../../agents/feedback-agent';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../lib/db';
import { verifyAuthToken } from '../../../lib/auth';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Voice Chat API Endpoint
 * Accepts audio data, converts to text, processes with the appropriate agent, and returns the response
 */
export async function POST(request) {
  let responsePayload = {}; // Use an object to build the response
  let httpStatus = 200;

  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Voice chat endpoint called');
    
    // Parse request body
    const data = await request.json();
    console.log(`Voice chat data received: ${JSON.stringify(data).length} bytes`);
    
    // Extract key fields
    const audioData = data.audio_data;
    const phoneNumber = data.phone_number;
    const audioEnabled = data.audio_enabled === true || data.audio_enabled === 'true';
    const conversationId = data.conversation_id || `conv-${uuidv4()}`;
    const isNewChat = data.is_new_chat === true || data.is_new_chat === 'true';
    
    // Log the data we received
    console.log(`Voice chat phone_number: ${phoneNumber}`);
    console.log(`Voice chat audio_enabled: ${audioEnabled}`);
    console.log(`Voice chat audio_data length: ${audioData ? audioData.length : 'None'}`);
    console.log(`Voice chat conversation_id: ${conversationId}`);
    console.log(`Voice chat is_new_chat: ${isNewChat}`);
    
    // Validate required fields
    if (!audioData) {
      console.error('Voice chat failed: No audio data provided');
      return NextResponse.json(
        { error: 'No audio data provided' }, 
        { status: 400 }
      );
    }
    
    if (!phoneNumber) {
      console.error('Voice chat failed: No phone number provided');
      return NextResponse.json(
        { error: 'Phone number is required' }, 
        { status: 400 }
      );
    }
    
    // Decode base64 audio
    let binaryAudio;
    try {
      // Check audio data format
      console.log(`Audio data format check: contains comma? ${audioData.includes(',')}`);
      
      // Handle both data URI and raw base64
      binaryAudio = Buffer.from(
        audioData.includes(',') ? audioData.split(',')[1] : audioData, 
        'base64'
      );
      console.log(`Successfully decoded base64 to binary, size: ${binaryAudio.length} bytes`);
    } catch (error) {
      console.error(`Failed to decode base64: ${error}`);
      return NextResponse.json(
        { error: 'Invalid base64 encoding in audio data', message: error.message }, 
        { status: 400 }
      );
    }
    
    // Transcribe audio
    let transcriptionResult;
    try {
      console.log('Starting audio transcription with STT agent');
      const rawTranscription = await transcribeAudio(binaryAudio);
      
      // Refine the transcription to fix common STT errors
      const refinedText = await refineTranscription(rawTranscription);
      
      transcriptionResult = {
        success: true,
        text: refinedText,
        raw_text: rawTranscription,
        language: 'en'
      };
      console.log(`Transcription result: ${JSON.stringify(transcriptionResult)}`);
    } catch (error) {
      console.error(`Transcription error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to transcribe audio', message: error.message }, 
        { status: 500 }
      );
    }
    
    if (!transcriptionResult.success) {
      console.error(`Transcription failed: ${transcriptionResult.error || 'Unknown error'}`);
      return NextResponse.json(
        { error: 'Failed to transcribe audio', message: transcriptionResult.error }, 
        { status: 500 }
      );
    }
    
    const transcribedText = transcriptionResult.text;
    console.log(`Voice chat transcribed text: ${transcribedText}`);
    
    // Get customer details from database
    let customerName = '';
    let customerDetails = { phone_number: phoneNumber, customer_name: 'Test Customer' }; // Placeholder
    // COMMENTED OUT: Customer DB interaction
    // try {
    //   const customerResult = await query('SELECT * FROM customers WHERE phone_number = $1', [phoneNumber]);
    //   if (customerResult.rows.length === 0) { ... } else { ... }
    //   customerDetails = { phone_number: phoneNumber, customer_name: customerName };
    // } catch (error) {
    //   console.error(`Error getting customer details: ${error}`);
    // }
    
    // Process with appropriate agent based on content
    // Simple keyword-based intent detection
    let agentResponse;
    const conversationData = { ...customerDetails, transcript: transcribedText };
    
    try {
      // Agent routing logic (remains the same)
      if (transcribedText.toLowerCase().includes('book') || 
          transcribedText.toLowerCase().includes('appoint') || 
          transcribedText.toLowerCase().includes('schedul')) {
        agentResponse = await bookingAgent.run(transcribedText, []); // Assuming empty history for now
      } 
      else if (transcribedText.toLowerCase().includes('complain') || 
               transcribedText.toLowerCase().includes('issue') || 
               transcribedText.toLowerCase().includes('problem')) {
        agentResponse = await complaintAgent.run(transcribedText, []);
      }
      else if (transcribedText.toLowerCase().includes('feedback') || 
               transcribedText.toLowerCase().includes('suggest') || 
               transcribedText.toLowerCase().includes('review')) {
        agentResponse = await feedbackAgent.run(transcribedText, []);
      }
      else {
        agentResponse = await inquiryAgent.run(transcribedText, []);
      }
      console.log("Agent response received:", agentResponse);
      responsePayload.response = agentResponse; // Store agent text response
    } catch (agentError) {
      console.error("Error during agent processing:", agentError);
      responsePayload.response = "Sorry, I encountered an error processing your request.";
      responsePayload.errors = responsePayload.errors || [];
      responsePayload.errors.push({ agentError: agentError.message });
      // Optionally change status for critical agent errors
      // httpStatus = 500; 
    }
    
    // COMMENTED OUT: Conversation saving DB interaction
    // try {
    //   await query('INSERT INTO messages ...', [...]);
    // } catch (error) {
    //   console.error(`Error saving conversation: ${error}`);
    // }
    
    // Generate audio response only if needed and agent succeeded
    if (audioEnabled && typeof agentResponse === 'string' && agentResponse) {
      console.log('Generating audio response');
      try {
        const audioBuffer = await textToSpeech(agentResponse);
        // Upload audio to S3 and add URL to payload
        const audioKey = `responses/${conversationId}-${uuidv4()}.mp3`;
        const putCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: audioKey,
          Body: audioBuffer,
          ContentType: 'audio/mpeg'
        });
        await s3Client.send(putCommand);
        const audioUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;
        responsePayload.audio_url = audioUrl;
        console.log(`Audio response uploaded: ${audioUrl}`);
      } catch (ttsError) {
        console.error(`Error generating or uploading audio: ${ttsError}`);
        responsePayload.errors = responsePayload.errors || [];
        responsePayload.errors.push({ ttsError: ttsError.message });
      }
    } else if (audioEnabled) {
      console.log('Skipping audio response generation (invalid agent response).');
    }
    
    // Prepare response
    responsePayload.conversation_id = conversationId;
    responsePayload.transcription = transcriptionResult; // Add transcription to response
    
    return NextResponse.json(responsePayload, { status: httpStatus });
  } catch (error) {
    // Catch errors from auth, parsing, transcription, etc.
    console.error('Unhandled error in voice-chat handler:', error);
    responsePayload.error = error.message || 'An unexpected error occurred.';
    httpStatus = error.status || 500; // Use error status if available
    return NextResponse.json(responsePayload, { status: httpStatus });
  }
} 