const BotDojoService = require('../services/BotDojoService');
const { parseCanvasDataForStructuredContent, cleanTextContent } = require('../utils/canvasParser');
const { normalizeImageUrl, isLikelyImage } = require('../utils/mediaUtils');

describe('BotDojoService', () => {
  let botdojoService;
  
  beforeEach(() => {
    botdojoService = new BotDojoService({
      apiKey: 'test-key',
      baseUrl: 'https://test.example.com',
      accountId: 'test-account',
      projectId: 'test-project',
      flowId: 'test-flow'
    });
  });

  describe('generateMessageId', () => {
    test('should generate unique message IDs', () => {
      const id1 = botdojoService.generateMessageId();
      const id2 = botdojoService.generateMessageId();
      
      expect(id1).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('normalizeSimpleResponse', () => {
    test('should normalize simple text response', () => {
      const response = { text: 'Hello world' };
      const result = botdojoService.normalizeSimpleResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: expect.stringMatching(/^msg-\d+-[a-z0-9]+$/),
        role: 'bot',
        type: 'text',
        content: { text: 'Hello world' }
      });
    });

    test('should normalize simple message response', () => {
      const response = { message: 'Hello world' };
      const result = botdojoService.normalizeSimpleResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: expect.stringMatching(/^msg-\d+-[a-z0-9]+$/),
        role: 'bot',
        type: 'text',
        content: { text: 'Hello world' }
      });
    });
  });

  describe('extractSuggestedQuestions', () => {
    test('should extract suggestions from direct array', () => {
      const response = {
        suggestedQuestions: ['Question 1', 'Question 2', 'Question 3']
      };
      
      const result = botdojoService.extractSuggestedQuestions(response);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['Question 1', 'Question 2', 'Question 3']);
    });

    test('should group suggestions into sets of 3', () => {
      const response = {
        suggestedQuestions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']
      };
      
      const result = botdojoService.extractSuggestedQuestions(response);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(['Q1', 'Q2', 'Q3']);
      expect(result[1]).toEqual(['Q4', 'Q5', 'Q6']);
      expect(result[2]).toEqual(['Q7']);
    });

    test('should return default suggestions when none found', () => {
      const response = {};
      
      const result = botdojoService.extractSuggestedQuestions(response);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('What supplements can help with sleep?');
    });
  });
});

describe('Canvas Parser', () => {
  describe('parseCanvasDataForStructuredContent', () => {
    test('should parse iframe tags', () => {
      const textContent = '<iframe src="https://example.com/botdojo/product?sku=TEST-001&pid=123"></iframe>';
      
      const result = parseCanvasDataForStructuredContent(textContent);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sku: 'TEST-001',
        productId: 123,
        title: 'Product: TEST-001',
        image: 'https://example.com/botdojo/product?sku=TEST-001&pid=123',
        imageUrl: 'https://example.com/botdojo/product?sku=TEST-001&pid=123',
        description: undefined,
        url: 'https://example.com/botdojo/product?sku=TEST-001&pid=123'
      });
    });

    test('should parse markdown links', () => {
      const textContent = '[Product Link](https://example.com/botdojo/product?sku=TEST-002&pid=456)';
      
      const result = parseCanvasDataForStructuredContent(textContent);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sku: 'TEST-002',
        productId: 456,
        title: 'Product: TEST-002',
        image: 'https://example.com/botdojo/product?sku=TEST-002&pid=456',
        imageUrl: 'https://example.com/botdojo/product?sku=TEST-002&pid=456',
        description: undefined,
        url: 'https://example.com/botdojo/product?sku=TEST-002&pid=456'
      });
    });

    test('should handle empty content', () => {
      const result = parseCanvasDataForStructuredContent('');
      expect(result).toEqual([]);
    });
  });

  describe('cleanTextContent', () => {
    test('should remove canvas tags', () => {
      const textContent = 'Hello <|dojo-canvas|>data<|dojo-canvas|> world';
      
      const result = cleanTextContent(textContent);
      
      expect(result).toBe('Hello  world');
    });

    test('should clean up multiple newlines', () => {
      const textContent = 'Line 1\n\n\n\nLine 2';
      
      const result = cleanTextContent(textContent);
      
      expect(result).toBe('Line 1\n\nLine 2');
    });

    test('should handle empty content', () => {
      const result = cleanTextContent('');
      expect(result).toBe('');
    });
  });
});

describe('Media Utils', () => {
  describe('isLikelyImage', () => {
    test('should identify image URLs', () => {
      expect(isLikelyImage('https://example.com/image.jpg')).toBe(true);
      expect(isLikelyImage('https://example.com/image.png')).toBe(true);
      expect(isLikelyImage('https://example.com/image.webp')).toBe(true);
      expect(isLikelyImage('https://example.com/image.gif')).toBe(true);
      expect(isLikelyImage('https://example.com/image.svg')).toBe(true);
    });

    test('should reject non-image URLs', () => {
      expect(isLikelyImage('https://example.com/document.pdf')).toBe(false);
      expect(isLikelyImage('https://example.com/page.html')).toBe(false);
      expect(isLikelyImage('')).toBe(false);
      expect(isLikelyImage(null)).toBe(false);
    });
  });

  describe('normalizeImageUrl', () => {
    test('should handle relative paths', () => {
      const result = normalizeImageUrl('/media/image.jpg');
      expect(result).toBe('https://uat.gethealthy.store/media/catalog/product/image.jpg');
    });

    test('should handle absolute URLs', () => {
      const result = normalizeImageUrl('https://example.com/image.jpg');
      expect(result).toBe('https://example.com/image.jpg');
    });

    test('should handle empty URLs', () => {
      const result = normalizeImageUrl('');
      expect(result).toBe('');
    });
  });
});
