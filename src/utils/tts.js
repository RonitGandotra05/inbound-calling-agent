const axios = require('axios');
const config = require('../lib/config');

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
  textToSpeech
}; 