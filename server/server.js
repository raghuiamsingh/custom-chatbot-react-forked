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

// BotDojo API configuration
const BOTDOJO_API_KEY = process.env.BOTDOJO_API_KEY;
const BOTDOJO_BASE_URL = process.env.BOTDOJO_BASE_URL;
const BOTDOJO_FLOW_ID = process.env.BOTDOJO_FLOW_ID;

// Function to normalize BotDojo response into our message format
function normalizeBotDojoResponse(botdojoResponse) {
  const messages = [];
  
  // Handle BotDojo response structure
  if (botdojoResponse.output && Array.isArray(botdojoResponse.output)) {
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
    if (!BOTDOJO_API_KEY || !BOTDOJO_BASE_URL || !BOTDOJO_FLOW_ID) {
      throw new Error('Missing BotDojo configuration. Please set BOTDOJO_API_KEY, BOTDOJO_BASE_URL, and BOTDOJO_FLOW_ID');
    }

    // Construct BotDojo endpoint
    const botdojoEndpoint = `${BOTDOJO_BASE_URL}/${BOTDOJO_FLOW_ID}/run`;

    // Call BotDojo API
    const botdojoResponse = await fetch(botdojoEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': BOTDOJO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: message,
        stream: false
      })
    });

    if (!botdojoResponse.ok) {
      throw new Error(`BotDojo API error: ${botdojoResponse.status} ${botdojoResponse.statusText}`);
    }

    const botdojoData = await botdojoResponse.json();
    console.log('BotDojo response:', botdojoData);

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
        content: { text: 'Error contacting BotDojo.' }
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