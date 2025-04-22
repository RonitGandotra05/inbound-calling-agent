import { NextResponse } from 'next/server';
import { transcribeAudio, refineTranscription } from '../../../utils/speech-processing';
import { textToSpeech } from '../../../utils/tts';
import { processInboundCall } from '../../../agents/main-agent';
import { saveConversation } from '../../../utils/db-operations';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { verifyAuthToken } from '../../../lib/auth';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// In-memory storage for active conversations
const activeConversations = new Map();

/**
 * Voice Chat API Endpoint
 * Accepts audio data, converts to text, processes with the appropriate agent, and returns the response
 */
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = verifyAuthToken(token);
      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed: ' + authError.message }, { status: 401 });
    }

    console.log('Voice chat endpoint called');
    
    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body: ' + parseError.message }, { status: 400 });
    }
    
    // Extract key fields
    const audioData = data.audio_data;
    const phoneNumber = data.phone_number;
    const audioEnabled = data.audio_enabled !== false;
    const conversationId = data.conversation_id || `conv-${uuidv4()}`;
    const endConversation = data.end_conversation === true;
    
    // Check if we're ending the conversation
    if (endConversation) {
      // Store the conversation in the appropriate table based on intent
      const conversationData = activeConversations.get(conversationId);
      if (conversationData) {
        try {
          // Save the conversation to the database
          const queryType = conversationData.category || 'inquiry';
          const sourceId = conversationData.actionResult?.id || null;
          
          if (sourceId) {
            await saveConversation({
              customerName: conversationData.customerName || 'Unknown Customer',
              phoneNumber: conversationData.phoneNumber,
              queryType: queryType,
              sourceId: sourceId,
              transcript: conversationData.messages.map(m => `${m.role}: ${m.content}`).join('\n'),
              service: conversationData.serviceType || 'general',
              interactionDate: new Date(),
              time: new Date().toTimeString().split(' ')[0],
              summary: conversationData.messages.length > 0 ? 
                conversationData.messages[conversationData.messages.length - 1].content : ''
            });
          }
          
          activeConversations.delete(conversationId);
          return NextResponse.json({ 
            success: true, 
            message: 'Conversation ended and stored successfully' 
          });
        } catch (error) {
          console.error('Error storing conversation:', error);
          return NextResponse.json({ 
            error: 'Failed to store conversation', 
            message: error.message 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Conversation not found', 
          message: 'No active conversation found with the given ID' 
        }, { status: 404 });
      }
    }
    
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
      // Handle both data URI and raw base64
      binaryAudio = Buffer.from(
        audioData.includes(',') ? audioData.split(',')[1] : audioData, 
        'base64'
      );
    } catch (error) {
      console.error(`Failed to decode base64: ${error}`);
      return NextResponse.json(
        { error: 'Invalid base64 encoding in audio data', message: error.message }, 
        { status: 400 }
      );
    }
    
    // Process with main agent (non-streaming approach)
    try {
      // Initialize or get existing conversation data
      let conversationData = activeConversations.get(conversationId) || {
        messages: [],
        customerName: null,
        phoneNumber: phoneNumber,
        serviceType: null,
        category: null,
        actionResult: null
      };
      
      // Process the audio with our main agent
      const result = await processInboundCall(
        binaryAudio,
        phoneNumber,
        [] // No need to pass conversation history as the agent doesn't use it
      );
      
      // Add this interaction to the memory cache
      conversationData.messages.push({
        role: 'user',
        content: result.transcribedText
      });
      
      conversationData.messages.push({
        role: 'assistant',
        content: result.response
      });
      
      // Update customer name and category if available
      if (result.customerName && !conversationData.customerName) {
        conversationData.customerName = result.customerName;
      }
      
      if (result.category && !conversationData.category) {
        conversationData.category = result.category;
      }
      
      if (result.service) {
        conversationData.serviceType = result.service;
      }
      
      if (result.dbActionResult) {
        conversationData.actionResult = result.dbActionResult;
      }
      
      // Store updated conversation data
      activeConversations.set(conversationId, conversationData);
      
      // Base64 encode the audio for safer transport
      let audioResponse = null;
      if (audioEnabled && result.audioResponse) {
        audioResponse = result.audioResponse.toString('base64');
      }
      
      // Return response without mixing binary and JSON
      return NextResponse.json({
        success: true,
        conversation_id: conversationId,
        response: result.response,
        transcription: {
          text: result.transcribedText,
          refined: result.refinedQuery || result.transcribedText
        },
        audio_base64: audioResponse, // Base64 encoded audio
        audio_format: 'audio/mp3',
        category: result.category,
        errors: result.errors || []
      });
    } catch (processingError) {
      console.error('Error processing query:', processingError);
      return NextResponse.json({
        error: 'Failed to process query',
        message: processingError.message,
        conversation_id: conversationId
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in voice-chat API route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 });
  }
} 