import type { FC } from "react";
import { ChatProvider } from "@contexts";
import { ChatbotContent } from "./ChatbotContent";

export interface InitData {
  BOTDOJO_API_KEY: string;
  BOTDOJO_BASE_URL: string;
  BOTDOJO_ACCOUNT_ID: string;
  BOTDOJO_PROJECT_ID: string;
  BOTDOJO_FLOW_ID: string;
}

export interface ChatbotProps {
  isThemeRequired?: boolean;
  baseFontSize?: number;
  sidebarZIndex?: number;
  maxHeight?: number;
  initData: InitData;
}

export const Chatbot: FC<ChatbotProps> = ({
  isThemeRequired = false,
  baseFontSize = 16,
  sidebarZIndex = 50,
  maxHeight,
  initData
}) => {
  return (
    <ChatProvider initData={initData}>
      <ChatbotContent
        isThemeRequired={isThemeRequired}
        baseFontSize={baseFontSize}
        sidebarZIndex={sidebarZIndex}
        maxHeight={maxHeight}
      />
    </ChatProvider >
  );
};
