import { normalizeImageUrl, isLikelyImage } from './mediaUtils';

export interface StructuredContentItem {
  sku: string;
  productId: number;
  title: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  url: string;
}

/**
 * Parse canvas data from text content and return structured content objects
 * @param textContent - Raw text content from BotDojo response
 * @returns Array of structured content objects
 */
export function parseCanvasDataForStructuredContent(textContent: string): StructuredContentItem[] {
  const structuredContent: StructuredContentItem[] = [];
  
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
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(textContent)) !== null) {
      try {
        let jsonString = match[0];
        
        // Handle iframe tags differently
        if (jsonString.includes('<iframe') && jsonString.includes('src=')) {
          const iframeProduct = extractProductFromIframe(jsonString);
          if (iframeProduct) {
            structuredContent.push(iframeProduct);
          }
          continue;
        }
        
        // Handle markdown links differently
        if (jsonString.includes('[') && jsonString.includes('](https://')) {
          const markdownProduct = extractProductFromMarkdown(jsonString);
          if (markdownProduct) {
            structuredContent.push(markdownProduct);
          }
          continue;
        }
        
        // Handle dojo-canvas tags (including ID-only blocks)
        if (jsonString.includes('<dojo-canvas')) {
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
          const product = extractProductFromCanvasData(canvasData);
          if (product) {
            structuredContent.push(product);
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

/**
 * Extract product information from iframe tag
 * @param iframeString - iframe HTML string
 * @returns Product object or null
 */
function extractProductFromIframe(iframeString: string): StructuredContentItem | null {
  const srcMatch = iframeString.match(/src="([^"]+)"/);
  if (srcMatch) {
    const url = srcMatch[1];
    const urlObj = new URL(url);
    const sku = urlObj.searchParams.get('sku');
    const productId = urlObj.searchParams.get('pid');
    
    if (sku && productId) {
      return {
        sku: sku,
        productId: parseInt(productId, 10),
        title: `Product: ${sku}`,
        image: url,
        imageUrl: url,
        description: undefined,
        url: url
      };
    }
  }
  return null;
}

/**
 * Extract product information from markdown link
 * @param markdownString - Markdown link string
 * @returns Product object or null
 */
function extractProductFromMarkdown(markdownString: string): StructuredContentItem | null {
  const urlMatch = markdownString.match(/\(https:\/\/[^)]+\)/);
  if (urlMatch) {
    const url = urlMatch[0].slice(1, -1); // Remove parentheses
    const urlObj = new URL(url);
    const sku = urlObj.searchParams.get('sku');
    const productId = urlObj.searchParams.get('pid');
    
    if (sku && productId) {
      return {
        sku: sku,
        productId: parseInt(productId, 10),
        title: `Product: ${sku}`,
        image: url,
        imageUrl: url,
        description: undefined,
        url: url
      };
    }
  }
  return null;
}

/**
 * Extract product information from canvas data
 * @param canvasData - Canvas data object
 * @returns Product object or null
 */
function extractProductFromCanvasData(canvasData: { url: string }): StructuredContentItem | null {
  if (canvasData.url) {
    const urlObj = new URL(canvasData.url);
    const sku = urlObj.searchParams.get('sku');
    const productId = urlObj.searchParams.get('pid');
    
    if (sku && productId) {
      return {
        sku: sku,
        productId: parseInt(productId, 10),
        title: `Product: ${sku}`,
        image: canvasData.url,
        imageUrl: canvasData.url,
        description: undefined,
        url: canvasData.url
      };
    }
  }
  return null;
}

/**
 * Clean text content by removing canvas tags and HTML
 * @param textContent - Raw text content
 * @returns Cleaned text content
 */
export function cleanTextContent(textContent: string): string {
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
