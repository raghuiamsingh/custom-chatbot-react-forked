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
  requestStartTime: number | null;
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
  | { type: "SET_REQUEST_START_TIME"; payload: number | null }
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
  requestStartTime: null,
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

    case "SET_REQUEST_START_TIME":
      return { ...state, requestStartTime: action.payload };

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
          .map((item: any) => (typeof item === 'string' ? item : item?.sku))
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
    dispatch({ type: "SET_REQUEST_START_TIME", payload: Date.now() });

    // Create new AbortController for this request
    const controller = new AbortController();
    dispatch({ type: "SET_ABORT_CONTROLLER", payload: controller });

    try {
      // Record request start time
      const requestStartTime = Date.now();

      // Encrypt initData before sending
      const encryptedInitData = await encryptInitData(initData);
      const body = JSON.stringify({ message: content, initData: encryptedInitData });
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`,
      };

      // Text-suggQ and products run independently (neither waits for the other). Only text-suggQ is required.
      const textPromise = fetch(buildApiUrl("/text-suggQ", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      const productsPromise = fetch(buildApiUrl("/products", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      // Resolve text first so we can start reading the stream immediately — do not wait for products.
      const textResponse = await textPromise;
      if (!textResponse.ok) {
        throw new Error("Failed to send message (text)");
      }

      const textReader = textResponse.body?.getReader();
      if (!textReader) {
        throw new Error("Response body is not readable");
      }

      const botMessageId = generateId();
      const botMessage: Message = {
        id: botMessageId,
        role: "bot",
        type: "text",
        content: { text: "" },
        isLoadingProducts: true,
        isLoadingSuggestions: true,
      };

      dispatch({ type: "ADD_MESSAGE", payload: botMessage });
      dispatch({ type: "REMOVE_TYPING_INDICATOR" });

      const decoder = new TextDecoder();
      let currentTextValue = "";

      const extractTextFromPartialJson = (jsonStr: string): string => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === "object" && "text" in parsed && typeof parsed.text === "string") {
            return parsed.text;
          }
        } catch (_) {}
        const textPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/;
        const match = jsonStr.match(textPattern);
        if (match?.[1]) {
          return match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\");
        }
        const incompletePattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)$/;
        const incompleteMatch = jsonStr.match(incompletePattern);
        if (incompleteMatch?.[1]) {
          return incompleteMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\");
        }
        return currentTextValue;
      };

      const readTextSuggQStream = async () => {
        let buffer = "";
        let accumulatedRawText = "";
        try {
          while (true) {
            const { done, value } = await textReader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
              const trimmed = event.trim();
              if (!trimmed.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(trimmed.substring(6));
                if (data.type === "chunk" && data.response) {
                  const { text: chunkText, suggestedQuestions: chunkSuggQ } = data.response;
                  if (typeof chunkText === "string" && chunkText !== currentTextValue) {
                    currentTextValue = chunkText;
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: { id: botMessageId, content: { text: chunkText } },
                    });
                  }
                  if (Array.isArray(chunkSuggQ) && chunkSuggQ.length > 0) {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: {
                        id: botMessageId,
                        suggestedQuestions: chunkSuggQ,
                        isLoadingSuggestions: false,
                      },
                    });
                  }
                } else if (data.type === "chunk" && typeof data.data === "string") {
                  // Fallback: raw token stream (legacy)
                  const token = data.data;
                  if (token) {
                    accumulatedRawText += token;
                    const trimmedAcc = accumulatedRawText.trim();
                    if (trimmedAcc.startsWith("{") || trimmedAcc.startsWith("[")) {
                      const extracted = extractTextFromPartialJson(accumulatedRawText);
                      if (extracted !== currentTextValue) {
                        currentTextValue = extracted;
                        dispatch({
                          type: "UPDATE_MESSAGE",
                          payload: { id: botMessageId, content: { text: extracted } },
                        });
                      }
                    } else {
                      currentTextValue = accumulatedRawText;
                      dispatch({
                        type: "UPDATE_MESSAGE",
                        payload: { id: botMessageId, content: { text: accumulatedRawText } },
                      });
                    }
                  }
                } else if (data.type === "done" && data.response) {
                  const { text, suggestedQuestions = [] } = data.response;
                  if (text && typeof text === "string") {
                    dispatch({
                      type: "UPDATE_MESSAGE",
                      payload: { id: botMessageId, content: { text } },
                    });
                  }
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: botMessageId,
                      suggestedQuestions,
                      isLoadingSuggestions: false,
                    },
                  });
                } else if (data.type === "error") {
                  throw new Error(data.error || "Stream error");
                }
              } catch (e) {
                if (e instanceof Error && e.message !== "Stream error") {
                  console.error("Error parsing text-suggQ SSE:", e);
                }
                throw e;
              }
            }
          }
          if (buffer.trim()) {
            const line = buffer.trim();
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.substring(6));
              if (data.type === "done" && data.response) {
                const { text, suggestedQuestions = [] } = data.response;
                if (text) {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: { id: botMessageId, content: { text } },
                  });
                }
                dispatch({
                  type: "UPDATE_MESSAGE",
                  payload: {
                    id: botMessageId,
                    suggestedQuestions,
                    isLoadingSuggestions: false,
                  },
                });
              }
            }
          }
        } finally {
          textReader.releaseLock();
        }
      };

      let hadProductsFromStream = false;
      const readProductsStream = async (productsReader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> => {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await productsReader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";
            for (const event of events) {
              const trimmed = event.trim();
              if (!trimmed.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(trimmed.substring(6));
                if (data.type === "done" && data.response) {
                  const products = Array.isArray(data.response.products) ? data.response.products : [];
                  if (products.length > 0) hadProductsFromStream = true;
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: botMessageId,
                      isLoadingProducts: false,
                      ...(products.length > 0
                        ? {
                            structured: { type: "product" as const, data: products },
                          }
                        : {}),
                    },
                  });
                  return;
                }
                if (data.type === "error") {
                  throw new Error(data.error || "Stream error");
                }
              } catch (e) {
                if (e instanceof Error && e.message !== "Stream error") {
                  console.error("Error parsing products SSE:", e);
                }
                throw e;
              }
            }
          }
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: { id: botMessageId, isLoadingProducts: false },
          });
        } catch (err) {
          console.error("Products stream error:", err);
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: { id: botMessageId, isLoadingProducts: false },
          });
        } finally {
          productsReader.releaseLock();
        }
      };

      // Start text stream immediately so chunks and "done" render without waiting for products.
      const textStreamPromise = readTextSuggQStream();
      const productsFlowPromise = (async () => {
        let productsReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        try {
          const productsResponse = await productsPromise;
          if (productsResponse.ok && productsResponse.body) {
            productsReader = productsResponse.body.getReader();
          }
        } catch (_) {
          // Do not throw on products failure — text and suggestedQuestions must always show
        }
        if (!productsReader) {
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: { id: botMessageId, isLoadingProducts: false },
          });
          return;
        }
        await readProductsStream(productsReader);
      })();
      await Promise.all([textStreamPromise, productsFlowPromise]);

      // Open products drawer only when we got products; UI shows products block only after text/suggQ are rendered (see MessageRenderer).
      if (hadProductsFromStream) {
        dispatch({
          type: "SET_SIDEBAR_STATE",
          payload: { isOpen: true, messageId: botMessageId },
        });
        window.dispatchEvent(new CustomEvent("chatbotRecommendationsOpened"));
      }

      const elapsedSeconds = Math.round((Date.now() - requestStartTime) / 1000);
      dispatch({
        type: "UPDATE_MESSAGE",
        payload: { id: botMessageId, responseTimeSeconds: elapsedSeconds },
      });

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
      dispatch({ type: "SET_REQUEST_START_TIME", payload: null });
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
      const encryptedInitData = await encryptInitData(initData);
      const context = getSuggestionsContext();

      const response = await fetch(buildApiUrl("/suggestions", initData.BOTDOJO_API_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`,
        },
        body: JSON.stringify({
          context,
          currentSetIndex: 0,
          initData: encryptedInitData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh suggestions");
      }

      const data = await response.json();

      if (data.suggestedQuestions && Array.isArray(data.suggestedQuestions)) {
        const newMessages = [...state.messages];
        let lastBotMessageIndex = -1;
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === "bot") {
            lastBotMessageIndex = i;
            break;
          }
        }
        if (lastBotMessageIndex !== -1) {
          const flatSuggestions = Array.isArray(data.suggestedQuestions[0])
            ? data.suggestedQuestions[0]
            : data.suggestedQuestions;
          newMessages[lastBotMessageIndex] = {
            ...newMessages[lastBotMessageIndex],
            suggestedQuestions: flatSuggestions,
          };
          dispatch({ type: "SET_MESSAGES", payload: newMessages });
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
