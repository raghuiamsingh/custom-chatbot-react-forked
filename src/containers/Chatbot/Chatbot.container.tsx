import type { FC } from "react";
import { ChatProvider } from "../../contexts/ChatContext";
import { ChatbotContent } from "./ChatbotContent.component";

export interface ChatbotProps {
  isThemeRequired?: boolean;
  baseFontSize?: number;
  sidebarZIndex?: number;
}

export const Chatbot: FC<ChatbotProps> = ({ 
  isThemeRequired = false, 
  baseFontSize = 16,
  sidebarZIndex = 50 
}) => {
  return (
    <ChatProvider>
      <ChatbotContent 
        isThemeRequired={isThemeRequired} 
        baseFontSize={baseFontSize}
        sidebarZIndex={sidebarZIndex}
      />
    </ChatProvider>
  );
};
