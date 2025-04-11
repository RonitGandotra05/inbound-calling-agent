# Agent-Based Inbound Calling System

This project implements an agent-based inbound calling system using LangGraph.js, Next.js, and various AI APIs. The system handles inbound calls through Twilio, processes speech input, classifies user intent, and generates appropriate responses.

## Architecture

The system follows this flow:
1. **Inbound Call Handling**: Twilio API receives the call
2. **Speech-to-Text**: Whisper API transcribes audio to text
3. **Refiner Agent**: Cleans and prepares user queries
4. **Intent Classifier**: Categorizes queries (enquiry, complaint, booking, feedback)
5. **Category-Specific Agents**: Process queries based on their category
6. **Response Validation**: Ensures responses are relevant and helpful
7. **Text-to-Speech**: DeepGram API converts text responses to speech
8. **Call Response**: Twilio plays the audio response to the user

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Neon DB)
- Twilio account
- OpenAI API key (for Whisper)
- Cerebras API key
- DeepGram API key
- (Optional) Google Calendar API access
- (Optional) UltraMessage API access for WhatsApp reminders

### Installation

1. Clone the repository
```
git clone <repository-url>
cd inbound-calling-agent
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
   - Copy the `.env.local.example` file to `.env.local`
   - Fill in your API keys and configuration settings

4. Initialize the database
```
npm run db:init
```

5. Start the development server
```
npm run dev
```

6. In a separate terminal, run LangGraph Studio for agent visualization
```
npm run langgraph:dev
```

## Using the System

### Admin Dashboard

Access the admin dashboard at [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Default login: 
  - Email: admin@example.com
  - Password: admin123

The dashboard provides:
- Call statistics
- Recent calls list
- Agent performance metrics

### Testing Inbound Calls

1. Use Twilio's dashboard to configure your Twilio number to point to your webhook URL:
   - Set Voice Webhook to: `https://your-domain.com/api/twilio/inbound-call`
   - Ensure your server is publicly accessible or use a tool like ngrok

2. Call your configured Twilio number to interact with the system.

### Visualizing Agent Graphs

LangGraph Studio provides a visualization of the agent graph at [http://localhost:3001](http://localhost:3001)

You can:
- View the agent graph structure
- Examine the flow of data between agents
- Debug agent interactions

## Development

### Project Structure

- `/src/agents/` - Contains all agent definitions
- `/src/utils/` - Utility functions for various integrations
- `/src/app/api/` - API endpoints for Twilio, authentication, etc.
- `/src/app/admin/` - Admin dashboard components

### Adding New Functionality

To extend the system:
1. Create new category-specific agents in `/src/agents/`
2. Add necessary tools to those agents
3. Update the intent classifier to recognize the new categories
4. Update the orchestrator to route to the new agents

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Visual Editing of LangGraph Workflows

To visually edit LangGraph workflows:

1. Install the LangGraph CLI (already included in package.json):
   ```
   npm install -g @langchain/langgraph-cli
   ```

2. Start the LangGraph Studio:
   ```
   npm run langgraph:dev
   ```

3. The studio will open in your browser at http://localhost:3000

4. Create or edit graphs visually:
   - Add nodes for different agents or processing steps
   - Connect nodes to create the flow
   - Set conditions for branching logic
   - Configure node properties

5. Test the graph execution with the built-in playground

6. Export the generated code to your application

7. To analyze call flows, you can use the trace viewer:
   ```
   npm run langgraph:trace
   ```

With LangGraph Studio, you can create complex conversation flows for the inbound calling system visually, making it easier to design and maintain the agent logic.
