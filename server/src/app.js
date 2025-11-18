const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const { serverConfig } = require('./config/environment');
const BotDojoService = require('./services/BotDojoService');
const { botdojoConfig } = require('./config/environment');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/chat', limiter);
app.use('/suggestions', limiter);

// CORS configuration
app.use(cors({
  origin: serverConfig.corsOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-Request-ID', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../../dist')));

// Serve static files from the public directory (fallback)
app.use(express.static('public'));

// Helper function to extract and parse BotDojo config from headers
function getBotDojoConfigFromHeaders(req) {
  const configHeader = req.headers['x-botdojo-config'];
  
  if (!configHeader) {
    throw new Error('BotDojo configuration is required in X-BotDojo-Config header.');
  }
  
  let config;
  try {
    config = typeof configHeader === 'string' ? JSON.parse(configHeader) : configHeader;
  } catch (error) {
    throw new Error('Invalid BotDojo configuration format in X-BotDojo-Config header. Expected JSON.');
  }
  
  // Validate required fields
  if (!config.BOTDOJO_API_KEY || !config.BOTDOJO_BASE_URL || !config.BOTDOJO_ACCOUNT_ID || !config.BOTDOJO_PROJECT_ID || !config.BOTDOJO_FLOW_ID) {
    throw new Error('BotDojo configuration is incomplete. Please provide all required BotDojo credentials (BOTDOJO_API_KEY, BOTDOJO_BASE_URL, BOTDOJO_ACCOUNT_ID, BOTDOJO_PROJECT_ID, BOTDOJO_FLOW_ID).');
  }
  
  return {
    BOTDOJO_API_KEY: config.BOTDOJO_API_KEY,
    BOTDOJO_BASE_URL: config.BOTDOJO_BASE_URL,
    BOTDOJO_ACCOUNT_ID: config.BOTDOJO_ACCOUNT_ID,
    BOTDOJO_PROJECT_ID: config.BOTDOJO_PROJECT_ID,
    BOTDOJO_FLOW_ID: config.BOTDOJO_FLOW_ID,
  };
}

// Helper function to get BotDojoService instance from headers
function getBotDojoService(req) {
  const requestConfig = getBotDojoConfigFromHeaders(req);
  
  const config = {
    apiKey: requestConfig.BOTDOJO_API_KEY,
    baseUrl: requestConfig.BOTDOJO_BASE_URL,
    accountId: requestConfig.BOTDOJO_ACCOUNT_ID,
    projectId: requestConfig.BOTDOJO_PROJECT_ID,
    flowId: requestConfig.BOTDOJO_FLOW_ID,
    mediaBase: botdojoConfig.mediaBase,
  };
  
  return new BotDojoService(config);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: serverConfig.nodeEnv
  });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required and must be a non-empty string' 
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({ 
        error: 'Message is too long. Maximum length is 1000 characters.' 
      });
    }

    console.log('Received message:', message);

    // Get BotDojoService instance from headers
    const service = getBotDojoService(req);
    const requestConfig = getBotDojoConfigFromHeaders(req);
    const activeConfig = {
      apiKey: requestConfig.BOTDOJO_API_KEY,
      baseUrl: requestConfig.BOTDOJO_BASE_URL,
      accountId: requestConfig.BOTDOJO_ACCOUNT_ID,
      projectId: requestConfig.BOTDOJO_PROJECT_ID,
      flowId: requestConfig.BOTDOJO_FLOW_ID,
    };

    // Call BotDojo API
    const botdojoResponse = await service.sendMessage(message.trim());

    // Normalize the response
    const messages = service.normalizeResponse(botdojoResponse);

    // Log the normalized messages
    console.log('\n=== NORMALIZED MESSAGES ===');
    console.log(JSON.stringify(messages, null, 2));
    console.log('=== END NORMALIZED MESSAGES ===\n');

    // Return normalized response with raw data for browser console
    res.json({ 
      messages,
      debug: {
        rawBotDojoResponse: botdojoResponse,
        endpoint: `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
        requestBody: { body: { text_input: message.trim() } }
      }
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    
    // Return error message in our format
    res.json({
      messages: [{
        id: `msg-${Date.now()}-error`,
        role: 'bot',
        type: 'text',
        content: { text: `Error: ${error.message}` }
      }]
    });
  }
});

// Debug endpoint to see raw BotDojo response
app.post('/debug-botdojo', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    // Get BotDojoService instance from headers
    const service = getBotDojoService(req);
    const requestConfig = getBotDojoConfigFromHeaders(req);
    const activeConfig = {
      apiKey: requestConfig.BOTDOJO_API_KEY,
      baseUrl: requestConfig.BOTDOJO_BASE_URL,
      accountId: requestConfig.BOTDOJO_ACCOUNT_ID,
      projectId: requestConfig.BOTDOJO_PROJECT_ID,
      flowId: requestConfig.BOTDOJO_FLOW_ID,
    };

    // Call BotDojo API
    const botdojoResponse = await service.sendMessage(message.trim());

    // Return the raw response for inspection
    res.json({
      success: true,
      rawResponse: botdojoResponse,
      endpoint: `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
      requestBody: { body: { text_input: message.trim() } }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug request failed',
      details: error.message
    });
  }
});

// Suggestions endpoint for multiple question sets
app.post('/suggestions', async (req, res) => {
  try {
    const { context, currentSetIndex = 0 } = req.body;
    
    // Input validation
    if (currentSetIndex < 0 || !Number.isInteger(currentSetIndex)) {
      return res.status(400).json({ error: 'currentSetIndex must be a non-negative integer' });
    }
    
    console.log('Received suggestions request:', { context, currentSetIndex });

    // Get BotDojoService instance from headers
    const service = getBotDojoService(req);

    // Call BotDojo API for suggestions
    const botdojoResponse = await service.sendMessage(
      context || "Please provide suggested follow-up questions",
      { requestType: "suggestions" }
    );

    console.log('=== RAW BOTDOJO RESPONSE ===');
    console.log(JSON.stringify(botdojoResponse, null, 2));
    console.log('=== END RAW RESPONSE ===');

    // Extract and normalize suggestions from BotDojo response
    const suggestedQuestions = service.extractSuggestedQuestions(botdojoResponse);
    
    console.log('=== NORMALIZED SUGGESTIONS ===');
    console.log(JSON.stringify(suggestedQuestions, null, 2));
    console.log('=== END NORMALIZED SUGGESTIONS ===');

    res.json({
      suggestedQuestions,
      totalSets: suggestedQuestions.length,
      currentSetIndex: currentSetIndex % suggestedQuestions.length
    });

  } catch (error) {
    console.error('Suggestions endpoint error:', error);
    
    // Fallback to default suggestions
    const defaultSuggestions = [
      [
        "What supplements can help with sleep?",
        "What can I take for stress?", 
        "How do I support my immune system?"
      ],
      [
        "What vitamins should I take daily?",
        "Are there supplements for energy and focus?",
        "What helps with digestion?"
      ],
      [
        "What are natural-only options?",
        "Which supplements support recovery?",
        "What helps with heart health?"
      ]
    ];

    res.json({
      suggestedQuestions: defaultSuggestions,
      totalSets: defaultSuggestions.length,
      currentSetIndex: 0,
      error: 'Using fallback suggestions',
      details: error.message
    });
  }
});

// Test endpoint for different structured content types
app.post('/test-structured', (req, res) => {
  try {
    const { contentType } = req.body;
    
    // Input validation
    const validContentTypes = ['guide', 'faq', 'labResult', 'image', 'linkList', 'product'];
    if (!contentType || !validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ')
      });
    }
    
    let testMessage;
    
    switch (contentType) {
      case 'guide':
        testMessage = {
          id: `msg-${Date.now()}-guide`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here's a comprehensive guide for better sleep hygiene:"
          },
          structured: {
            type: 'guide',
            data: [
              { step: "Go to bed at the same time every night, even on weekends" },
              { step: "Reduce screen time 1 hour before bedtime" },
              { step: "Create a cool, dark, and quiet sleep environment" },
              { step: "Avoid caffeine after 2 PM" },
              { step: "Practice relaxation techniques like deep breathing" },
              { step: "Limit naps to 20-30 minutes and avoid late afternoon naps" }
            ]
          }
        };
        break;
        
      case 'faq':
        testMessage = {
          id: `msg-${Date.now()}-faq`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here are some frequently asked questions about supplements:"
          },
          structured: {
            type: 'faq',
            data: [
              { 
                question: "What is ashwagandha?", 
                answer: "Ashwagandha is an adaptogenic herb that supports stress response and helps the body adapt to physical and mental stress. It's commonly used for anxiety, sleep, and energy support." 
              },
              { 
                question: "Are supplements safe to take?", 
                answer: "Supplements can be safe when taken as directed, but it depends on the product quality, individual needs, and interactions with medications. Always consult with a healthcare practitioner before starting new supplements." 
              },
              { 
                question: "How long does it take for supplements to work?", 
                answer: "Most supplements take 2-4 weeks to show noticeable effects, though some may work faster or slower depending on the individual and the specific supplement. Consistency is key for best results." 
              },
              { 
                question: "Can I take multiple supplements together?", 
                answer: "Many supplements can be taken together, but some may interact with each other or with medications. It's important to research interactions and consult with a healthcare provider about your specific supplement regimen." 
              }
            ]
          }
        };
        break;
        
      case 'labResult':
        testMessage = {
          id: `msg-${Date.now()}-lab`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here's a summary of your recent lab results:"
          },
          structured: {
            type: 'labResult',
            data: [
              { 
                label: "Vitamin D", 
                value: "34 ng/mL", 
                range: "30–100 ng/mL",
                status: "Low",
                note: "Consider supplementation, especially during winter months"
              },
              { 
                label: "Iron", 
                value: "55 µg/dL", 
                range: "50–170 µg/dL",
                status: "Normal",
                note: "Within healthy range"
              },
              { 
                label: "B12", 
                value: "450 pg/mL", 
                range: "200–900 pg/mL",
                status: "Normal",
                note: "Adequate levels for energy and nerve function"
              },
              { 
                label: "Magnesium", 
                value: "1.8 mg/dL", 
                range: "1.7–2.2 mg/dL",
                status: "Normal",
                note: "Good levels for muscle and nerve function"
              }
            ]
          }
        };
        break;
        
      case 'image':
        testMessage = {
          id: `msg-${Date.now()}-image`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here are some helpful diagrams for understanding sleep cycles:"
          },
          structured: {
            type: 'image',
            data: [
              {
                url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400",
                alt: "Sleep cycle diagram",
                caption: "Understanding the 4 stages of sleep"
              },
              {
                url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
                alt: "Circadian rhythm chart",
                caption: "Natural sleep-wake cycle over 24 hours"
              }
            ]
          }
        };
        break;
        
      case 'linkList':
        testMessage = {
          id: `msg-${Date.now()}-links`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here are some helpful resources for learning more about sleep health:"
          },
          structured: {
            type: 'linkList',
            data: [
              {
                title: "National Sleep Foundation",
                description: "Comprehensive sleep health information and guidelines",
                url: "https://www.sleepfoundation.org",
                icon: "https://www.sleepfoundation.org/favicon.ico"
              },
              {
                title: "Sleep Education by AASM",
                description: "Educational resources from the American Academy of Sleep Medicine",
                url: "https://sleepeducation.org",
                icon: "https://sleepeducation.org/favicon.ico"
              },
              {
                title: "CDC Sleep and Health",
                description: "Government resources on sleep and public health",
                url: "https://www.cdc.gov/sleep",
                icon: "https://www.cdc.gov/favicon.ico"
              }
            ]
          }
        };
        break;
        
      case 'product':
        testMessage = {
          id: `msg-${Date.now()}-products`,
          role: 'bot',
          type: 'text',
          content: {
            text: "Here are some recommended supplements for better sleep and stress relief:"
          },
          structured: {
            type: 'product',
            data: [
              {
                sku: "MAG-001",
                productId: "12345",
                title: "Magnesium Glycinate",
                imageUrl: "https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Magnesium+Glycinate",
                description: "High-quality magnesium glycinate for better sleep and muscle relaxation. This chelated form is highly bioavailable and gentle on the stomach.",
                url: "https://example.com/product/mag-001"
              },
              {
                sku: "ASH-002",
                productId: "12346",
                title: "Ashwagandha Root Extract",
                imageUrl: "https://via.placeholder.com/400x300/059669/FFFFFF?text=Ashwagandha",
                description: "Adaptogenic herb that helps reduce stress and anxiety while supporting healthy cortisol levels and sleep quality.",
                url: "https://example.com/product/ash-002"
              },
              {
                sku: "MEL-003",
                productId: "12347",
                title: "Melatonin 3mg",
                description: "Natural sleep hormone supplement to help regulate your sleep-wake cycle and improve sleep onset.",
                url: "https://example.com/product/mel-003"
              }
            ]
          }
        };
        break;
    }
    
    res.json({ messages: [testMessage] });
    
  } catch (error) {
    console.error('Test structured endpoint error:', error);
    res.status(500).json({
      error: 'Test request failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: serverConfig.nodeEnv === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(serverConfig.port, () => {
  console.log(`🚀 Server running on port ${serverConfig.port}`);
  console.log(`📊 Health check: http://localhost:${serverConfig.port}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${serverConfig.port}/chat`);
  console.log(`🔍 Debug endpoint: http://localhost:${serverConfig.port}/debug-botdojo`);
  console.log(`❓ Suggestions endpoint: http://localhost:${serverConfig.port}/suggestions`);
  console.log(`🧪 Test structured endpoint: http://localhost:${serverConfig.port}/test-structured`);
  console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
