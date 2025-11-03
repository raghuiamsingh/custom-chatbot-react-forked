import type { FC } from "react";
import { ChatProvider } from "../../contexts/ChatContext";
import { ChatbotContent } from "./ChatbotContent.component";

export interface ChatbotProps {
  isThemeRequired?: boolean;
}

export const Chatbot: FC<ChatbotProps> = ({ isThemeRequired = false }) => {
  return (
    <ChatProvider>
      <ChatbotContent isThemeRequired={isThemeRequired} />
    </ChatProvider>
  );
};
