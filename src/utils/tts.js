const axios = require('axios');
const config = require('../lib/config');
const { Readable } = require('stream');
const fetch = require('node-fetch');

/**
 * Convert text to speech using DeepGram's API
 * @param {string} text - The text to convert to speech
 * @returns {Promise<Buffer>} - Audio buffer in WAV format
 */
async function textToSpeech(text) {
  try {
    console.log(`Converting text to speech: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`);
    
    // Call DeepGram API
    const response = await axios.post(
      'https://api.deepgram.com/v1/speak',
      { text },
      {
        headers: {
          'Authorization': `Token ${config.deepgram.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          model: 'aura-luna-en',
          encoding: 'linear16',
          sample_rate: '16000'
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Create WAV header
    const wavBuffer = createWavHeader(response.data);
    
    console.log(`Successfully generated speech, size: ${wavBuffer.length} bytes`);
    return wavBuffer;
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    throw error;
  }
}

/**
 * Convert text to speech using DeepGram's API with streaming support
 * @param {string} text - The text to convert to speech
 * @returns {Promise<ReadableStream>} - Streaming audio response
 */
async function textToSpeechStreaming(text) {
  try {
    // Input validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('Empty or invalid text provided to TTS streaming');
      throw new Error('Empty or invalid text provided to text-to-speech streaming');
    }
    
    console.log(`Converting text to speech (streaming): "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`);
    
    // Validate required environment variables
    if (!config.deepgram || !config.deepgram.apiKey) {
      throw new Error('Missing Deepgram API key in configuration');
    }
    
    const url = new URL('https://api.deepgram.com/v1/speak');
    url.searchParams.append('model', 'aura-luna-en');
    url.searchParams.append('encoding', 'mp3'); // Using MP3 for streaming
    
    // Use fetch instead of axios for better streaming support
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.deepgram.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      // Try to get error details
      let errorDetails = '';
      try {
        const errorText = await response.text();
        if (errorText && errorText.length > 0) {
          errorDetails = errorText.slice(0, 200); // Limit to reasonable length
        }
      } catch (readError) {
        errorDetails = 'Failed to read error details: ' + readError.message;
      }
      
      throw new Error(`TTS API error: ${response.status} - ${errorDetails}`);
    }
    
    // Validate response before returning
    if (!response.body) {
      throw new Error('Received empty response body from TTS API');
    }
    
    console.log('Streaming TTS response initiated');
    
    // Create a custom ReadableStream that handles errors better
    return new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body.getReader();
          
          // Process chunks until done
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            // Only enqueue if we have valid data
            if (value && value.byteLength > 0) {
              controller.enqueue(value);
            }
          }
        } catch (streamError) {
          console.error('Error in TTS stream processing:', streamError);
          // Instead of breaking with error, send a simple error chunk and close normally
          controller.enqueue(Buffer.from('Error in audio streaming'));
          controller.close();
        }
      }
    });
  } catch (error) {
    console.error('Error in streaming text-to-speech:', error);
    
    // Return a dummy stream with error message instead of throwing
    // This prevents the calling code from crashing
    return new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from(`Error: ${error.message}`));
        controller.close();
      }
    });
  }
}

/**
 * Adaptive buffer manager for optimizing streaming performance
 */
class BufferManager {
  constructor() {
    this.initialBufferSize = 2048; // Start with reasonable default
    this.currentBufferSize = this.initialBufferSize;
    this.networkLatency = 0;
    this.lastReceiveTime = Date.now();
  }
  
  updateNetworkStats(chunkSize) {
    const now = Date.now();
    this.networkLatency = now - this.lastReceiveTime;
    this.lastReceiveTime = now;
    
    // Adaptively adjust buffer size based on network conditions
    if (this.networkLatency > 500) { // High latency
      this.currentBufferSize = Math.min(this.currentBufferSize * 1.5, 8192);
    } else if (this.networkLatency < 100) { // Low latency
      this.currentBufferSize = Math.max(this.currentBufferSize * 0.8, 1024);
    }
    
    return this.currentBufferSize;
  }
}

/**
 * Converts a Node.js Readable stream to a Web ReadableStream
 * @param {Readable} nodeStream - Node.js Readable stream
 * @returns {ReadableStream} - Web ReadableStream
 */
function nodeStreamToWebStream(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      
      nodeStream.on('end', () => {
        controller.close();
      });
      
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

/**
 * Create a WAV file header and append PCM audio data
 * @param {Buffer} pcmData - Raw PCM audio data
 * @returns {Buffer} - Complete WAV file buffer
 */
function createWavHeader(pcmData) {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;
  
  const header = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  
  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  
  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  
  // Combine header and PCM data
  return Buffer.concat([header, Buffer.from(pcmData)]);
}

module.exports = {
  textToSpeech,
  textToSpeechStreaming,
  BufferManager,
  nodeStreamToWebStream
}; 