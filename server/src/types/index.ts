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
  name: string;
  description: string;
  price: string;
  ingredients: string[];
  benefits: string[];
  dosage: string;
  warnings: string;
  productUrl: string;
  imageUrl: string;
  category: string;
  brand: string;
  servings: string;
  form: string;
}

export interface BotDojoResponse {
  aiMessage?: {
    steps: BotDojoStep[];
  };
  response?: {
    text: string;
    suggestedQuestions: string[];
    products: string[];
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
  initData: string | {
    BOTDOJO_API_KEY: string;
    BOTDOJO_BASE_URL: string;
    BOTDOJO_ACCOUNT_ID: string;
    BOTDOJO_PROJECT_ID: string;
    BOTDOJO_FLOW_ID: string;
    PRODUCT_SOURCE?: string;
    STORE?: string;
  };
}

export interface SuggestionsRequest {
  context?: string;
  currentSetIndex?: number;
  initData: string | {
    BOTDOJO_API_KEY: string;
    BOTDOJO_BASE_URL: string;
    BOTDOJO_ACCOUNT_ID: string;
    BOTDOJO_PROJECT_ID: string;
    BOTDOJO_FLOW_ID: string;
    PRODUCT_SOURCE?: string;
    STORE?: string;
  };
}

export interface TestStructuredRequest {
  contentType: 'guide' | 'faq' | 'labResult' | 'image' | 'linkList' | 'product';
  initData: string | {
    BOTDOJO_API_KEY: string;
    BOTDOJO_BASE_URL: string;
    BOTDOJO_ACCOUNT_ID: string;
    BOTDOJO_PROJECT_ID: string;
    BOTDOJO_FLOW_ID: string;
    PRODUCT_SOURCE?: string;
    STORE?: string;
  };
}

export interface ChatResponse {
  text: string;
  suggestedQuestions: string[];
  products: Product[];
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

export interface ProductInfoRequest {
  products: string[];
  initData?: string | {
    BOTDOJO_API_KEY: string;
    BOTDOJO_BASE_URL: string;
    BOTDOJO_ACCOUNT_ID: string;
    BOTDOJO_PROJECT_ID: string;
    BOTDOJO_FLOW_ID: string;
    SOURCE_API_BASE_URL: string; // Mandatory
    SOURCE_PRACTICE_TOKEN?: string; // Optional
    SOURCE_AUTH_TOKEN: string; // Mandatory
  };
}

export interface ProductInfoResponse {
  success: boolean;
  products?: any[];
  error?: string;
}

// Alias for compatibility
export type ChatMessage = Message;
