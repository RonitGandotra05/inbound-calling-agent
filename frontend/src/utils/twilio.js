const twilio = require('twilio');
const config = require('../lib/config');

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// Helper to create TwiML response
function createTwiMLResponse() {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  return new VoiceResponse();
}

// Helper to send TTS audio back to the call
function respondWithTwiML(twiml) {
  return {
    headers: {
      'Content-Type': 'text/xml'
    },
    body: twiml.toString()
  };
}

// Generate TwiML to stream audio from a URL
function streamAudioResponse(audioUrl) {
  const twiml = createTwiMLResponse();
  twiml.play(audioUrl);
  return respondWithTwiML(twiml);
}

// Generate TwiML to gather speech input
function gatherSpeechInput(actionUrl, options = {}) {
  const twiml = createTwiMLResponse();
  
  const gather = twiml.gather({
    input: 'speech',
    action: actionUrl,
    method: 'POST',
    speechTimeout: options.speechTimeout || 'auto',
    speechModel: options.speechModel || 'phone_call',
    enhanced: options.enhanced || true,
    language: options.language || 'en-US'
  });
  
  if (options.prompt) {
    gather.say(options.prompt);
  }
  
  // If no speech is detected, redirect back to the same endpoint
  twiml.redirect(actionUrl);
  
  return respondWithTwiML(twiml);
}

// Generate TwiML to say text using Twilio's text-to-speech
function sayText(text, options = {}) {
  const twiml = createTwiMLResponse();
  twiml.say({
    voice: options.voice || 'alice',
    language: options.language || 'en-US'
  }, text);
  
  return respondWithTwiML(twiml);
}

module.exports = {
  twilioClient,
  createTwiMLResponse,
  respondWithTwiML,
  streamAudioResponse,
  gatherSpeechInput,
  sayText
}; 