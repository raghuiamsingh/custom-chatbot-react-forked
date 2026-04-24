import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Message, SidebarState, ChatResponse, Product } from "@types";
import type { InitData } from "@containers/Chatbot";
import { encryptInitData } from "../utils/encryption";
import { buildApiUrl } from "../utils/apiUrl";
import { INTRODUCTION_MESSAGE, parseStreamedText } from "@utils/constants";
import { normalizeProducts } from "../utils/productNormalizer";
import { useMessageCache } from "@hooks";

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
  isHydratingFromCache: boolean;
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
  | { type: "RESET_CHAT" }
  | { type: "PREPEND_MESSAGES"; payload: Message[] }
  | { type: "SET_HYDRATING_FROM_CACHE"; payload: boolean };

// Initial state
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isLoadingSuggestions: false,
  showInitialSuggestions: true,
  sidebarState: { isOpen: false, messageId: null },
  showContentTester: false,
  debugMode: true,
  abortController: null,
  requestStartTime: null,
  isHydratingFromCache: false,
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

    case "PREPEND_MESSAGES":
      return {
        ...state,
        messages: [...action.payload, ...state.messages],
      };

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

    case "SET_HYDRATING_FROM_CACHE":
      return { ...state, isHydratingFromCache: action.payload };

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

function extractProductSkus(data: unknown[]): string[] {
  return data
    .map((item: unknown) => (typeof item === "string" ? item : (item as { sku?: string })?.sku))
    .filter((sku): sku is string => Boolean(sku));
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
  enableCache: boolean;
  cachePagination: { hasOlderMessages: boolean; isLoadingOlder: boolean };
  loadOlderMessages: () => Promise<void>;
  isHydratingFromCache: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
  initData: InitData;
  enableCache?: boolean;
  /** With `enableCache`, skips (and removes) IndexedDB rows older than 3h only while reading the cache. */
  enableCacheAutoExpiry?: boolean;
}

export function ChatProvider({
  children,
  initData,
  enableCache = false,
  enableCacheAutoExpiry = false,
}: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    isHydratingFromCache: enableCache,
  });
  const prevSidebarOpenRef = useRef(false);
  const chatSendGenerationRef = useRef(0);

  const { pagination, loadOlderMessages, clearCache } = useMessageCache({
    enableCache,
    enableCacheAutoExpiry,
    initData,
    messages: state.messages,
    onMessagesLoaded: useCallback((messages) => {
      dispatch({ type: "SET_MESSAGES", payload: messages });
      dispatch({ type: "SET_SHOW_INITIAL_SUGGESTIONS", payload: false });
    }, []),
    onPrependMessages: useCallback((messages) => {
      dispatch({ type: "PREPEND_MESSAGES", payload: messages });
    }, []),
    onInitialCacheReadStarted: useCallback(() => {
      dispatch({ type: "SET_HYDRATING_FROM_CACHE", payload: true });
    }, []),
    onInitialCacheReadFinished: useCallback(() => {
      dispatch({ type: "SET_HYDRATING_FROM_CACHE", payload: false });
    }, []),
  });

  // When cache is turned off, ensure we are not stuck in a hydrating UI state.
  useEffect(() => {
    if (!enableCache) {
      dispatch({ type: "SET_HYDRATING_FROM_CACHE", payload: false });
    }
  }, [enableCache]);

  // Helper function to generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const productInfoInFlightRef = React.useRef(new Set<string>());

  const fetchProductInfoForMessage = useCallback(
    async (messageId: string, productSkus: string[]) => {
      if (productSkus.length === 0) return;
      if (productInfoInFlightRef.current.has(messageId)) return;
      productInfoInFlightRef.current.add(messageId);

      dispatch({
        type: "UPDATE_MESSAGE",
        payload: {
          id: messageId,
          isLoadingProductInfo: true,
          productInfoResolved: false,
          productInfoCount: undefined,
        },
      });

      try {
        const encryptedInitData = await encryptInitData(initData);

        const response = await fetch(buildApiUrl("/product-info", initData.BOTDOJO_API_ENDPOINT), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${initData.BOTDOJO_API_KEY}`,
          },
          body: JSON.stringify({
            // TODO: temporary fix for BotDojo — ensure SKUs are formatted correctly for the API
            products: productSkus.map((item) => item.split(" ").join("-")),
            initData: encryptedInitData,
            product_source: initData.PRODUCT_SOURCE ?? "",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch product info: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.products && Array.isArray(data.products)) {
          const normalizedProducts = normalizeProducts(data.products);
          const apiCount = data.products.length;
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: {
              id: messageId,
              structured: { type: "product" as const, data: normalizedProducts },
              isLoadingProductInfo: false,
              productInfoResolved: true,
              productInfoCount: apiCount,
            },
          });
        } else {
          dispatch({
            type: "UPDATE_MESSAGE",
            payload: {
              id: messageId,
              isLoadingProductInfo: false,
              productInfoResolved: true,
            },
          });
        }
      } catch (error) {
        console.error("Failed to call product-info API:", error);
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            id: messageId,
            isLoadingProductInfo: false,
            productInfoResolved: true,
          },
        });
      } finally {
        productInfoInFlightRef.current.delete(messageId);
      }
    },
    [initData],
  );

  // Call product-info when sidebar opens if this message is not already enriched
  useEffect(() => {
    const isSidebarOpen = state.sidebarState.isOpen;
    const wasSidebarClosed = !prevSidebarOpenRef.current;

    if (isSidebarOpen && wasSidebarClosed && state.sidebarState.messageId) {
      const message = state.messages.find((msg) => msg.id === state.sidebarState.messageId);
      if (
        message?.structured?.type === "product" &&
        message.structured.data?.length &&
        message.productInfoResolved !== true
      ) {
        const productSkus = extractProductSkus(message.structured.data);
        if (productSkus.length > 0) {
          void fetchProductInfoForMessage(state.sidebarState.messageId, productSkus);
        }
      }
    }

    prevSidebarOpenRef.current = isSidebarOpen;
  }, [state.sidebarState.isOpen, state.sidebarState.messageId, state.messages, fetchProductInfoForMessage]);

  // Send message function
  const sendMessage = async (content: string) => {
    const sendGen = chatSendGenerationRef.current;
    const d = (action: ChatAction) => {
      if (sendGen !== chatSendGenerationRef.current) return;
      dispatch(action);
    };

    // Close sidebar when a new message is sent
    if (state.sidebarState.isOpen) {
      d({
        type: "SET_SIDEBAR_STATE",
        payload: { isOpen: false, messageId: null },
      });
      window.dispatchEvent(new CustomEvent('chatbotRecommendationsClosed'));
    }

    // Hide initial suggestions on first interaction and add intro message to history
    if (state.showInitialSuggestions) {
      d({ type: "SET_SHOW_INITIAL_SUGGESTIONS", payload: false });

      // Add the introduction message as a bot message to scroll it into history
      const introMessage: Message = {
        id: generateId(),
        role: "bot",
        type: "text",
        content: {
          text: INTRODUCTION_MESSAGE,
        },
      };

      d({ type: "SET_MESSAGES", payload: [introMessage] });
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

    d({ type: "ADD_MESSAGES", payload: [userMessage, typingMessage] });
    d({ type: "SET_LOADING", payload: true });
    d({ type: "SET_REQUEST_START_TIME", payload: Date.now() });

    // Create new AbortController for this request
    const controller = new AbortController();
    d({ type: "SET_ABORT_CONTROLLER", payload: controller });

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

      d({ type: "ADD_MESSAGE", payload: botMessage });
      d({ type: "REMOVE_TYPING_INDICATOR" });

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
                    d({
                      type: "UPDATE_MESSAGE",
                      payload: { id: botMessageId, content: { text: chunkText } },
                    });
                  }
                  if (Array.isArray(chunkSuggQ) && chunkSuggQ.length > 0) {
                    d({
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
                        d({
                          type: "UPDATE_MESSAGE",
                          payload: { id: botMessageId, content: { text: extracted } },
                        });
                      }
                    } else {
                      currentTextValue = accumulatedRawText;
                      d({
                        type: "UPDATE_MESSAGE",
                        payload: { id: botMessageId, content: { text: accumulatedRawText } },
                      });
                    }
                  }
                } else if (data.type === "done" && data.response) {
                  const { text, suggestedQuestions = [] } = data.response;
                  if (text && typeof text === "string") {
                    d({
                      type: "UPDATE_MESSAGE",
                      payload: { id: botMessageId, content: { text } },
                    });
                  }
                  d({
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
                  d({
                    type: "UPDATE_MESSAGE",
                    payload: { id: botMessageId, content: { text } },
                  });
                }
                d({
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
                  d({
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
                  if (products.length > 0) {
                    const skus = extractProductSkus(products);
                    if (skus.length > 0) {
                      void fetchProductInfoForMessage(botMessageId, skus);
                    }
                  }
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
          d({
            type: "UPDATE_MESSAGE",
            payload: { id: botMessageId, isLoadingProducts: false },
          });
        } catch (err) {
          console.error("Products stream error:", err);
          d({
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
          d({
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
        d({
          type: "SET_SIDEBAR_STATE",
          payload: { isOpen: true, messageId: botMessageId },
        });
        window.dispatchEvent(new CustomEvent("chatbotRecommendationsOpened"));
      }

      const elapsedSeconds = Math.round((Date.now() - requestStartTime) / 1000);
      d({
        type: "UPDATE_MESSAGE",
        payload: { id: botMessageId, responseTimeSeconds: elapsedSeconds },
      });

    } catch (error) {
      console.error("Error sending message:", error);

      // Check if the request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        // Remove typing indicator and add cancellation message
        d({ type: "REMOVE_TYPING_INDICATOR" });
        const cancelledMessage: Message = {
          id: generateId(),
          role: "bot",
          type: "text",
          content: { text: "Generation stopped." },
        };
        d({ type: "ADD_MESSAGE", payload: cancelledMessage });
      } else {
        // Remove typing indicator and add error message
        d({ type: "REMOVE_TYPING_INDICATOR" });
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          type: "text",
          content: {
            text: "Sorry, there was an error processing your message. Please try again.",
          },
        };
        d({ type: "ADD_MESSAGE", payload: errorMessage });
      }
    } finally {
      d({ type: "SET_LOADING", payload: false });
      d({ type: "SET_ABORT_CONTROLLER", payload: null });
      d({ type: "SET_REQUEST_START_TIME", payload: null });
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

  const handleNewChat = async () => {
    chatSendGenerationRef.current += 1;
    if (state.abortController) {
      state.abortController.abort();
    }
    await clearCache();
    dispatch({ type: "RESET_CHAT" });
    window.dispatchEvent(new CustomEvent("chatbotRecommendationsClosed"));
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
      payload: { isOpen: false, messageId: null },
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
        const testMessages: Message[] = data.messages.map((msg: any) => {
          const structured = msg.structured || undefined;
          const isProductStructured = structured?.type === "product" && Array.isArray(structured.data);
          return {
            id: msg.id || generateId(),
            role: msg.role || "bot",
            type: msg.type || "text",
            content: msg.content || "Test content",
            structured,
            ...(isProductStructured
              ? {
                  productInfoResolved: true,
                  productInfoCount: structured.data.length,
                }
              : {}),
          };
        });

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
    enableCache: enableCache,
    cachePagination: pagination,
    loadOlderMessages,
    isHydratingFromCache: state.isHydratingFromCache,
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
