const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const config = require('../lib/config');

// Function to convert audio to text using Whisper API
async function transcribeAudio(audioBuffer) {
  try {
    // Create a temporary file to store the audio
    const tempFilePath = `/tmp/audio-${Date.now()}.wav`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Default to English, but Whisper can auto-detect

    // Make request to Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${config.whisper.apiKey}`,
        },
      }
    );

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return response.data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error.response?.data || error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio
}; 