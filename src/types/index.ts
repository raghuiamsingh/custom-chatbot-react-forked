export interface Message {
  role: 'user' | 'assistant';
  type: 'text' | 'buttons' | 'card';
  content: string;
  buttons?: Array<{
    text: string;
    value: string;
  }>;
  card?: {
    title: string;
    description: string;
    image?: string;
  };
}
