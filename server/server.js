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

// Helper function to parse canvas data from text content and return structured content objects
function parseCanvasDataForStructuredContent(textContent) {
  const structuredContent = [];
  
  // Multiple regex patterns to catch different canvas formats
  const patterns = [
    // Pattern 1: <|dojo-canvas|>...<|dojo-canvas|>
    /<\|dojo-canvas\|>([^<]+)<\|dojo-canvas\|>/g,
    // Pattern 2: {canvasData: {...}} objects in HTML
    /\{canvasData:\s*\{[^}]+\}\}/g,
    // Pattern 3: {"canvasData": {...}} JSON objects
    /\{\"canvasData\":\s*\{[^}]+\}\}/g,
    // Pattern 4: <div> wrappers with canvas data
    /<div[^>]*>\s*\{canvasData:[^}]+\}\s*<\/div>/g,
    // Pattern 5: Raw canvasData objects without quotes
    /canvasData:\s*\{[^}]+\}/g,
    // Pattern 6: HTML div wrappers with canvas data (more flexible)
    /<div[^>]*>\s*\{[^}]*canvasData[^}]*\}\s*<\/div>/g,
    // Pattern 7: Markdown-style product links
    /\[([^\]]+)\]\(https:\/\/[^\/]+\/botdojo\/product\?[^)]+\)/g,
    // Pattern 8: iframe tags with product URLs
    /<iframe[^>]*src="https:\/\/[^\/]+\/botdojo\/product\?[^"]*"[^>]*><\/iframe>/g,
    // Pattern 9: Any dojo-canvas tags (including ID-only blocks)
    /<dojo-canvas[^>]*>[\s\S]*?<\/dojo-canvas>/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(textContent)) !== null) {
      try {
        let jsonString = match[0];
        
        // Handle iframe tags differently
        if (jsonString.includes('<iframe') && jsonString.includes('src=')) {
          // Extract URL from iframe src attribute
          const srcMatch = jsonString.match(/src="([^"]+)"/);
          if (srcMatch) {
            const url = srcMatch[1];
            const urlObj = new URL(url);
            const sku = urlObj.searchParams.get('sku');
            const productId = urlObj.searchParams.get('pid');
            
            if (sku && productId) {
              structuredContent.push({
                sku: sku,
                productId: parseInt(productId),
                title: `Product: ${sku}`,
                image: url,
                url: url
              });
            }
          }
          continue;
        }
        
        // Handle markdown links differently
        if (jsonString.includes('[') && jsonString.includes('](https://')) {
          // Extract URL from markdown link
          const urlMatch = jsonString.match(/\(https:\/\/[^)]+\)/);
          if (urlMatch) {
            const url = urlMatch[0].slice(1, -1); // Remove parentheses
            const urlObj = new URL(url);
            const sku = urlObj.searchParams.get('sku');
            const productId = urlObj.searchParams.get('pid');
            
            if (sku && productId) {
              structuredContent.push({
                sku: sku,
                productId: parseInt(productId),
                title: `Product: ${sku}`,
                image: url,
                url: url
              });
            }
          }
          continue;
        }
        
        // Handle dojo-canvas tags (including ID-only blocks)
        if (jsonString.includes('<dojo-canvas')) {
          // Try to extract JSON from the tag content
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          } else {
            // ID-only block - skip parsing, will be stripped in cleanTextContent
            continue;
          }
        }
        
        // Clean up HTML tags if present
        jsonString = jsonString.replace(/<[^>]*>/g, '');
        
        // Try to parse as JSON
        const canvasData = JSON.parse(jsonString);
        
        if (canvasData.url) {
          // Extract SKU and Product ID from URL
          const urlObj = new URL(canvasData.url);
          const sku = urlObj.searchParams.get('sku');
          const productId = urlObj.searchParams.get('pid');
          
          if (sku && productId) {
            structuredContent.push({
              sku: sku,
              productId: parseInt(productId),
              title: `Product: ${sku}`,
              image: canvasData.url,
              url: canvasData.url
            });
          }
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }
  });
  
  return structuredContent;
}

// Helper function to parse canvas data from text content and normalize to product messages (legacy - not used anymore)
function parseCanvasData(textContent) {
  const productMessages = [];
  
  // Multiple regex patterns to catch different canvas formats
  const patterns = [
    // Pattern 1: <|dojo-canvas|>...<|dojo-canvas|>
    /<\|dojo-canvas\|>([^<]+)<\|dojo-canvas\|>/g,
    // Pattern 2: {canvasData: {...}} objects in HTML
    /\{canvasData:\s*\{[^}]+\}\}/g,
    // Pattern 3: {"canvasData": {...}} JSON objects
    /\{\"canvasData\":\s*\{[^}]+\}\}/g,
    // Pattern 4: <div> wrappers with canvas data
    /<div[^>]*>\s*\{canvasData:[^}]+\}\s*<\/div>/g,
    // Pattern 5: Raw canvasData objects without quotes
    /canvasData:\s*\{[^}]+\}/g,
    // Pattern 6: HTML div wrappers with canvas data (more flexible)
    /<div[^>]*>\s*\{[^}]*canvasData[^}]*\}\s*<\/div>/g,
    // Pattern 7: Markdown-style product links
    /\[([^\]]+)\]\(https:\/\/[^\/]+\/botdojo\/product\?[^)]+\)/g,
    // Pattern 8: iframe tags with product URLs
    /<iframe[^>]*src="https:\/\/[^\/]+\/botdojo\/product\?[^"]*"[^>]*><\/iframe>/g,
    // Pattern 9: Any dojo-canvas tags (including ID-only blocks)
    /<dojo-canvas[^>]*>[\s\S]*?<\/dojo-canvas>/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(textContent)) !== null) {
      try {
        let jsonString = match[0];
        
        // Handle iframe tags differently
        if (jsonString.includes('<iframe') && jsonString.includes('src=')) {
          // Extract URL from iframe src attribute
          const srcMatch = jsonString.match(/src="([^"]+)"/);
          if (srcMatch) {
            const url = srcMatch[1];
            const urlObj = new URL(url);
            const sku = urlObj.searchParams.get('sku');
            const productId = urlObj.searchParams.get('pid');
            
            if (sku && productId) {
              productMessages.push({
                role: 'bot',
                type: 'product',
                content: {
                  sku: sku,
                  productId: productId,
                  title: `Product: ${sku}`,
                  image: url,
                  url: url
                }
              });
            }
          }
          continue;
        }
        
        // Handle markdown links differently
        if (jsonString.includes('[') && jsonString.includes('](https://')) {
          // Extract URL from markdown link
          const urlMatch = jsonString.match(/\(https:\/\/[^)]+\)/);
          if (urlMatch) {
            const url = urlMatch[0].slice(1, -1); // Remove parentheses
            const urlObj = new URL(url);
            const sku = urlObj.searchParams.get('sku');
            const productId = urlObj.searchParams.get('pid');
            
            if (sku && productId) {
              productMessages.push({
                role: 'bot',
                type: 'product',
                content: {
                  sku: sku,
                  productId: productId,
                  title: `Product: ${sku}`,
                  image: url,
                  url: url
                }
              });
            }
          }
          continue;
        }
        
        // Handle dojo-canvas tags (including ID-only blocks)
        if (jsonString.includes('<dojo-canvas')) {
          // Try to extract JSON from the tag content
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          } else {
            // ID-only block - skip parsing, will be stripped in cleanTextContent
            continue;
          }
        }
        
        // Clean up HTML tags if present
        jsonString = jsonString.replace(/<[^>]*>/g, '');
        
        // Handle different JSON formats
        if (jsonString.includes('canvasData:')) {
          // Convert {canvasData: {...}} to {"canvasData": {...}}
          jsonString = jsonString.replace(/canvasData:/g, '"canvasData":');
        }
        
        // Parse the JSON
        const jsonData = JSON.parse(jsonString);
        
        if (jsonData.canvasData && jsonData.canvasData.url) {
          const url = jsonData.canvasData.url;
          
          // Extract product information from URL
          const urlObj = new URL(url);
          const sku = urlObj.searchParams.get('sku');
          const productId = urlObj.searchParams.get('pid');
          
          // Only create product message if this is a product URL
          if (sku && productId) {
            productMessages.push({
              role: 'bot',
              type: 'product',
              content: {
                sku: sku,
                productId: productId,
                title: `Product: ${sku}`,
                image: url, // Use the product URL as image source
                url: url
              }
            });
          }
        }
      } catch (error) {
        console.log('Failed to parse canvas data:', error.message, 'Raw data:', match[0]);
        // Ignore parsing errors and continue
      }
    }
  });
  
  return productMessages;
}

// Helper function to clean text content by removing canvas tags
function cleanTextContent(textContent) {
  // Remove all canvas-related content patterns
  const patterns = [
    // Pattern 1: <|dojo-canvas|>...<|end|>
    /<\|dojo-canvas\|>[^<]+<\|end\|>/g,
    // Pattern 2: <|canvas|>...<|end|>
    /<\|canvas\|>[^<]+<\|end\|>/g,
    // Pattern 3: <|dojo-canvas|>...<|dojo-canvas|>
    /<\|dojo-canvas\|>[^<]+<\|dojo-canvas\|>/g,
    // Pattern 4: <|canvas|>...<|canvas|>
    /<\|canvas\|>[^<]+<\|canvas\|>/g,
    // Pattern 5: {canvasData: {...}} objects
    /\{canvasData:\s*\{[^}]+\}\}/g,
    // Pattern 6: {"canvasData": {...}} JSON objects
    /\{\"canvasData\":\s*\{[^}]+\}\}/g,
    // Pattern 7: <div> wrappers with canvas data
    /<div[^>]*>\s*\{canvasData:[^}]+\}\s*<\/div>/g,
    // Pattern 8: Raw canvasData objects
    /canvasData:\s*\{[^}]+\}/g,
    // Pattern 9: HTML div wrappers with canvas data
    /<div[^>]*>\s*\{[^}]*canvasData[^}]*\}\s*<\/div>/g,
    // Pattern 10: Markdown-style product links
    /\[([^\]]+)\]\(https:\/\/[^\/]+\/botdojo\/product\?[^)]+\)/g,
    // Pattern 11: HTML div wrappers with flex styling
    /<div[^>]*style="[^"]*display:\s*flex[^"]*"[^>]*>[\s\S]*?<\/div>/g,
    // Pattern 12: iframe tags with product URLs
    /<iframe[^>]*src="https:\/\/[^\/]+\/botdojo\/product\?[^"]*"[^>]*><\/iframe>/g,
    // Pattern 13: Any dojo-canvas tags (including ID-only blocks)
    /<dojo-canvas[^>]*>[\s\S]*?<\/dojo-canvas>/g,
    // Pattern 14: Any remaining HTML div tags
    /<div[^>]*>[\s\S]*?<\/div>/g,
    // Pattern 15: Any remaining HTML tags (catch-all)
    /<[^>]*>/g
  ];
  
  patterns.forEach(pattern => {
    textContent = textContent.replace(pattern, '');
  });
  
  // Clean up multiple consecutive newlines
  textContent = textContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return textContent.trim();
}

// Function to normalize BotDojo response into our message format
function normalizeBotDojoResponse(botdojoResponse) {
  const messages = [];

  // Handle BotDojo flow run response structure
  if (botdojoResponse.aiMessage && botdojoResponse.aiMessage.steps) {
    const steps = botdojoResponse.aiMessage.steps;
    
    // Extract product cards from ShowProductCardTool steps
    const productCardSteps = steps.filter(step => 
      step.stepLabel === 'ShowProductCardTool' && step.arguments
    );
    
    // Extract text content and parse canvas data
    let textContent = '';
    if (botdojoResponse.response && botdojoResponse.response.text_output) {
      textContent = botdojoResponse.response.text_output;
      
      // Canvas data is now parsed into structured content, not individual messages
      
      // Clean up canvas references from text content
      textContent = cleanTextContent(textContent);
    }
    
    // Collect all structured content (products) for the text message
    const allStructuredContent = [];
    
    // Add product cards (normalized to unified product format)
    productCardSteps.forEach(step => {
      try {
        const args = JSON.parse(step.arguments);
        if (args.sku && args.entity_id) {
          allStructuredContent.push({
            sku: args.sku,
            productId: args.entity_id,
            title: `Product: ${args.sku}`,
            image: step.canvas?.canvasData?.url || undefined,
            url: step.canvas?.canvasData?.url || `https://uat.gethealthy.store/botdojo/product?sku=${args.sku}&pid=${args.entity_id}`
          });
        }
      } catch (e) {
        console.log('Error parsing product card arguments:', e);
      }
    });
    
    // Parse canvas data directly into structured content (no individual messages)
    const canvasProducts = parseCanvasDataForStructuredContent(textContent);
    allStructuredContent.push(...canvasProducts);

    // Add text message if there's content
    if (textContent) {
      const textMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'bot',
        type: 'text',
        content: { text: textContent }
      };
      
      // Add structured content if we have products
      if (allStructuredContent.length > 0) {
        textMessage.structured = {
          type: 'product',
          data: allStructuredContent
        };
      }
      
      messages.push(textMessage);
    }
    
    // Individual product messages are no longer needed since structured content is stored in text message
    
    // Look for buttons in the response
    const buttonOptions = ['Energy', 'Immunity', 'Vitamins', 'Minerals', 'Performance', 'Recovery'];
    if (textContent && textContent.toLowerCase().includes('specific purpose')) {
      messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'bot',
        type: 'buttons',
        content: { 
          text: 'Would you like supplements for a specific purpose?',
          options: buttonOptions
        }
      });
    }
    
    // Extract suggested questions from BotDojo response
    let suggestedQuestions = [];
    if (botdojoResponse.suggestedQuestions && Array.isArray(botdojoResponse.suggestedQuestions)) {
      suggestedQuestions = botdojoResponse.suggestedQuestions;
    }
    
    // Add suggested questions to the last bot message if any exist
    if (suggestedQuestions.length > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'bot') {
        lastMessage.suggestedQuestions = suggestedQuestions;
      }
    }
    
  } else if (botdojoResponse.response && botdojoResponse.response.text_output && !botdojoResponse.steps) {
    // Fallback: Extract the main text response
    let textContent = botdojoResponse.response.text_output;
    let suggestedQuestions = [];
    
    // Try to parse JSON format with text and suggestedQuestions
    try {
      const parsedContent = JSON.parse(textContent);
      console.log('=== FALLBACK JSON PARSING DEBUG ===');
      console.log('Original textContent:', textContent);
      console.log('Parsed content:', parsedContent);
      console.log('Has text field:', !!parsedContent.text);
      console.log('Text field type:', typeof parsedContent.text);
      console.log('Has suggestedQuestions:', !!parsedContent.suggestedQuestions);
      console.log('SuggestedQuestions type:', typeof parsedContent.suggestedQuestions);
      console.log('=== END FALLBACK JSON PARSING DEBUG ===');
      
      if (parsedContent.text && typeof parsedContent.text === 'string') {
        textContent = parsedContent.text;
        if (parsedContent.suggestedQuestions && Array.isArray(parsedContent.suggestedQuestions)) {
          suggestedQuestions = parsedContent.suggestedQuestions;
        }
      }
    } catch (e) {
      console.log('Fallback JSON parsing failed:', e.message);
      // Not JSON, continue with original text content
    }
    
    // Canvas data is now parsed into structured content, not individual messages
    
    // Clean up canvas references from text content (only if not JSON parsed)
    if (suggestedQuestions.length === 0) { // Only clean if JSON parsing didn't yield suggestions
      textContent = cleanTextContent(textContent);
    }
    
    if (textContent) {
      const message = {
        role: 'bot',
        type: 'text',
        content: { text: textContent }
      };
      
      // Add suggested questions if available
      if (suggestedQuestions.length > 0) {
        message.suggestedQuestions = suggestedQuestions;
      }
      
      messages.push(message);
    }
    
    // Extract suggested questions from BotDojo response (fallback)
    if (suggestedQuestions.length === 0) {
      if (botdojoResponse.suggestedQuestions && Array.isArray(botdojoResponse.suggestedQuestions)) {
        suggestedQuestions = botdojoResponse.suggestedQuestions;
      }
      
      // Add suggested questions to the last bot message if any exist
      if (suggestedQuestions.length > 0 && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'bot') {
          lastMessage.suggestedQuestions = suggestedQuestions;
        }
      }
    }
  } else if (botdojoResponse.steps && Array.isArray(botdojoResponse.steps)) {
    // Handle steps array - look for the final output step
    console.log('=== STEPS ARRAY FOUND ===');
    console.log('Number of steps:', botdojoResponse.steps.length);
    console.log('Step labels:', botdojoResponse.steps.map(s => s.stepLabel));
    
    const outputStep = botdojoResponse.steps.find(step => 
      step.stepLabel === 'Output' && step.content
    );
    
    console.log('=== OUTPUT STEP SEARCH ===');
    console.log('Output step found:', !!outputStep);
    if (outputStep) {
      console.log('Output step content type:', typeof outputStep.content);
      console.log('Output step content length:', outputStep.content.length);
      console.log('Output step content preview:', outputStep.content.substring(0, 100));
    }
    
    if (outputStep && outputStep.content) {
      let textContent = outputStep.content;
      let suggestedQuestions = [];
      
      // Try to parse JSON format with text and suggestedQuestions
      console.log('=== ATTEMPTING JSON PARSING ===');
      console.log('textContent type:', typeof textContent);
      console.log('textContent length:', textContent.length);
      console.log('textContent preview:', textContent.substring(0, 100));
      
      try {
        const parsedContent = JSON.parse(textContent);
        console.log('=== JSON PARSING SUCCESS ===');
        console.log('Original textContent:', textContent);
        console.log('Parsed content:', parsedContent);
        console.log('Has text field:', !!parsedContent.text);
        console.log('Text field type:', typeof parsedContent.text);
        console.log('Has suggestedQuestions:', !!parsedContent.suggestedQuestions);
        console.log('SuggestedQuestions type:', typeof parsedContent.suggestedQuestions);
        console.log('=== END JSON PARSING SUCCESS ===');
        
        if (parsedContent.text && typeof parsedContent.text === 'string') {
          console.log('=== UPDATING TEXT CONTENT ===');
          console.log('Old textContent:', textContent);
          textContent = parsedContent.text;
          console.log('New textContent:', textContent);
          if (parsedContent.suggestedQuestions && Array.isArray(parsedContent.suggestedQuestions)) {
            suggestedQuestions = parsedContent.suggestedQuestions;
            console.log('Updated suggestedQuestions:', suggestedQuestions);
          }
          console.log('=== END UPDATING TEXT CONTENT ===');
        }
      } catch (e) {
        console.log('=== JSON PARSING FAILED ===');
        console.log('Error:', e.message);
        console.log('textContent that failed to parse:', textContent);
        console.log('=== END JSON PARSING FAILED ===');
        // Not JSON, continue with original text content
      }
      
      // Canvas data is now parsed into structured content, not individual messages
      
      // Clean up canvas references from text content (only if not JSON parsed)
      if (suggestedQuestions.length === 0) {
        textContent = cleanTextContent(textContent);
      }
      
      if (textContent) {
        const message = {
          role: 'bot',
          type: 'text',
          content: { text: textContent }
        };
        
        // Add suggested questions if available
        if (suggestedQuestions.length > 0) {
          message.suggestedQuestions = suggestedQuestions;
        }
        
        messages.push(message);
      }
    } else {
      // Fallback: use the last step with content
      const lastStepWithContent = botdojoResponse.steps
        .filter(step => step.content && step.content.trim())
        .pop();
      
      if (lastStepWithContent) {
        let textContent = lastStepWithContent.content;
        
        // Parse canvas data from text content
        const canvasMessages = parseCanvasData(textContent);
        messages.push(...canvasMessages);
        
        // Clean up canvas references from text content
        textContent = cleanTextContent(textContent);
        
        if (textContent) {
          messages.push({
            role: 'bot',
            type: 'text',
            content: { text: textContent }
          });
        }
      }
    }
  } else if (botdojoResponse.output && Array.isArray(botdojoResponse.output)) {
    // If BotDojo returns an array of outputs
    botdojoResponse.output.forEach(output => {
      if (output.type === 'text') {
        let textContent = output.text || output.content || '';
        
        // Parse canvas data from text content
        const canvasMessages = parseCanvasData(textContent);
        messages.push(...canvasMessages);
        
        // Clean up canvas references from text content
        textContent = cleanTextContent(textContent);
        
        if (textContent) {
          messages.push({
            role: 'bot',
            type: 'text',
            content: { text: textContent }
          });
        }
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
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

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

    // Log the raw BotDojo response
    console.log('\n=== RAW BOTDOJO RESPONSE ===');
    console.log(JSON.stringify(botdojoData, null, 2));
    console.log('=== END RAW RESPONSE ===\n');

    // Normalize the response
    const messages = normalizeBotDojoResponse(botdojoData);

    // Log the normalized messages
    console.log('\n=== NORMALIZED MESSAGES ===');
    console.log(JSON.stringify(messages, null, 2));
    console.log('=== END NORMALIZED MESSAGES ===\n');

    // Return normalized response with raw data for browser console
    res.json({ 
      messages,
      debug: {
        rawBotDojoResponse: botdojoData,
        endpoint: botdojoEndpoint,
        requestBody: requestBody
      }
    });

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

// Debug endpoint to see raw BotDojo response
app.post('/debug-botdojo', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('=== DEBUG MODE: Raw BotDojo Response ===');
    console.log('Message:', message);

    // Construct BotDojo endpoint
    const botdojoEndpoint = `${BOTDOJO_BASE_URL}/accounts/${BOTDOJO_ACCOUNT_ID}/projects/${BOTDOJO_PROJECT_ID}/flows/${BOTDOJO_FLOW_ID}/run`;
    
    const requestBody = {
      body: {
        text_input: message
      }
    };

    console.log('Endpoint:', botdojoEndpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

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
      return res.status(botdojoResponse.status).json({
        error: `BotDojo API error: ${botdojoResponse.status} ${botdojoResponse.statusText}`,
        details: errorText
      });
    }

    const botdojoData = await botdojoResponse.json();

    // Return the raw response for inspection
    res.json({
      success: true,
      rawResponse: botdojoData,
      endpoint: botdojoEndpoint,
      requestBody: requestBody
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Debug request failed',
      details: error.message
    });
  }
});

// POST /suggestions endpoint for multiple question sets
app.post('/suggestions', async (req, res) => {
  try {
    const { context, currentSetIndex = 0 } = req.body;
    
    console.log('Received suggestions request:', { context, currentSetIndex });

    // Validate required environment variables
    if (!BOTDOJO_API_KEY || !BOTDOJO_BASE_URL || !BOTDOJO_ACCOUNT_ID || !BOTDOJO_PROJECT_ID || !BOTDOJO_FLOW_ID) {
      throw new Error('Missing BotDojo configuration. Please set all required BotDojo environment variables');
    }

    // Construct BotDojo endpoint
    const botdojoEndpoint = `${BOTDOJO_BASE_URL}/accounts/${BOTDOJO_ACCOUNT_ID}/projects/${BOTDOJO_PROJECT_ID}/flows/${BOTDOJO_FLOW_ID}/run`;
    
    const requestBody = {
      body: {
        text_input: context || "Please provide suggested follow-up questions",
        requestType: "suggestions"
      }
    };

    console.log('Calling BotDojo API for suggestions:', botdojoEndpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

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
    console.log('=== RAW BOTDOJO RESPONSE ===');
    console.log(JSON.stringify(botdojoData, null, 2));
    console.log('=== END RAW RESPONSE ===');

    // Extract and normalize suggestions from BotDojo response
    const suggestedQuestions = extractSuggestedQuestions(botdojoData);
    
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

// Function to extract suggested questions from BotDojo response
function extractSuggestedQuestions(botdojoResponse) {
  const suggestions = [];
  
  // Try to extract from different possible locations in BotDojo response
  if (botdojoResponse.suggestedQuestions && Array.isArray(botdojoResponse.suggestedQuestions)) {
    // Direct suggestions array
    if (Array.isArray(botdojoResponse.suggestedQuestions[0])) {
      // Already grouped
      return botdojoResponse.suggestedQuestions;
    } else {
      // Single array - group into sets of 3
      const grouped = [];
      for (let i = 0; i < botdojoResponse.suggestedQuestions.length; i += 3) {
        grouped.push(botdojoResponse.suggestedQuestions.slice(i, i + 3));
      }
      return grouped;
    }
  }
  
  // Try to extract from aiMessage.steps
  if (botdojoResponse.aiMessage && botdojoResponse.aiMessage.steps) {
    const steps = botdojoResponse.aiMessage.steps;
    
    // Look for steps with suggestion data
    const suggestionSteps = steps.filter(step => 
      step.stepLabel && step.stepLabel.toLowerCase().includes('suggestion')
    );
    
    if (suggestionSteps.length > 0) {
      suggestionSteps.forEach(step => {
        if (step.content) {
          try {
            const content = typeof step.content === 'string' ? JSON.parse(step.content) : step.content;
            if (content.suggestions && Array.isArray(content.suggestions)) {
              suggestions.push(content.suggestions);
            }
          } catch (e) {
            // If not JSON, treat as text and split by lines
            const lines = step.content.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
              suggestions.push(lines);
            }
          }
        }
      });
    }
  }
  
  // Try to extract from response.text_output
  if (botdojoResponse.response && botdojoResponse.response.text_output) {
    const text = botdojoResponse.response.text_output;
    
    // Look for patterns like "Suggested Questions:" followed by lists
    const suggestionMatches = text.match(/suggested questions?:?\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gi);
    
    if (suggestionMatches) {
      suggestionMatches.forEach(match => {
        const lines = match.split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0 && !line.toLowerCase().includes('suggested questions'));
        
        if (lines.length > 0) {
          // Group into sets of 3
          for (let i = 0; i < lines.length; i += 3) {
            suggestions.push(lines.slice(i, i + 3));
          }
        }
      });
    }
  }
  
  // If no suggestions found, return default sets
  if (suggestions.length === 0) {
    return [
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
  }
  
  return suggestions;
}

// Test endpoint for different structured content types
app.post('/test-structured', (req, res) => {
  const { contentType } = req.body;
  
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
      
    default:
      return res.status(400).json({ error: 'Invalid content type' });
  }
  
  res.json({ messages: [testMessage] });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`Debug endpoint: http://localhost:${PORT}/debug-botdojo`);
  console.log(`Suggestions endpoint: http://localhost:${PORT}/suggestions`);
  console.log(`Test structured endpoint: http://localhost:${PORT}/test-structured`);
  console.log('Make sure to set BOTDOJO_API_KEY, BOTDOJO_BASE_URL, and BOTDOJO_FLOW_ID environment variables');
});

module.exports = app;