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
