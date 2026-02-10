require('dotenv').config();
const { processQuery } = require('../src/agents/orchestrator');

// Enable LangGraph tracing
process.env.LANGCHAIN_TRACING_V2 = 'true';
process.env.LANGCHAIN_ENDPOINT = 'http://localhost:3001';
process.env.LANGCHAIN_PROJECT = 'inbound-calling-agent';
process.env.LANGCHAIN_API_KEY = 'development-key';

async function runExample() {
  console.log('Running example query through the agent system...');
  
  // Example query: Booking request
  const exampleQuery = "I'd like to book an appointment for next Tuesday at 3pm for a consultation.";
  
  // Mock conversation ID for the example
  const mockConversationId = 123;
  
  // Mock conversation history for context
  const mockHistory = [
    { role: 'user', content: 'Hello, I need some help with booking.' },
    { role: 'assistant', content: 'Of course, I can help you with booking. What kind of booking would you like to make?' }
  ];
  
  try {
    console.log(`Processing query: "${exampleQuery}"`);
    
    const result = await processQuery(exampleQuery, mockConversationId, mockHistory);
    
    console.log('Agent processing complete!');
    console.log('---------------------------');
    console.log(`Refined Query: ${result.refinedQuery}`);
    console.log(`Category: ${result.category}`);
    console.log(`Response: ${result.response}`);
    console.log(`Valid: ${result.isValid}`);
    console.log(`Errors: ${result.errors.length > 0 ? result.errors.join('\n') : 'None'}`);
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
runExample()
  .then(() => {
    console.log('\nExample completed. Check LangGraph Studio at http://localhost:3001 to view the agent graph and traces.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to run example:', error);
    process.exit(1);
  }); 