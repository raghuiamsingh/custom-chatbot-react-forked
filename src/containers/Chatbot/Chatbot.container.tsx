import type { FC } from "react";
import { ChatProvider } from "@contexts";
import { ChatbotContent } from "./ChatbotContent";

export interface InitData {
  BOTDOJO_API_KEY: string;
  BOTDOJO_BASE_URL: string;
  BOTDOJO_ACCOUNT_ID: string;
  BOTDOJO_PROJECT_ID: string;
  BOTDOJO_FLOW_ID: string;
  BOTDOJO_API_ENDPOINT?: string; // API endpoint prefix (e.g., "/api/v1" for prod, "" or "/" for local)
  SOURCE_API_BASE_URL: string;
  SOURCE_PRACTICE_TOKEN: string; // Token for authenticating with the source API
  SOURCE_AUTH_TOKEN: string; // Additional authentication token for the source API
  PRODUCT_SOURCE?: string; // Product source identifier for BotDojo API
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
  // Validate mandatory SOURCE_PRACTICE_TOKEN
  if (!initData.SOURCE_PRACTICE_TOKEN || typeof initData.SOURCE_PRACTICE_TOKEN !== 'string' || initData.SOURCE_PRACTICE_TOKEN.trim() === '') {
    throw new Error('SOURCE_PRACTICE_TOKEN is required and must be a non-empty string in initData');
  }

  // Validate mandatory SOURCE_API_BASE_URL
  if (!initData.SOURCE_API_BASE_URL || typeof initData.SOURCE_API_BASE_URL !== 'string' || initData.SOURCE_API_BASE_URL.trim() === '') {
    throw new Error('SOURCE_API_BASE_URL is required and must be a non-empty string in initData');
  }

  // Validate mandatory SOURCE_AUTH_TOKEN
  if (!initData.SOURCE_AUTH_TOKEN || typeof initData.SOURCE_AUTH_TOKEN !== 'string' || initData.SOURCE_AUTH_TOKEN.trim() === '') {
    throw new Error('SOURCE_AUTH_TOKEN is required and must be a non-empty string in initData');
  }

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
