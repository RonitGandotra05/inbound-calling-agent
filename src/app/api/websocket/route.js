import { createServer } from 'http';
import { parse } from 'url';
import WebSocket from 'ws';
import { NextResponse } from 'next/server';
import { processInboundCall } from '../../../agents/main-agent';
import { verifyAuthToken } from '../../../lib/auth';
import { textToSpeech } from '../../../utils/tts';

// Temporary in-memory storage for active conversations
const activeConversations = new Map();

// Create WebSocket server if it doesn't exist
let wss;

if (!global.wss) {
  const server = createServer();
  wss = new WebSocket.Server({ noServer: true });
  global.wss = wss;

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    console.log(`[WebSocket Server] Received upgrade request for path: ${pathname}`);
    
    if (pathname === '/api/websocket') {
      console.log(`[WebSocket Server] Handling upgrade for ${pathname}...`);
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log(`[WebSocket Server] Upgrade successful for ${pathname}, emitting connection.`);
        wss.emit('connection', ws, request);
      });
    } else {
      console.log(`[WebSocket Server] Path ${pathname} not handled. Destroying socket.`);
      socket.destroy();
    }
  });

  // Start the server
  server.listen(process.env.WEBSOCKET_PORT || 8000, () => {
    console.log(`[WebSocket Server] WebSocket server is listening on port ${process.env.WEBSOCKET_PORT || 8000}`);
  });

  // Handle WebSocket connections
  wss.on('connection', (ws, request) => {
    const clientIp = request.socket.remoteAddress;
    console.log(`[WebSocket Server] New WebSocket connection established from ${clientIp}`);
    
    let authenticated = false;
    let userId = null;
    let phoneNumber = null;
    let conversationId = null;
    const sessionData = {
      audioChunks: [],
      processingChunk: false,
      lastChunkTime: Date.now(),
      lastTranscriptionTime: 0,
      messages: [],
      intent: null,
      customerName: null,
      service: null,
      silenceCounter: 0
    };

    ws.on('message', async (message) => {
      try {
        let data;
        
        // Parse message if it's a string
        if (typeof message === 'string' || message instanceof Buffer) {
          try {
            const stringMessage = message.toString();
            if (stringMessage.startsWith('{') && stringMessage.endsWith('}')) {
              data = JSON.parse(stringMessage);
            } else {
              console.warn('Received non-JSON string message:', stringMessage.substring(0, 100));
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse message:', parseError);
            return;
          }
        } else {
          console.warn('Received non-string message type:', typeof message);
          return;
        }
        
        // Handle initialization
        if (data.type === 'init') {
          conversationId = data.conversationId || `conv-${Date.now()}`;
          phoneNumber = data.phoneNumber || 'unknown';
          
          // Initialize session
          if (!activeConversations.has(conversationId)) {
            activeConversations.set(conversationId, {
              phoneNumber,
              messages: [],
              lastActivity: Date.now()
            });
          }
          
          authenticated = true; // Simple auth for demo purposes
          
          // Send acknowledgement
          ws.send(JSON.stringify({
            type: 'init_ack',
            conversationId: conversationId
          }));
          
          console.log(`WebSocket initialized for conversation ${conversationId}`);
          return;
        }
        
        // Require authentication for all other message types
        if (!authenticated) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Not authenticated. Send init message first.'
          }));
          return;
        }
        
        // Handle audio chunk
        if (data.type === 'audio_chunk' && data.audio) {
          // Reset silence counter as we received audio
          sessionData.silenceCounter = 0;
          sessionData.lastChunkTime = Date.now();
          
          // Decode base64 audio
          try {
            let base64Audio = data.audio;
            // Remove data URL prefix if present
            if (base64Audio.includes('base64,')) {
              base64Audio = base64Audio.split('base64,')[1];
            }
            
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            sessionData.audioChunks.push(audioBuffer);
            
            // Check if we should process the chunk now
            // Only process if:
            // 1. We're not already processing
            // 2. It's been more than 500ms since last transcription
            // 3. We have enough audio data (at least 2 chunks)
            const shouldProcess = 
              !sessionData.processingChunk && 
              (Date.now() - sessionData.lastTranscriptionTime > 500) &&
              sessionData.audioChunks.length >= 2;
            
            if (shouldProcess) {
              processAudioChunks(ws, sessionData, conversationId, phoneNumber);
            }
          } catch (error) {
            console.error('Error processing audio chunk:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to process audio: ' + error.message
            }));
          }
          return;
        }
        
        // Handle recording stopped
        if (data.type === 'recording_stopped') {
          console.log('Recording stopped, processing any remaining audio chunks');
          
          // Process any remaining chunks
          if (sessionData.audioChunks.length > 0 && !sessionData.processingChunk) {
            processAudioChunks(ws, sessionData, conversationId, phoneNumber, true);
          }
          return;
        }
        
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Internal server error: ' + error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log(`[WebSocket Server] WebSocket connection closed for conversation ${conversationId} from ${clientIp}`);
      // Keep conversation data for a while before cleanup
      setTimeout(() => {
        if (conversationId && activeConversations.has(conversationId)) {
          activeConversations.delete(conversationId);
          console.log(`Cleaned up conversation ${conversationId}`);
        }
      }, 30 * 60 * 1000); // 30 minutes
    });
    
    // Setup VAD silence detection for ongoing streams
    const silenceCheckInterval = setInterval(() => {
      if (authenticated && sessionData.lastChunkTime) {
        const timeSinceLastChunk = Date.now() - sessionData.lastChunkTime;
        
        // If no audio for more than 1.5 seconds, consider it silence
        if (timeSinceLastChunk > 1500) {
          sessionData.silenceCounter++;
          
          // After 3 consecutive silence checks, process remaining audio
          if (sessionData.silenceCounter >= 3 && sessionData.audioChunks.length > 0 && !sessionData.processingChunk) {
            console.log('Silence detected, processing remaining audio');
            processAudioChunks(ws, sessionData, conversationId, phoneNumber, true);
          }
        } else {
          sessionData.silenceCounter = 0;
        }
      }
    }, 500);
    
    // Clear interval on disconnect
    ws.on('close', () => {
      clearInterval(silenceCheckInterval);
    });
  });
}

// Process audio chunks and return transcription
async function processAudioChunks(ws, sessionData, conversationId, phoneNumber, isFinal = false) {
  if (sessionData.processingChunk) return;
  
  try {
    sessionData.processingChunk = true;
    
    // Combine audio chunks
    const combinedAudio = Buffer.concat(sessionData.audioChunks);
    sessionData.audioChunks = []; // Clear chunks
    
    // Skip processing if audio is too small
    if (combinedAudio.length < 100) {
      console.log('Audio too small, skipping processing');
      sessionData.processingChunk = false;
      return;
    }
    
    // Process audio with main agent
    const result = await processInboundCall(
      combinedAudio,
      phoneNumber,
      [] // No conversation history needed since we track in session
    );
    
    // Update session data
    sessionData.lastTranscriptionTime = Date.now();
    
    // Get conversation data
    const conversationData = activeConversations.get(conversationId);
    if (!conversationData) {
      console.error(`Conversation ${conversationId} not found`);
      sessionData.processingChunk = false;
      return;
    }
    
    // Only send response if we have meaningful transcribed text
    if (result.transcribedText && result.transcribedText.trim()) {
      // Add to conversation history
      conversationData.messages.push({
        role: 'user',
        content: result.transcribedText,
        timestamp: new Date().toISOString()
      });
      
      // Send transcription
      ws.send(JSON.stringify({
        type: 'transcription',
        text: result.transcribedText
      }));
      
      // Only respond if this is final chunk or significant text
      if (isFinal || result.transcribedText.length > 20) {
        // Add agent response to conversation history
        conversationData.messages.push({
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString()
        });
        
        // Update customer information
        if (result.customerName) {
          conversationData.customerName = result.customerName;
        }
        
        if (result.category) {
          conversationData.category = result.category;
        }
        
        if (result.service) {
          conversationData.service = result.service;
        }
        
        if (result.dbActionResult) {
          conversationData.dbActionResult = result.dbActionResult;
        }
        
        // Send response
        ws.send(JSON.stringify({
          type: 'response',
          text: result.response
        }));
        
        // Send audio if available
        if (result.audioResponse) {
          ws.send(JSON.stringify({
            type: 'audio',
            data: result.audioResponse.toString('base64')
          }));
        }
      }
    }
    
    // Update last activity
    conversationData.lastActivity = Date.now();
    activeConversations.set(conversationId, conversationData);
    
  } catch (error) {
    console.error('Error processing audio chunks:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Failed to process audio: ' + error.message
    }));
  } finally {
    sessionData.processingChunk = false;
  }
}

// This is a Next.js API route handler - it won't be used directly for WebSocket
// But we need it to prevent Next.js from complaining about missing exports
export async function GET() {
  return NextResponse.json(
    { message: 'WebSocket server is running. Connect to /api/websocket with a WebSocket client.' },
    { status: 200 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is for WebSocket connections only.' },
    { status: 405 }
  );
} 