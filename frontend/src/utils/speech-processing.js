const axios = require('axios');
const config = require('../lib/config');
const fs = require('fs').promises; // Use promise-based fs
const os = require('os');
const path = require('path');
const Groq = require('groq-sdk'); // Import Groq SDK
const { v4: uuidv4 } = require('uuid'); // For unique temp filenames

// Initialize Groq Client (Using hardcoded key as requested - NOT RECOMMENDED)
const groq = new Groq({ 
  apiKey: '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' 
});

/**
 * Transcribe audio using Groq API
 * @param {Buffer} audioData - Audio data as a Buffer
 * @returns {Promise<string>} - The transcribed text
 */
async function transcribeAudio(audioData) {
  const tempFilePath = path.join(os.tmpdir(), `groq-audio-${uuidv4()}.wav`);
  let transcriptionText = '';

  try {
    // 1. Save buffer to temporary file
    await fs.writeFile(tempFilePath, audioData);
    console.log(`Temporary audio file saved to: ${tempFilePath}`);

    // 2. Create read stream from the temporary file
    const fileStream = require('fs').createReadStream(tempFilePath);

    // 3. Call Groq API
    console.log('Sending audio to Groq for transcription...');
    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-large-v3-turbo", // Using the model from your example
      // response_format: "verbose_json", // Optional: get more details if needed
    });
    console.log('Groq transcription successful.');

    transcriptionText = transcription.text;
    
  } catch (error) {
    console.error('Error transcribing audio with Groq:', error);
    throw error; // Re-throw the error to be caught by the calling function
  } finally {
    // 4. Clean up the temporary file
    try {
      await fs.unlink(tempFilePath);
      console.log(`Temporary audio file deleted: ${tempFilePath}`);
    } catch (cleanupError) {
      console.error(`Error deleting temporary audio file ${tempFilePath}:`, cleanupError);
      // Don't throw here, as the main operation might have succeeded
    }
  }
  
  return transcriptionText;
}

/**
 * Refine transcribed text to fix common STT errors
 * @param {string} text - The raw transcribed text
 * @returns {string} - The refined text
 */
async function refineTranscription(text) {
  try {
    // Simple refinement rules for common STT errors
    let refined = text;
    
    // Fix common number and word confusions
    refined = refined.replace(/(?:for|to|too)\s+(\d+)/gi, '$1');
    
    // Fix common speech artifacts
    refined = refined.replace(/(?:um|uh|like|you know)\s+/gi, '');
    
    // Fix hesitations
    refined = refined.replace(/\s+(?:-|\.\.\.)\s+/g, ' ');
    
    // Normalize spacing
    refined = refined.replace(/\s+/g, ' ').trim();
    
    // For more complex refinement, we could use an LLM
    if (text.length > 20 && config.openai.apiKey) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a transcript editor. Fix any speech-to-text errors while preserving the original meaning. Remove filler words and normalize the text.'
              },
              {
                role: 'user',
                content: `Fix this speech-to-text transcript: "${text}"`
              }
            ],
            temperature: 0.3,
            max_tokens: 200
          },
          {
            headers: {
              'Authorization': `Bearer ${config.openai.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const refinedByLLM = response.data.choices[0].message.content.trim();
        if (refinedByLLM && refinedByLLM.length > 10) {
          refined = refinedByLLM.replace(/^["']|["']$/g, ''); // Remove quotes if added by LLM
        }
      } catch (llmError) {
        console.warn('LLM refinement failed, using basic refinement:', llmError.message);
      }
    }
    
    return refined;
  } catch (error) {
    console.error('Error refining transcription:', error);
    return text; // Return the original text if refinement fails
  }
}

module.exports = {
  transcribeAudio,
  refineTranscription
}; 