import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type { Message, SidebarState, ChatResponse, Product } from "@types";
import type { InitData } from "@containers/Chatbot";
import { encryptInitData } from "../utils/encryption";
import { buildApiUrl } from "../utils/apiUrl";
import { INTRODUCTION_MESSAGE, parseStreamedText } from "@utils/constants";
import { normalizeProducts } from "../utils/productNormalizer";

// State interfaces
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isLoadingSuggestions: boolean;
  showInitialSuggestions: boolean;
  sidebarState: SidebarState;
  showContentTester: boolean;
  debugMode: boolean;
  abortController: AbortController | null;
}

// Action types
type ChatAction =
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "ADD_MESSAGES"; payload: Message[] }
  | { type: "UPDATE_MESSAGE"; payload: Partial<Message> & { id: string } }
  | { type: "REMOVE_TYPING_INDICATOR" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_LOADING_SUGGESTIONS"; payload: boolean }
  | { type: "SET_SHOW_INITIAL_SUGGESTIONS"; payload: boolean }
  | { type: "SET_SIDEBAR_STATE"; payload: SidebarState }
  | { type: "SET_SHOW_CONTENT_TESTER"; payload: boolean }
  | { type: "SET_DEBUG_MODE"; payload: boolean }
  | { type: "SET_ABORT_CONTROLLER"; payload: AbortController | null }
  | { type: "REMOVE_SUGGESTIONS"; payload: string }
  | { type: "RESET_CHAT" };

// Initial state
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isLoadingSuggestions: false,
  showInitialSuggestions: true,
  sidebarState: { isOpen: false, messageId: null, isLoadingProductInfo: false },
  showContentTester: false,
  debugMode: true,
  abortController: null,
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };

    case "ADD_MESSAGES":
      return { ...state, messages: [...state.messages, ...action.payload] };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload }
            : msg
        ),
      };

    case "REMOVE_TYPING_INDICATOR":
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== "typing"),
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_LOADING_SUGGESTIONS":
      return { ...state, isLoadingSuggestions: action.payload };

    case "SET_SHOW_INITIAL_SUGGESTIONS":
      return { ...state, showInitialSuggestions: action.payload };

    case "SET_SIDEBAR_STATE":
      return { ...state, sidebarState: action.payload };

    case "SET_SHOW_CONTENT_TESTER":
      return { ...state, showContentTester: action.payload };

    case "SET_DEBUG_MODE":
      return { ...state, debugMode: action.payload };

    case "SET_ABORT_CONTROLLER":
      return { ...state, abortController: action.payload };

    case "REMOVE_SUGGESTIONS":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload ? { ...msg, suggestedQuestions: [] } : msg
        ),
      };

    case "RESET_CHAT":
      return {
        ...initialState,
        debugMode: state.debugMode, // Preserve debug mode setting
      };

    default:
      return state;
  }
}

// Context
interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  initData: InitData;
  // Helper functions
  generateId: () => string;
  sendMessage: (content: string) => Promise<void>;
  handleButtonClick: (value: string) => Promise<void>;
  cancelRequest: () => void;
  handleNewChat: () => void;
  handleViewRecommendations: (messageId: string) => void;
  handleCloseSidebar: () => void;
  handleTestStructuredContent: (contentType: string) => Promise<void>;
  handleRefreshSuggestions: () => Promise<void>;
  handleRemoveSuggestions: (messageId: string) => void;
  getSuggestedQuestions: () => string[];
  getSuggestionsContext: () => string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
  initData: InitData;
}

export function ChatProvider({ children, initData }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const prevSidebarOpenRef = React.useRef(false);

  // Helper function to generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Call product-info API when sidebar opens
  useEffect(() => {
    const isSidebarOpen = state.sidebarState.isOpen;
    const wasSidebarClosed = !prevSidebarOpenRef.current;
    
    // Only call API when sidebar transitions from closed to open
    if (isSidebarOpen && wasSidebarClosed && state.sidebarState.messageId) {
      const message = state.messages.find((msg) => msg.id === state.sidebarState.messageId);
      
      // Extract SKUs from the message if it has structured product data
      if (message?.structured?.type === 'product' && message.structured.data) {
        const products = message.structured.data
          .map((item: any) => item.sku)
          .filter((sku: string | undefined): sku is string => Boolean(sku));
        
        if (products.length > 0) {
          // Set loading state
          dispatch({
            type: "SET_SIDEBAR_STATE",
            payload: { 
              ...state.sidebarState, 
              isLoadingProductInfo: true 
            },
          });

          // Call the product-info API
          (async () => {
            try {
              // Encrypt initData before sending
              const encryptedInitData = await encryptInitData(initData);

              const response = await fetch(buildApiUrl("/product-info", initData.BOTDOJO_API_ENDPOINT), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`
                },
                body: JSON.stringify({
                  // TODO: this is a temporary fix for BotDojo's issue, to ensure the products are formatted correctly for the API
                  products: products.map((item) => item.split(" ").join("-")),
                  initData: encryptedInitData
                }),
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch product info: ${response.status}`);
              }

              const data = await response.json();
              
              if (data.success && data.products && Array.isArray(data.products)) {
                // Normalize the product data from API
                const normalizedProducts = normalizeProducts(data.products);
                
                // Update the message with enriched product data
                dispatch({
                  type: "UPDATE_MESSAGE",
                  payload: {
                    id: state.sidebarState.messageId!,
                    structured: {
                      type: 'product',
                      data: normalizedProducts
                    }
                  }
                });
              }
            } catch (error) {
              // Log error but don't block the UI
              console.error("Failed to call product-info API:", error);
            } finally {
              // Clear loading state
              dispatch({
                type: "SET_SIDEBAR_STATE",
                payload: { 
                  ...state.sidebarState, 
                  isLoadingProductInfo: false 
                },
              });
            }
          })();
        }
      }
    }
    
    // Update ref for next render
    prevSidebarOpenRef.current = isSidebarOpen;
  }, [state.sidebarState.isOpen, state.sidebarState.messageId, state.messages, initData]);

  // Send message function
  const sendMessage = async (content: string) => {
    // Close sidebar when a new message is sent
    if (state.sidebarState.isOpen) {
      dispatch({
        type: "SET_SIDEBAR_STATE",
        payload: { isOpen: false, messageId: null, isLoadingProductInfo: false },
      });
      window.dispatchEvent(new CustomEvent('chatbotRecommendationsClosed'));
    }

    // Hide initial suggestions on first interaction and add intro message to history
    if (state.showInitialSuggestions) {
      dispatch({ type: "SET_SHOW_INITIAL_SUGGESTIONS", payload: false });

      // Add the introduction message as a bot message to scroll it into history
      const introMessage: Message = {
        id: generateId(),
        role: "bot",
        type: "text",
        content: {
          text: INTRODUCTION_MESSAGE,
        },
      };

      dispatch({ type: "SET_MESSAGES", payload: [introMessage] });
    }

    // Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      type: "text",
      content: { text: content },
    };

    // Add typing indicator immediately
    const typingMessage: Message = {
      id: "typing",
      role: "bot",
      type: "typing",
      content: {},
    };

    dispatch({ type: "ADD_MESSAGES", payload: [userMessage, typingMessage] });
    dispatch({ type: "SET_LOADING", payload: true });

    // Create new AbortController for this request
    const controller = new AbortController();
    dispatch({ type: "SET_ABORT_CONTROLLER", payload: controller });

    try {
      // Encrypt initData before sending
      // Will automatically fall back to plain text if encryption is not available
      const encryptedInitData = await encryptInitData(initData);

      // Send message to backend server with encrypted BotDojo config in body
      const response = await fetch(buildApiUrl("/chat", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`
        },
        body: JSON.stringify({
          message: content,
          initData: encryptedInitData
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle streaming response (Server-Sent Events format)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      // Create a bot message for streaming content
      const botMessageId = generateId();
      let accumulatedRawText = ''; // Raw accumulated text (may contain JSON)
      let buffer = '';
      let shouldStopStreamingText = false; // Flag to stop streaming text when we hit other keys
      let currentTextValue = ''; // Current extracted text value
      
      const botMessage: Message = {
        id: botMessageId,
        role: "bot",
        type: "text",
        content: { text: '' },
        isLoadingProducts: true, // Show loading state for products
        isLoadingSuggestions: true, // Show loading state for suggestions
      };
      
      dispatch({ type: "ADD_MESSAGE", payload: botMessage });
      dispatch({ type: "REMOVE_TYPING_INDICATOR" });
      
      // Helper function to extract text value from partial JSON incrementally
      const extractTextFromPartialJson = (jsonStr: string): string => {
        if (shouldStopStreamingText) {
          return currentTextValue; // Don't update if we've hit other keys
        }
        
        // Check if we've hit "suggestedQuestions" or "products" keys (before "text" value ends)
        // Look for these keys appearing after the text field
        const textEndPattern = /"text"\s*:\s*"[^"]*"/;
        const hasTextEnd = textEndPattern.test(jsonStr);
        
        if (hasTextEnd && (jsonStr.includes('"suggestedQuestions"') || jsonStr.includes('"products"'))) {
          shouldStopStreamingText = true;
        }
        
        // Try parsing as complete JSON first (most reliable if JSON is complete)
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string') {
            return parsed.text;
          }
        } catch (e) {
          // JSON incomplete, try regex extraction
        }
        
        // Try to find the "text" field value using regex (for partial JSON)
        // Pattern: "text": "value" - handle escaped quotes and newlines
        // Match from "text": " to the closing quote (handling escaped quotes)
        const textPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/;
        const match = jsonStr.match(textPattern);
        
        if (match && match[1]) {
          // Unescape the string value
          const unescaped = match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
          return unescaped;
        }
        
        // Try to find incomplete text value (text field started but not closed yet)
        // Pattern: "text": "value... (no closing quote yet)
        const incompleteTextPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)$/;
        const incompleteMatch = jsonStr.match(incompleteTextPattern);
        
        if (incompleteMatch && incompleteMatch[1]) {
          // Unescape the partial string value
          const unescaped = incompleteMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
          return unescaped;
        }
        
        return currentTextValue;
      };

      // Read stream chunks and parse SSE format
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Parse SSE format: lines starting with "data: " followed by JSON
        // SSE format is: "data: {...}\n\n" (double newline separates events)
        const events = buffer.split('\n\n');
        
        // Process complete events (keep last incomplete event in buffer)
        // Process events one at a time to ensure UI updates are visible
        for (let i = 0; i < events.length - 1; i++) {
          const event = events[i].trim();
          
          if (event.startsWith('data: ')) {
            try {
              const jsonStr = event.substring(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'chunk') {
                // Accumulate the chunk data (data.data is the text token from onNewToken)
                const token = typeof data.data === 'string' ? data.data : '';
                if (token && !shouldStopStreamingText) {
                  accumulatedRawText += token;
                  
                  // Extract text value incrementally from JSON as it streams
                  const trimmed = accumulatedRawText.trim();
                  
                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    // Looks like JSON - extract text value incrementally
                    const extractedText = extractTextFromPartialJson(accumulatedRawText);
                    
                    if (extractedText && extractedText !== currentTextValue) {
                      currentTextValue = extractedText;
                      
                      // Update the message immediately with the current text (streaming in real-time)
                      dispatch({
                        type: "UPDATE_MESSAGE",
                        payload: {
                          id: botMessageId,
                          content: { text: extractedText }
                        }
                      });
                    }
                  } else {
                    // Not JSON - treat as plain text and display directly
                    // This handles the case where tokens are just plain text
                    currentTextValue = accumulatedRawText;
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        content: { text: accumulatedRawText }
                      }
                    });
                  }
                }
              } else if (data.type === 'done') {
                // Stream complete - process final response for products and suggestions
                
                // Final parse of accumulated text to ensure we have the complete "text" field
                const trimmed = accumulatedRawText.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(accumulatedRawText);
                    if (parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string') {
                      // Update with final complete text value
                      currentTextValue = parsed.text;
                      dispatch({
                        type: "UPDATE_MESSAGE",
                        payload: {
                          id: botMessageId,
                          content: { text: currentTextValue }
                        }
                      });
                    }
                  } catch (e) {
                    // JSON parsing failed - text should already be displayed from streaming
                  }
                }
                
                // Process final response for products and suggested questions
                if (data.response) {
                  const { text, products = [], suggestedQuestions = [] } = data.response;
                  
                  // Update text if provided in response (may override streamed text)
                  if (text && typeof text === 'string') {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        content: { text: text }
                      }
                    });
                  }
                  
                  // Show suggestedQuestions immediately when available
                  if (suggestedQuestions.length > 0) {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        suggestedQuestions: suggestedQuestions,
                        isLoadingSuggestions: false, // Hide loader now that suggestions are ready
                      }
                    });
                  }
                  
                  // Show products when response ends
                  if (products.length > 0) {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        structured: {
                          type: 'product',
                          data: products
                        },
                        isLoadingProducts: false, // Hide loader now that products are ready
                      }
                    });

                    // Automatically open sidebar if products are present
                    dispatch({
                      type: "SET_SIDEBAR_STATE",
                      payload: { isOpen: true, messageId: botMessageId },
                    });
                    window.dispatchEvent(new CustomEvent('chatbotRecommendationsOpened'));
                  } else {
                    // No products - hide loading state
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        isLoadingProducts: false,
                      }
                    });
                  }
                  
                  // If no suggestedQuestions in response, hide loading state
                  if (suggestedQuestions.length === 0) {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        isLoadingSuggestions: false,
                      }
                    });
                  }
                } else {
                  // No response data - hide loading states
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: botMessageId,
                      isLoadingProducts: false,
                      isLoadingSuggestions: false,
                    }
                  });
                }
              } else if (data.type === 'error') {
                console.error('Stream error:', data.error);
                throw new Error(data.error || 'Stream error');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, event.substring(0, 100));
            }
          }
        }
        
        // Keep the last (possibly incomplete) event for next iteration
        buffer = events[events.length - 1];
      }
      
      // Process any remaining buffer
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'chunk') {
              const token = typeof data.data === 'string' ? data.data : '';
              if (token) {
                accumulatedRawText += token;
                
                // Extract text value incrementally from JSON as it streams
                const trimmed = accumulatedRawText.trim();
                
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  // Looks like JSON - extract text value incrementally
                  const extractedText = extractTextFromPartialJson(accumulatedRawText);
                  
                  if (extractedText && extractedText !== currentTextValue) {
                    currentTextValue = extractedText;
                    
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        content: { text: extractedText }
                      }
                    });
                  }
                } else {
                  // Not JSON yet - might be plain text
                  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.includes('"text"')) {
                    currentTextValue = accumulatedRawText;
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        content: { text: accumulatedRawText }
                      }
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing final SSE data:', e);
          }
        }
      }

      // For now, we'll skip the old response handling since we're streaming
      return;

    } catch (error) {
      console.error("Error sending message:", error);

      // Check if the request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        // Remove typing indicator and add cancellation message
        dispatch({ type: "REMOVE_TYPING_INDICATOR" });
        const cancelledMessage: Message = {
          id: generateId(),
          role: "bot",
          type: "text",
          content: { text: "Generation stopped." },
        };
        dispatch({ type: "ADD_MESSAGE", payload: cancelledMessage });
      } else {
        // Remove typing indicator and add error message
        dispatch({ type: "REMOVE_TYPING_INDICATOR" });
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          type: "text",
          content: {
            text: "Sorry, there was an error processing your message. Please try again.",
          },
        };
        dispatch({ type: "ADD_MESSAGE", payload: errorMessage });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_ABORT_CONTROLLER", payload: null });
    }
  };

  const handleButtonClick = async (value: string) => {
    await sendMessage(value);
  };

  const cancelRequest = () => {
    if (state.abortController) {
      state.abortController.abort();
    }
  };

  const handleNewChat = () => {
    dispatch({ type: "RESET_CHAT" });

    // Dispatch custom event when sidebar is closed
    window.dispatchEvent(new CustomEvent('chatbotRecommendationsClosed'));
  };

  const handleViewRecommendations = (messageId: string) => {
    dispatch({
      type: "SET_SIDEBAR_STATE",
      payload: { isOpen: true, messageId },
    });
    // Dispatch custom event when sidebar is opened
    window.dispatchEvent(new CustomEvent('chatbotRecommendationsOpened'));
  };

  const handleCloseSidebar = () => {
    dispatch({
      type: "SET_SIDEBAR_STATE",
      payload: { isOpen: false, messageId: null, isLoadingProductInfo: false },
    });
    // Dispatch custom event when sidebar is closed
    window.dispatchEvent(new CustomEvent('chatbotRecommendationsClosed'));
  };

  const handleTestStructuredContent = async (contentType: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Encrypt initData before sending
      const encryptedInitData = await encryptInitData(initData);

      const response = await fetch(buildApiUrl("/test-structured", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`
        },
        body: JSON.stringify({
          contentType,
          initData: encryptedInitData
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch test content");
      }

      const data = await response.json();

      if (data.messages && Array.isArray(data.messages)) {
        const testMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || generateId(),
          role: msg.role || "bot",
          type: msg.type || "text",
          content: msg.content || "Test content",
          structured: msg.structured || undefined,
        }));

        dispatch({ type: "ADD_MESSAGES", payload: testMessages });
      }
    } catch (error) {
      console.error("Error testing structured content:", error);
      // Add error message to chat
      const errorMessage: Message = {
        id: generateId(),
        role: "bot",
        type: "text",
        content: {
          text: "Sorry, there was an error loading the test content.",
        },
      };
      dispatch({ type: "ADD_MESSAGE", payload: errorMessage });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleRefreshSuggestions = async () => {
    if (state.messages.length === 0) return;

    dispatch({ type: "SET_LOADING_SUGGESTIONS", payload: true });
    try {
      // Encrypt initData before sending
      const encryptedInitData = await encryptInitData(initData);

      // Send a request to get fresh suggestions
      const response = await fetch(buildApiUrl("/chat", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`
        },
        body: JSON.stringify({
          message: "Please provide some suggested follow-up questions",
          initData: encryptedInitData
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh suggestions");
      }

      const data = await response.json();

      // Update the last bot message with new suggestions
      if (data.messages && Array.isArray(data.messages)) {
        const newMessages = [...state.messages];
        // Find the last bot message index
        let lastBotMessageIndex = -1;
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === "bot") {
            lastBotMessageIndex = i;
            break;
          }
        }

        if (lastBotMessageIndex !== -1) {
          // Find suggestions from the new response
          const suggestionsMessage = data.messages.find(
            (msg: any) => msg.suggestedQuestions
          );
          if (suggestionsMessage) {
            newMessages[lastBotMessageIndex] = {
              ...newMessages[lastBotMessageIndex],
              suggestedQuestions: suggestionsMessage.suggestedQuestions,
            };
            dispatch({ type: "SET_MESSAGES", payload: newMessages });
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing suggestions:", error);
    } finally {
      dispatch({ type: "SET_LOADING_SUGGESTIONS", payload: false });
    }
  };

  // Get suggested questions from the last bot message
  const getSuggestedQuestions = () => {
    const lastBotMessage = [...state.messages]
      .reverse()
      .find((msg) => msg.role === "bot");
    return lastBotMessage?.suggestedQuestions || [];
  };

  // Get context from the last bot message for suggestions
  const getSuggestionsContext = () => {
    const lastBotMessage = [...state.messages]
      .reverse()
      .find((msg) => msg.role === "bot");
    if (
      lastBotMessage &&
      lastBotMessage.content &&
      lastBotMessage.content.text
    ) {
      // Extract key topics from the bot's response for context
      const text = lastBotMessage.content.text.toLowerCase();
      if (text.includes("sleep")) return "sleep and relaxation";
      if (text.includes("energy") || text.includes("focus"))
        return "energy and cognitive function";
      if (text.includes("immune")) return "immune system support";
      if (text.includes("stress")) return "stress management";
      if (text.includes("vitamin") || text.includes("multivitamin"))
        return "daily vitamins and nutrition";
      if (text.includes("digest")) return "digestive health";
      if (text.includes("heart")) return "cardiovascular health";
      if (text.includes("recovery")) return "recovery and performance";
    }
    return "general health and wellness";
  };

  const handleRemoveSuggestions = (messageId: string) => {
    dispatch({ type: "REMOVE_SUGGESTIONS", payload: messageId });
  };

  const contextValue: ChatContextType = {
    state,
    dispatch,
    initData,
    generateId,
    sendMessage,
    handleButtonClick,
    cancelRequest,
    handleNewChat,
    handleViewRecommendations,
    handleCloseSidebar,
    handleTestStructuredContent,
    handleRefreshSuggestions,
    handleRemoveSuggestions,
    getSuggestedQuestions,
    getSuggestionsContext,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}

// Hook to use the chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
