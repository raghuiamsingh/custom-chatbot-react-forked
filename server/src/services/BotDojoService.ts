import { normalizeImageUrl, isLikelyImage } from '../utils/mediaUtils';
import { parseCanvasDataForStructuredContent, cleanTextContent } from '../utils/canvasParser';
import { BotDojoResponse, ChatMessage, StructuredContentItem } from '../types';

export interface BotDojoConfig {
  baseUrl: string;
  apiKey: string;
  accountId: string;
  projectId: string;
  flowId: string;
}

/**
 * BotDojo API service for handling API calls and response normalization
 */
export default class BotDojoService {
  private config: BotDojoConfig;
  private baseUrl: string;
  private apiKey: string;
  private accountId: string;
  private projectId: string;
  private flowId: string;

  constructor(config: BotDojoConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
    this.projectId = config.projectId;
    this.flowId = config.flowId;
  }

  /**
   * Make a request to BotDojo API
   * @param message - User message
   * @param options - Additional options
   * @returns BotDojo response
   */
  async sendMessage(message: string, options: any = {}): Promise<BotDojoResponse> {
    const endpoint = `${this.baseUrl}/accounts/${this.accountId}/projects/${this.projectId}/flows/${this.flowId}/run`;
    
    const requestBody = {
      body: {
        text_input: message,
        ...options
      }
    };

    console.log('Calling BotDojo API:', endpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BotDojo API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as BotDojoResponse;
  }

  /**
   * Normalize BotDojo response into our message format
   * @param botdojoResponse - Raw BotDojo response
   * @returns Array of normalized messages
   */
  normalizeResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Handle BotDojo flow run response structure
    if (botdojoResponse.aiMessage && botdojoResponse.aiMessage.steps) {
      return this.normalizeStepsResponse(botdojoResponse);
    } else if (botdojoResponse.response && botdojoResponse.response.text_output && !botdojoResponse.steps) {
      return this.normalizeFallbackResponse(botdojoResponse);
    } else if (botdojoResponse.steps && Array.isArray(botdojoResponse.steps)) {
      return this.normalizeStepsArrayResponse(botdojoResponse);
    } else if (botdojoResponse.output && Array.isArray(botdojoResponse.output)) {
      return this.normalizeOutputArrayResponse(botdojoResponse);
    } else if (botdojoResponse.text || botdojoResponse.message) {
      return this.normalizeSimpleResponse(botdojoResponse);
    } else {
      // Fallback for unknown response structure
      return [{
        id: this.generateMessageId(),
        role: 'bot',
        type: 'text',
        content: { text: 'Sorry, I could not process your message.' }
      }];
    }
  }

  /**
   * Normalize response with steps structure
   * @param botdojoResponse - BotDojo response with steps
   * @returns Normalized messages
   */
  private normalizeStepsResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const steps = botdojoResponse.aiMessage!.steps;
    
    // Extract product cards from ShowProductCardTool steps
    const productCardSteps = steps.filter(step => 
      step.stepLabel === 'ShowProductCardTool' && step.arguments
    );
    
    // Collect all structured content (products) for the text message
    const allStructuredContent: StructuredContentItem[] = [];
    
    // Extract text content and parse canvas data
    let textContent = '';
    let suggestedQuestions: string[] = [];
    
    if (botdojoResponse.response && botdojoResponse.response.text_output) {
      const parsedContent = this.parseTextOutput(botdojoResponse.response.text_output);
      textContent = parsedContent.text;
      suggestedQuestions = parsedContent.suggestedQuestions;
      
      // Process products into structured content
      if (parsedContent.products && Array.isArray(parsedContent.products)) {
        console.log('Processing products from JSON:', parsedContent.products.length);
        parsedContent.products.forEach(product => {
          const normalized = normalizeImageUrl(product.imageUrl || product.image || '');
          const safeImageUrl = isLikelyImage(normalized) ? normalized : undefined;
          allStructuredContent.push({
            sku: product.sku || 'UNKNOWN',
            productId: product.productId || product.id || 'UNKNOWN',
            title: product.name || product.title || `Product: ${product.sku}`,
            imageUrl: safeImageUrl,
            description: product.description || undefined,
            url: product.url || `https://uat.gethealthy.store/botdojo/product?sku=${product.sku}&pid=${product.productId || product.id}`
          });
        });
      }
    }
    
    // Add product cards (normalized to unified product format)
    productCardSteps.forEach(step => {
      try {
        const args = JSON.parse(step.arguments!);
        if (args.sku && args.entity_id) {
          const raw = step.canvas?.canvasData?.url || '';
          const normalized = normalizeImageUrl(raw);
          const safeImageUrl = isLikelyImage(normalized) ? normalized : undefined;
          allStructuredContent.push({
            sku: args.sku,
            productId: args.entity_id,
            title: `Product: ${args.sku}`,
            imageUrl: safeImageUrl,
            description: undefined,
            url: `https://uat.gethealthy.store/botdojo/product?sku=${args.sku}&pid=${args.entity_id}`
          });
        }
      } catch (e) {
        console.log('Error parsing product card arguments:', e);
      }
    });
    
    // Parse canvas data directly into structured content
    const canvasProducts = parseCanvasDataForStructuredContent(textContent);
    allStructuredContent.push(...canvasProducts);

    // Normalize and sanitize product entries
    this.normalizeStructuredContent(allStructuredContent);

    // De-duplicate by SKU
    const dedupedBySku = this.deduplicateBySku(allStructuredContent);

    // Add text message if there's content
    if (textContent) {
      const textMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'bot',
        type: 'text',
        content: { text: textContent }
      };
      
      // Add suggested questions if available
      if (suggestedQuestions.length > 0) {
        textMessage.suggestedQuestions = suggestedQuestions;
      }
      
      // Add structured content if we have products
      if (dedupedBySku.length > 0) {
        textMessage.structured = {
          type: 'product',
          data: dedupedBySku
        };
      }
      
      messages.push(textMessage);
    }
    
    // Look for buttons in the response
    const buttonOptions = ['Energy', 'Immunity', 'Vitamins', 'Minerals', 'Performance', 'Recovery'];
    if (textContent && textContent.toLowerCase().includes('specific purpose')) {
      messages.push({
        id: this.generateMessageId(),
        role: 'bot',
        type: 'buttons',
        content: { 
          text: 'Would you like supplements for a specific purpose?',
          options: buttonOptions
        }
      });
    }
    
    // Extract suggested questions from BotDojo response
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
    
    return messages;
  }

  /**
   * Parse text output for JSON content
   * @param textOutput - Raw text output
   * @returns Parsed content with text, suggestedQuestions, and products
   */
  private parseTextOutput(textOutput: string): { text: string; suggestedQuestions: string[]; products: any[] } {
    let textContent = textOutput;
    let suggestedQuestions: string[] = [];
    let products: any[] = [];

    try {
      const parsedContent = JSON.parse(textContent);
      console.log('=== RESPONSE.TEXT_OUTPUT JSON PARSING ===');
      console.log('Original textContent:', textContent);
      console.log('Parsed content:', parsedContent);
      
      if (parsedContent.text && typeof parsedContent.text === 'string') {
        textContent = parsedContent.text;
        if (parsedContent.suggestedQuestions && Array.isArray(parsedContent.suggestedQuestions)) {
          suggestedQuestions = parsedContent.suggestedQuestions;
        }
        
        // Process products into structured content
        if (parsedContent.products && Array.isArray(parsedContent.products)) {
          products = parsedContent.products;
        }
      }
    } catch (e) {
      console.log('Response.text_output JSON parsing failed:', e);
    }

    return { text: textContent, suggestedQuestions, products };
  }

  /**
   * Normalize structured content (products)
   * @param structuredContent - Array of product objects
   */
  private normalizeStructuredContent(structuredContent: StructuredContentItem[]): void {
    for (let i = 0; i < structuredContent.length; i++) {
      const p = structuredContent[i];
      const candidate = p.imageUrl || '';
      const normalized = normalizeImageUrl(candidate || '');
      const safe = isLikelyImage(normalized) ? normalized : undefined;
      p.imageUrl = safe;
    }
  }

  /**
   * Deduplicate products by SKU
   * @param products - Array of product objects
   * @returns Deduplicated products
   */
  private deduplicateBySku(products: StructuredContentItem[]): StructuredContentItem[] {
    return Object.values(products.reduce((acc, item) => {
      const sku = item.sku || 'UNKNOWN';
      if (!acc[sku]) {
        acc[sku] = item;
      } else {
        const cur = acc[sku];
        const curHasImg = !!cur.imageUrl;
        const newHasImg = !!item.imageUrl;
        const curDescLen = (cur.description || '').length;
        const newDescLen = (item.description || '').length;
        if ((!curHasImg && newHasImg) || (curHasImg === newHasImg && newDescLen > curDescLen)) {
          acc[sku] = item;
        }
      }
      return acc;
    }, {} as Record<string, StructuredContentItem>));
  }

  /**
   * Normalize fallback response structure
   * @param botdojoResponse - BotDojo response
   * @returns Normalized messages
   */
  private normalizeFallbackResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    const messages: ChatMessage[] = [];
    let textContent = botdojoResponse.response!.text_output;
    let suggestedQuestions: string[] = [];
    
    // Try to parse JSON format with text and suggestedQuestions
    try {
      const parsedContent = JSON.parse(textContent);
      if (parsedContent.text && typeof parsedContent.text === 'string') {
        textContent = parsedContent.text;
        if (parsedContent.suggestedQuestions && Array.isArray(parsedContent.suggestedQuestions)) {
          suggestedQuestions = parsedContent.suggestedQuestions;
        }
      }
    } catch (e) {
      console.log('Fallback JSON parsing failed:', e);
    }
    
    // Clean up canvas references from text content
    if (suggestedQuestions.length === 0) {
      textContent = cleanTextContent(textContent);
    }
    
    if (textContent) {
      const message: ChatMessage = {
        id: this.generateMessageId(),
        role: 'bot',
        type: 'text',
        content: { text: textContent }
      };
      
      if (suggestedQuestions.length > 0) {
        message.suggestedQuestions = suggestedQuestions;
      }
      
      messages.push(message);
    }
    
    return messages;
  }

  /**
   * Normalize steps array response
   * @param botdojoResponse - BotDojo response with steps array
   * @returns Normalized messages
   */
  private normalizeStepsArrayResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    const messages: ChatMessage[] = [];
    console.log('=== STEPS ARRAY FOUND ===');
    console.log('Number of steps:', botdojoResponse.steps!.length);
    
    const outputStep = botdojoResponse.steps!.find(step => 
      step.stepLabel === 'Output' && step.content
    );
    
    if (outputStep && outputStep.content) {
      let textContent = outputStep.content;
      let suggestedQuestions: string[] = [];
      
      try {
        const parsedContent = JSON.parse(textContent);
        if (parsedContent.text && typeof parsedContent.text === 'string') {
          textContent = parsedContent.text;
          if (parsedContent.suggestedQuestions && Array.isArray(parsedContent.suggestedQuestions)) {
            suggestedQuestions = parsedContent.suggestedQuestions;
          }
        }
      } catch (e) {
        console.log('JSON parsing failed:', e);
      }
      
      if (suggestedQuestions.length === 0) {
        textContent = cleanTextContent(textContent);
      }
      
      if (textContent) {
        const message: ChatMessage = {
          id: this.generateMessageId(),
          role: 'bot',
          type: 'text',
          content: { text: textContent }
        };
        
        if (suggestedQuestions.length > 0) {
          message.suggestedQuestions = suggestedQuestions;
        }
        
        messages.push(message);
      }
    }
    
    return messages;
  }

  /**
   * Normalize output array response
   * @param botdojoResponse - BotDojo response with output array
   * @returns Normalized messages
   */
  private normalizeOutputArrayResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    const messages: ChatMessage[] = [];
    
    botdojoResponse.output!.forEach(output => {
      if (output.type === 'text') {
        let textContent = output.text || output.content || '';
        
        textContent = cleanTextContent(textContent);
        
        if (textContent) {
          messages.push({
            id: this.generateMessageId(),
            role: 'bot',
            type: 'text',
            content: { text: textContent }
          });
        }
      } else if (output.type === 'buttons') {
        messages.push({
          id: this.generateMessageId(),
          role: 'bot',
          type: 'buttons',
          content: { options: output.options || output.buttons || [] }
        });
      } else if (output.type === 'card') {
        messages.push({
          id: this.generateMessageId(),
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
          id: this.generateMessageId(),
          role: 'bot',
          type: 'list',
          content: { list: output.list || output.items || [] }
        });
      } else {
        // Default to text for unknown types
        messages.push({
          id: this.generateMessageId(),
          role: 'bot',
          type: 'text',
          content: { text: JSON.stringify(output) }
        });
      }
    });
    
    return messages;
  }

  /**
   * Normalize simple text response
   * @param botdojoResponse - Simple BotDojo response
   * @returns Normalized messages
   */
  private normalizeSimpleResponse(botdojoResponse: BotDojoResponse): ChatMessage[] {
    return [{
      id: this.generateMessageId(),
      role: 'bot',
      type: 'text',
      content: { text: botdojoResponse.text || botdojoResponse.message || '' }
    }];
  }

  /**
   * Generate unique message ID
   * @returns Unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract suggested questions from BotDojo response
   * @param botdojoResponse - BotDojo response
   * @returns Array of suggested question sets
   */
  extractSuggestedQuestions(botdojoResponse: BotDojoResponse): string[][] {
    const suggestions: string[][] = [];
    
    // Try to extract from different possible locations in BotDojo response
    if (botdojoResponse.suggestedQuestions && Array.isArray(botdojoResponse.suggestedQuestions)) {
      // Direct suggestions array
      if (Array.isArray(botdojoResponse.suggestedQuestions[0])) {
        // Already grouped
        return botdojoResponse.suggestedQuestions as unknown as string[][];
      } else {
        // Single array - group into sets of 3
        const grouped: string[][] = [];
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
}
