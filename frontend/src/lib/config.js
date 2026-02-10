// Configuration file for API keys and endpoints
module.exports = {
  // OpenAI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  // PostgreSQL Database Configuration from Neon
  db: {
    connectionString: process.env.NEON_DB_CONNECTION_STRING
  },
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  
  // STT Configuration - Whisper
  whisper: {
    apiKey: process.env.WHISPER_API_KEY
  },
  
  // LLM Configuration - Cerebras
  cerebras: {
    apiKey: process.env.CEREBRAS_API_KEY,
    endpoint: 'https://api.cerebras.ai/v1'
  },
  
  // TTS Configuration - DeepGram
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
    endpoint: 'https://api.deepgram.com/v1'
  },
  
  // UltraMessage API (WhatsApp)
  ultramessage: {
    apiKey: process.env.ULTRAMESSAGE_API_KEY,
    endpoint: 'https://api.ultramsg.com/'
  },
  
  // Admin Configuration
  admin: {
    apiKey: process.env.ADMIN_API_KEY,
    enabled: process.env.ADMIN_ENABLED === 'true',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
  }
}; 