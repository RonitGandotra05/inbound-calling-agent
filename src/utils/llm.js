const config = require('../lib/config');
const Cerebras = require('@cerebras/cerebras_cloud_sdk'); // Import Cerebras SDK

// Initialize Cerebras Client using API key from config/env
const cerebras = new Cerebras({
  apiKey: config.cerebras.apiKey // Use the key from environment via config
});

/**
 * Function to handle chat-like conversations with Cerebras using the SDK.
 * Note: The SDK might primarily support streaming. This function will collect the stream.
 * @param {Array<object>} messages - Array of message objects ({ role: 'user'/'assistant'/'system', content: '...' })
 * @param {object} options - Optional parameters (model, max_tokens, temperature, top_p)
 * @returns {Promise<string>} - The complete assistant response string.
 */
async function cerebrasChat(messages, options = {}) {
  if (!config.cerebras.apiKey) {
    throw new Error('Cerebras API key not configured.');
  }

  try {
    const stream = await cerebras.chat.completions.create({
      messages: messages,
      model: options.model || 'llama-3.3-70b', // Default model from your example
      stream: true, // SDK seems oriented towards streaming
      max_completion_tokens: options.max_tokens || options.maxTokens || 2048, // Allow different naming conventions
      temperature: options.temperature || 0.2,
      top_p: options.top_p || 1
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk.choices[0]?.delta?.content || '';
    }
    
    console.log('Cerebras chat completion successful.');
    return fullResponse.trim();

  } catch (error) {
    console.error('Error calling Cerebras SDK:', error);
    throw new Error(`Failed to get chat completion from Cerebras: ${error.message}`);
  }
}

// REMOVE old axios-based functions if they exist
// async function cerebrasCompletion(...) { ... }

module.exports = {
  // Only export the new chat function
  cerebrasChat
}; 