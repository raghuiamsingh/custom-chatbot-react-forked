require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// BotDojo API configuration - using correct values from working curl command
const BOTDOJO_API_KEY = 'd79fa8f7-d776-431e-8fbc-56f47deb79d5';
const BOTDOJO_ACCOUNT_ID = 'afa02f70-4182-11f0-a4dd-cb9f7db4f88a';
const BOTDOJO_PROJECT_ID = 'cbeee3b0-4182-11f0-b112-85b41bbb6a74';
const BOTDOJO_FLOW_ID = '596f6181-5c0c-11f0-86ab-7561582ecdb8';
const BOTDOJO_BASE_URL = 'https://api.botdojo.com/api/v1';

// Function to normalize BotDojo response into our message format
function normalizeBotDojoResponse(botdojoResponse) {
  const messages = [];

  // Handle BotDojo flow run response structure
  if (botdojoResponse.response && botdojoResponse.response.text_output) {
    // Extract the main text response
    messages.push({
      role: 'bot',
      type: 'text',
      content: { text: botdojoResponse.response.text_output }
    });
  } else if (botdojoResponse.steps && Array.isArray(botdojoResponse.steps)) {
    // Handle steps array - look for the final output step
    const outputStep = botdojoResponse.steps.find(step => 
      step.stepLabel === 'Output' && step.content
    );
    
    if (outputStep && outputStep.content) {
      messages.push({
        role: 'bot',
        type: 'text',
        content: { text: outputStep.content }
      });
    } else {
      // Fallback: use the last step with content
      const lastStepWithContent = botdojoResponse.steps
        .filter(step => step.content && step.content.trim())
        .pop();
      
      if (lastStepWithContent) {
        messages.push({
          role: 'bot',
          type: 'text',
          content: { text: lastStepWithContent.content }
        });
      }
    }
  } else if (botdojoResponse.output && Array.isArray(botdojoResponse.output)) {
    // If BotDojo returns an array of outputs
    botdojoResponse.output.forEach(output => {
      if (output.type === 'text') {
        messages.push({
          role: 'bot',
          type: 'text',
          content: { text: output.text || output.content || '' }
        });
      } else if (output.type === 'buttons') {
        messages.push({
          role: 'bot',
          type: 'buttons',
          content: { options: output.options || output.buttons || [] }
        });
      } else if (output.type === 'card') {
        messages.push({
          role: 'bot',
          type: 'card',
          content: {
            title: output.title || '',
            description: output.description || '',
            image: output.image
          }
        });
      } else if (output.type === 'list') {
        messages.push({
          role: 'bot',
          type: 'list',
          content: { list: output.list || output.items || [] }
        });
      } else {
        // Default to text for unknown types
        messages.push({
          role: 'bot',
          type: 'text',
          content: { text: JSON.stringify(output) }
        });
      }
    });
  } else if (botdojoResponse.text || botdojoResponse.message) {
    // If BotDojo returns a simple text response
    messages.push({
      role: 'bot',
      type: 'text',
      content: { text: botdojoResponse.text || botdojoResponse.message }
    });
  } else {
    // Fallback for unknown response structure
    messages.push({
      role: 'bot',
      type: 'text',
      content: { text: 'Sorry, I could not process your message.' }
    });
  }
  
  return messages;
}

// POST /chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    console.log('Received message:', message);

    // Validate required environment variables
    if (!BOTDOJO_API_KEY || !BOTDOJO_BASE_URL || !BOTDOJO_ACCOUNT_ID || !BOTDOJO_PROJECT_ID || !BOTDOJO_FLOW_ID) {
      throw new Error('Missing BotDojo configuration. Please set all required BotDojo environment variables');
    }

    // Construct BotDojo endpoint
    const botdojoEndpoint = `${BOTDOJO_BASE_URL}/accounts/${BOTDOJO_ACCOUNT_ID}/projects/${BOTDOJO_PROJECT_ID}/flows/${BOTDOJO_FLOW_ID}/run`;
    
    const requestBody = {
      body: {
        text_input: message
      }
    };

    console.log('Calling BotDojo API:', botdojoEndpoint);

    // Call BotDojo API
    const botdojoResponse = await fetch(botdojoEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': BOTDOJO_API_KEY,
        'X-API-Key': BOTDOJO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!botdojoResponse.ok) {
      const errorText = await botdojoResponse.text();
      throw new Error(`BotDojo API error: ${botdojoResponse.status} ${botdojoResponse.statusText} - ${errorText}`);
    }

    const botdojoData = await botdojoResponse.json();

    // Normalize the response
    const messages = normalizeBotDojoResponse(botdojoData);

    // Return normalized response
    res.json({ messages });

  } catch (error) {
    console.error('Error processing chat request:', error);
    
    // Return error message in our format
    res.json({
      messages: [{
        role: 'bot',
        type: 'text',
        content: { text: `Error: ${error.message}` }
      }]
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Chat endpoint: http://localhost:${PORT}/chat`);
  console.log('Make sure to set BOTDOJO_API_KEY, BOTDOJO_BASE_URL, and BOTDOJO_FLOW_ID environment variables');
});

module.exports = app;