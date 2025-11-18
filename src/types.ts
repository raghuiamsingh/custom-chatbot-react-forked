export type Message = {
  id: string;
  role: "user" | "bot";
  type: "text" | "buttons" | "card" | "list" | "typing" | "canvas" | "product";
  content: any; // Can be string, { text: string }, { options: string[] }, { title: string, description: string, image?: string }, { list: string[] }, { url: string, display: string, height: number }, { sku: string, productId: string, title?: string, image?: string, url: string }, {}
  suggestedQuestions?: string[]; // Optional array of suggested follow-up questions
  structured?: {
    type: 'product' | 'guide' | 'faq' | 'labResult' | 'image' | 'linkList';
    data: any[];
  }; // Optional structured content for sidebar with content type
};

export type Product = {
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
};

export type ChatResponse = {
  text: string;
  suggestedQuestions: string[];
  products: Product[];
  debug?: {
    rawBotDojoResponse: any;
    endpoint: string;
    requestBody: any;
    cached?: boolean;
  };
};

export type SidebarContent = {
  title: string;
  products: Array<{
    sku: string;
    productId: number;
    title: string;
    image: string;
    url: string;
  }>;
};

export type SidebarState = {
  isOpen: boolean;
  messageId: string | null;
};
