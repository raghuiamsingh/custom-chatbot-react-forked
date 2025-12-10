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
  isLoadingProducts?: boolean; // Loading state for products
  isLoadingSuggestions?: boolean; // Loading state for suggested questions
};

// Raw product data from the API
export type RawProductApiResponse = {
  sku: string;
  name: string;
  brand: string;
  type_id: string;
  fulfillment: string[];
  product_purchase_options: any[];
  product_typegroup: string;
  thumbnail: string;
  updated_at: string;
  description: string; // HTML string
  generated_description: string;
  form: string;
  size: string;
  ingredients: string[];
  suggested_use: string; // HTML string
  autoship_intervals: string[];
  availability: string;
  price: number;
  formatted_price: string;
  stock_item: {
    sku: string;
    stock_id: number;
    qty: number;
    availability: string;
    manage_stock: boolean;
    min_sale_qty: number;
    max_sale_qty: number;
    qty_increments: number;
  };
  is_favorite: boolean;
  media_gallery_images: Array<{
    small_image: string;
    full_image: string;
    roles: string[];
    position: number;
  }>;
  supplier_dosage: {
    dosage_qty: number;
    dosage_frequency: string;
    dosage_food_option: string;
    dosage_duration: string;
  };
  is_evexia_test: boolean;
};

// Normalized product data for display in ProductCard
export type Product = {
  sku: string;
  name: string;
  description: string; // Plain text, HTML stripped
  price: string; // Formatted price string
  ingredients: string[];
  benefits: string[]; // Not in API, kept for compatibility
  dosage: string; // From suggested_use, HTML stripped
  warnings: string; // Not in API, kept for compatibility
  productUrl: string; // Generated URL
  imageUrl: string; // From thumbnail or media_gallery_images
  category: string; // From product_typegroup
  brand: string;
  servings: string; // From size
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
  isLoadingProductInfo?: boolean;
};
