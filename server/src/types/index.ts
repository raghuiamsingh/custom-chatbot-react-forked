export interface Message {
  id: string;
  role: 'user' | 'bot';
  type: 'text' | 'buttons' | 'card' | 'list' | 'typing' | 'canvas' | 'product';
  content: MessageContent;
  suggestedQuestions?: string[];
  structured?: StructuredContent;
}

export interface MessageContent {
  text?: string;
  options?: string[];
  title?: string;
  description?: string;
  image?: string;
  list?: string[];
  items?: string[];
  url?: string;
  display?: string;
  height?: number;
  sku?: string;
  productId?: string;
}

export interface StructuredContent {
  type: 'product' | 'guide' | 'faq' | 'labResult' | 'image' | 'linkList';
  data: StructuredContentItem[];
}

export interface StructuredContentItem {
  sku?: string;
  productId?: string | number;
  title?: string;
  imageUrl?: string;
  description?: string;
  url?: string;
  step?: string;
  question?: string;
  label?: string;
  alt?: string;
  icon?: string;
  [key: string]: any; // Allow additional properties
}

export interface Product {
  sku: string;
  productId: number | string;
  title: string;
  imageUrl?: string;
  description?: string;
  url: string;
}

export interface BotDojoResponse {
  aiMessage?: {
    steps: BotDojoStep[];
  };
  response?: {
    text_output: string;
  };
  steps?: BotDojoStep[];
  output?: BotDojoOutput[];
  text?: string;
  message?: string;
  suggestedQuestions?: string[];
}

export interface BotDojoStep {
  stepLabel: string;
  arguments?: string;
  content?: string;
  canvas?: {
    canvasData?: {
      url?: string;
    };
  };
}

export interface BotDojoOutput {
  type: string;
  text?: string;
  content?: string;
  options?: string[];
  buttons?: string[];
  title?: string;
  description?: string;
  image?: string;
  list?: string[];
  items?: string[];
}

export interface ChatRequest {
  message: string;
}

export interface SuggestionsRequest {
  context?: string;
  currentSetIndex?: number;
}

export interface TestStructuredRequest {
  contentType: 'guide' | 'faq' | 'labResult' | 'image' | 'linkList' | 'product';
}

export interface ChatResponse {
  messages: Message[];
  debug?: {
    rawBotDojoResponse: BotDojoResponse;
    endpoint: string;
    requestBody: any;
    cached?: boolean;
  };
}

export interface SuggestionsResponse {
  suggestedQuestions: string[][];
  totalSets: number;
  currentSetIndex: number;
  error?: string;
  details?: string;
}

// Alias for compatibility
export type ChatMessage = Message;
