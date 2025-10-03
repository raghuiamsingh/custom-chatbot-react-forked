export type Message = {
  id: string;
  role: "user" | "bot";
  type: "text" | "buttons" | "card" | "list" | "typing";
  content: any; // Can be string, { text: string }, { options: string[] }, { title: string, description: string, image?: string }, { list: string[] }, {}
  suggestedQuestions?: string[]; // Optional array of suggested follow-up questions
};
