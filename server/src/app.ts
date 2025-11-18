import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';

import { serverConfig } from './config/environment';
import BotDojoService from './services/BotDojoService';
import { botdojoConfig } from './config/environment';
import { logger } from './utils/logger';
import {
  errorHandler,
  asyncHandler,
  requestIdMiddleware,
  requestLoggingMiddleware,
  validateString,
  validateNumber,
  validateEnum,
  sanitizeString
} from './utils/errorHandler';
import { cacheManager } from './utils/cacheManager';
import { getPublicKey, decryptData, isEncryptedData } from './utils/encryption';
import {
  ChatRequest,
  ChatResponse,
  SuggestionsRequest,
  SuggestionsResponse,
  TestStructuredRequest,
  Message
} from './types';

const app = express();

// trust AWS proxy so express-rate-limit sees the real IP
app.set('trust proxy', 1);

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

// Request ID middleware
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLoggingMiddleware);

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
  allowedHeaders: ['Content-Type', 'X-Request-ID']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../../dist')));

// Serve static files from the public directory (fallback)
app.use(express.static('public'));

// Helper function to extract and parse BotDojo config from request body
// Supports both encrypted and plain text (for backward compatibility)
function getBotDojoConfigFromBody(req: Request): {
  BOTDOJO_API_KEY: string;
  BOTDOJO_BASE_URL: string;
  BOTDOJO_ACCOUNT_ID: string;
  BOTDOJO_PROJECT_ID: string;
  BOTDOJO_FLOW_ID: string;
} {
  const body = req.body as any;
  const configData = body?.initData;

  if (!configData) {
    logger.error('Missing initData in request body', {
      requestId: req.headers['x-request-id'] as string,
      bodyKeys: body ? Object.keys(body) : 'body is undefined'
    });
    throw new Error('BotDojo configuration is required in request body as initData field.');
  }

  let configString: string;

  // Check if the data is encrypted (base64-encoded encrypted data)
  if (typeof configData === 'string' && isEncryptedData(configData)) {
    try {
      // Decrypt the encrypted data
      configString = decryptData(configData);
      logger.info('Decrypted BotDojo config from body', { requestId: req.headers['x-request-id'] as string });
    } catch (error) {
      throw new Error(`Failed to decrypt BotDojo configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Plain text (backward compatibility) or already an object
    if (typeof configData === 'string') {
      configString = configData;
    } else {
      // Already an object, stringify it
      configString = JSON.stringify(configData);
    }
  }

  let config;
  try {
    config = JSON.parse(configString);
  } catch (error) {
    throw new Error('Invalid BotDojo configuration format in request body. Expected JSON.');
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

// Helper function to get BotDojoService instance from request body
// Accepts optional config to avoid duplicate parsing
function getBotDojoService(req: Request, requestConfig?: {
  BOTDOJO_API_KEY: string;
  BOTDOJO_BASE_URL: string;
  BOTDOJO_ACCOUNT_ID: string;
  BOTDOJO_PROJECT_ID: string;
  BOTDOJO_FLOW_ID: string;
}): BotDojoService {
  // Use provided config or parse from body
  const config = requestConfig || getBotDojoConfigFromBody(req);

  const serviceConfig = {
    apiKey: config.BOTDOJO_API_KEY,
    baseUrl: config.BOTDOJO_BASE_URL,
    accountId: config.BOTDOJO_ACCOUNT_ID,
    projectId: config.BOTDOJO_PROJECT_ID,
    flowId: config.BOTDOJO_FLOW_ID,
    mediaBase: botdojoConfig.mediaBase,
  };

  return new BotDojoService(serviceConfig as any);
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const cacheStats = cacheManager.getStats();

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: serverConfig.nodeEnv,
    cache: {
      keys: cacheStats.keys,
      hitRate: Math.round(cacheStats.hitRate * 100) + '%',
      memory: {
        keys: cacheStats.ksize,
        values: cacheStats.vsize
      }
    }
  });
});

// Public key endpoint for RSA encryption
app.get('/encryption/public-key', (req: Request, res: Response) => {
  try {
    const publicKey = getPublicKey();
    res.json({
      publicKey,
      algorithm: 'RSA-OAEP',
      keySize: 4096,
      hash: 'SHA-256'
    });
  } catch (error) {
    logger.error('Failed to get public key', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      error: 'Failed to retrieve public key',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Chat endpoint
app.post('/chat', asyncHandler(async (req: Request<{}, ChatResponse, ChatRequest>, res: Response<ChatResponse>) => {
  const requestId = req.headers['x-request-id'] as string;
  const { message } = req.body;

  // Input validation
  validateString(message, 'message', 1000);

  const sanitizedMessage = sanitizeString(message);
  logger.chatRequest(sanitizedMessage, { requestId });

  // Get BotDojoService instance from request body
  const requestConfig = getBotDojoConfigFromBody(req);
  const service = getBotDojoService(req, requestConfig);
  const activeConfig = {
    apiKey: requestConfig.BOTDOJO_API_KEY,
    baseUrl: requestConfig.BOTDOJO_BASE_URL,
    accountId: requestConfig.BOTDOJO_ACCOUNT_ID,
    projectId: requestConfig.BOTDOJO_PROJECT_ID,
    flowId: requestConfig.BOTDOJO_FLOW_ID,
  };

  // Check cache first
  const cachedResponse = cacheManager.getBotDojoResponse(sanitizedMessage);
  if (cachedResponse) {
    logger.info('Using cached BotDojo response', { requestId });
    const transformedResponse = service.transformToNewFormat(cachedResponse);
    logger.chatResponse([{ id: 'transformed', role: 'bot', type: 'text', content: { text: transformedResponse.text } }], { requestId });

    return res.json({
      text: transformedResponse.text,
      suggestedQuestions: transformedResponse.suggestedQuestions,
      products: transformedResponse.products,
      debug: {
        rawBotDojoResponse: cachedResponse,
        endpoint: `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
        requestBody: { body: { text_input: sanitizedMessage } },
        cached: true
      }
    });
  }

  // Call BotDojo API
  const botdojoResponse = await service.sendMessage(sanitizedMessage);

  // Cache the response
  cacheManager.setBotDojoResponse(sanitizedMessage, botdojoResponse, undefined, 300); // 5 minutes

  // Log the raw BotDojo response
  logger.botdojoResponse(
    `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
    botdojoResponse,
    { requestId }
  );

  // Transform to new format
  const transformedResponse = service.transformToNewFormat(botdojoResponse);
  logger.chatResponse([{ id: 'transformed', role: 'bot', type: 'text', content: { text: transformedResponse.text } }], { requestId });

  // Return new response format with raw data for browser console
  res.json({
    text: transformedResponse.text,
    suggestedQuestions: transformedResponse.suggestedQuestions,
    products: transformedResponse.products,
    debug: {
      rawBotDojoResponse: botdojoResponse,
      endpoint: `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
      requestBody: { body: { text_input: sanitizedMessage } },
      cached: false
    }
  });
}));

// Debug endpoint to see raw BotDojo response
app.post('/debug-botdojo', asyncHandler(async (req: Request<{}, any, ChatRequest>, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const { message } = req.body;

  // Input validation
  validateString(message, 'message', 1000);

  const sanitizedMessage = sanitizeString(message);
  logger.info('Debug BotDojo request', { requestId, message: sanitizedMessage });

  // Get BotDojoService instance from request body
  const requestConfig = getBotDojoConfigFromBody(req);
  const service = getBotDojoService(req, requestConfig);
  const activeConfig = {
    apiKey: requestConfig.BOTDOJO_API_KEY,
    baseUrl: requestConfig.BOTDOJO_BASE_URL,
    accountId: requestConfig.BOTDOJO_ACCOUNT_ID,
    projectId: requestConfig.BOTDOJO_PROJECT_ID,
    flowId: requestConfig.BOTDOJO_FLOW_ID,
  };

  // Call BotDojo API
  const botdojoResponse = await service.sendMessage(sanitizedMessage);

  // Return the raw response for inspection
  res.json({
    success: true,
    rawResponse: botdojoResponse,
    endpoint: `${activeConfig.baseUrl}/accounts/${activeConfig.accountId}/projects/${activeConfig.projectId}/flows/${activeConfig.flowId}/run`,
    requestBody: { body: { text_input: sanitizedMessage } }
  });
}));

// Suggestions endpoint for multiple question sets
app.post('/suggestions', asyncHandler(async (req: Request<{}, SuggestionsResponse, SuggestionsRequest>, res: Response<SuggestionsResponse>) => {
  const requestId = req.headers['x-request-id'] as string;
  const { context = '', currentSetIndex = 0 } = req.body;

  // Input validation
  validateNumber(currentSetIndex, 'currentSetIndex', 0);

  const sanitizedContext = sanitizeString(context);
  logger.info('Suggestions request', { requestId, context: sanitizedContext, currentSetIndex });

  // Get BotDojoService instance from request body
  const requestConfig = getBotDojoConfigFromBody(req);
  const service = getBotDojoService(req, requestConfig);

  // Check cache first
  const cachedSuggestions = cacheManager.getSuggestions(sanitizedContext, currentSetIndex);
  if (cachedSuggestions) {
    logger.info('Using cached suggestions', { requestId });
    return res.json(cachedSuggestions);
  }

  // Call BotDojo API for suggestions
  const botdojoResponse = await service.sendMessage(
    sanitizedContext || "Please provide suggested follow-up questions",
    { requestType: "suggestions" }
  );

  // Extract and normalize suggestions from BotDojo response
  const suggestedQuestions = service.extractSuggestedQuestions(botdojoResponse);

  const response: SuggestionsResponse = {
    suggestedQuestions,
    totalSets: suggestedQuestions.length,
    currentSetIndex: currentSetIndex % suggestedQuestions.length
  };

  // Cache the suggestions
  cacheManager.setSuggestions(sanitizedContext, currentSetIndex, response, 600); // 10 minutes

  logger.info('Suggestions response', {
    requestId,
    totalSets: response.totalSets,
    currentSetIndex: response.currentSetIndex
  });

  res.json(response);
}));

// Test endpoint for different structured content types
app.post('/test-structured', asyncHandler(async (req: Request<{}, { messages: Message[] }, TestStructuredRequest>, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const { contentType } = req.body;

  // Input validation
  const validContentTypes = ['guide', 'faq', 'labResult', 'image', 'linkList', 'product'];
  validateEnum(contentType, 'contentType', validContentTypes);

  logger.info('Test structured content request', { requestId, contentType });

  let testMessage: Message;

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

  logger.info('Test structured content response', { requestId, contentType });
  res.json({ messages: [testMessage] });
}));

// Cache management endpoint (for debugging)
app.get('/cache/stats', (req: Request, res: Response) => {
  const stats = cacheManager.getStats();
  res.json(stats);
});

app.post('/cache/clear', (req: Request, res: Response) => {
  cacheManager.clear();
  res.json({ message: 'Cache cleared successfully' });
});

// Catch-all handler: send back React's index.html file for client-side routing
app.use((req: Request, res: Response) => {
  res.json({ status: "ok", message: "Chatbot backend is running" });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(serverConfig.port, () => {
  logger.info(`🚀 Server running on port ${serverConfig.port}`, {
    port: serverConfig.port,
    environment: serverConfig.nodeEnv
  });
  console.log(`📊 Health check: http://localhost:${serverConfig.port}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${serverConfig.port}/chat`);
  console.log(`🔍 Debug endpoint: http://localhost:${serverConfig.port}/debug-botdojo`);
  console.log(`❓ Suggestions endpoint: http://localhost:${serverConfig.port}/suggestions`);
  console.log(`🧪 Test structured endpoint: http://localhost:${serverConfig.port}/test-structured`);
  console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    cacheManager.close();
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    cacheManager.close();
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;
