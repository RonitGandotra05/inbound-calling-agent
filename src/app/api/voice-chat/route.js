import { NextResponse } from 'next/server';
import { transcribeAudio, refineTranscription } from '../../../utils/speech-processing';
import { textToSpeech, textToSpeechStreaming, nodeStreamToWebStream, BufferManager } from '../../../utils/tts';
import { processInboundCall } from '../../../agents/main-agent';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../lib/db';
import { verifyAuthToken } from '../../../lib/auth';
import { ReadableStream } from 'stream/web';

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
  let textResponse = null; // Declare textResponse outside the try block

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
      console.log(`Voice chat data received: ${JSON.stringify(data).length} bytes`);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body: ' + parseError.message }, { status: 400 });
    }
    
    // Extract key fields
    const audioData = data.audio_data;
    const phoneNumber = data.phone_number;
    // Default audioEnabled to true unless explicitly false
    const audioEnabled = data.audio_enabled !== false;
    const useStreaming = data.streaming !== false; // Default streaming to true unless explicitly false
    const conversationId = data.conversation_id || `conv-${uuidv4()}`;
    const isNewChat = data.is_new_chat === true || data.is_new_chat === 'true';
    
    // Log the data we received
    console.log(`Voice chat phone_number: ${phoneNumber}`);
    console.log(`Voice chat audio_enabled: ${audioEnabled}`);
    console.log(`Voice chat streaming: ${useStreaming}`);
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
      return NextResponse.json({ 
        success: false, 
        error: `Error calling AI service: ${error.message || 'Unknown error'}` 
      }, { status: 500 });
    }
    
    if (!transcriptionResult.success) {
      console.error(`Transcription failed: ${transcriptionResult.error || 'Unknown error'}`);
      return NextResponse.json({ 
        success: false, 
        error: `Error calling AI service: ${transcriptionResult.error || 'Unknown error'}` 
      }, { status: 500 });
    }
    
    const transcribedText = transcriptionResult.text;
    console.log(`Voice chat transcribed text: ${transcribedText}`);
    
    // Initialize customerDetails without assuming a name
    let customerDetails = { phone_number: phoneNumber, customer_name: '' }; // Pass empty name
    
    // If streaming and audio enabled, create a response stream
    if (audioEnabled && useStreaming) {
      console.log('Setting up streaming audio response');
      
      try {
        // Create a ReadableStream for streaming the audio response
        const audioStream = new ReadableStream({
          async start(controller) {
            try {
              // Set up buffer manager for adaptive buffering
              const bufferManager = new BufferManager();
              
              // Fetch conversation history (not implemented yet)
              const conversationHistory = [];
              
              // Process query with streaming enabled using our optimized orchestrator
              console.log('Starting streaming agent response generation');
              
              // Skip the agent category determination and just use the main agent
              try {
                // Process the query with our main agent - note we pass binary audio
                const result = await processInboundCall(
                  binaryAudio,
                  phoneNumber,
                  conversationHistory
                );
                
                // Since we're using the main agent directly and not streaming token by token,
                // we need to process the full audio response
                if (result && result.audioResponse) {
                  try {
                    // Send the audio response in chunks
                    const chunks = splitBuffer(result.audioResponse, 8192); // Split into 8KB chunks
                    for (const chunk of chunks) {
                      controller.enqueue(chunk);
                    }
                  } catch (audioError) {
                    console.error('Error processing audio response:', audioError);
                    controller.enqueue(Buffer.from(JSON.stringify({
                      error: 'Audio processing error',
                      message: audioError.message
                    })));
                  }
                } else {
                  console.error('No audio response received from main agent');
                  controller.enqueue(Buffer.from(JSON.stringify({
                    error: 'No audio response',
                    message: 'The agent did not generate an audio response'
                  })));
                }
                
                console.log('Streaming agent response completed');
                if (result && result.errors && result.errors.length > 0) {
                  console.warn('Agent completed with errors:', result.errors);
                }
                
                // Close the stream
                controller.close();
              } catch (streamingError) {
                console.error('Error in main agent processing:', streamingError);
                controller.enqueue(Buffer.from(JSON.stringify({
                  error: 'Agent processing error',
                  message: streamingError.message
                })));
                controller.close();
              }
            } catch (error) {
              console.error('Error in audio streaming:', error);
              // CRITICAL: Instead of controller.error() which might cause non-JSON responses,
              // enqueue an error message as a proper audio chunk
              controller.enqueue(Buffer.from('An error occurred. Please try again later.'));
              controller.close();
            }
          }
        });
        
        // Return the streaming response with proper error handling
        try {
          return new Response(audioStream, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'X-Conversation-ID': conversationId
            }
          });
        } catch (responseError) {
          console.error('Error creating streaming response:', responseError);
          // If streaming response creation fails, fall back to JSON
          return NextResponse.json({
            success: false,
            error: 'Streaming response failed',
            message: responseError.message,
            conversation_id: conversationId
          }, { status: 500 });
        }
      } catch (streamSetupError) {
        console.error('Error setting up audio stream:', streamSetupError);
        // Fall back to JSON response if streaming setup fails
        return NextResponse.json({
          success: false,
          error: 'Failed to set up audio streaming',
          message: streamSetupError.message,
          conversation_id: conversationId
        }, { status: 500 });
      }
    } else {
      console.log('Using non-streaming approach');
      
      try {
        // Fetch conversation history (not implemented yet)
        const conversationHistory = [];
        
        // Process query with our main agent
        const result = await processInboundCall(
          binaryAudio,
          phoneNumber,
          conversationHistory
        );
        
        // Extract response data
        textResponse = result.response;
        
        // Upload the audio to S3 if needed
        let audioUrl = '';
        if (audioEnabled && result.audioResponse) {
          try {
            // Create a unique key for the audio file
            const audioKey = `responses/${conversationId}/response-${Date.now()}.mp3`;
            
            // Upload the audio to S3
            const uploadResult = await s3Client.send(
              new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: audioKey,
                Body: result.audioResponse,
                ContentType: 'audio/mpeg'
              })
            );
            
            // Set the audio URL
            audioUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;
            console.log(`Audio response uploaded to ${audioUrl}`);
          } catch (uploadError) {
            console.error('Error uploading audio to S3:', uploadError);
            // Continue without audio URL - client will still receive text response
          }
        }
        
        // Construct the response payload
        responsePayload = {
          success: true,
          response: textResponse,
          transcription: {
            text: result.transcribedText,
            refined: result.refinedQuery
          },
          audio_url: audioUrl,
          conversation_id: conversationId,
          category: result.category,
          errors: result.errors || []
        };
      } catch (processingError) {
        console.error('Error processing query:', processingError);
        return NextResponse.json({
          error: 'Failed to process query',
          message: processingError.message,
          conversation_id: conversationId
        }, { status: 500 });
      }
    }
    
    // Return JSON response for non-streaming
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in voice-chat API route:', error);
    // Ensure all errors return proper JSON response, not HTML
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 });
  }
}

// Helper function to split buffer into chunks
function splitBuffer(buffer, chunkSize) {
  const chunks = [];
  let i = 0;
  while (i < buffer.length) {
    chunks.push(buffer.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
} 