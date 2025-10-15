import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Message, SidebarState } from '../types';

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
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES'; payload: Message[] }
  | { type: 'REMOVE_TYPING_INDICATOR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_SUGGESTIONS'; payload: boolean }
  | { type: 'SET_SHOW_INITIAL_SUGGESTIONS'; payload: boolean }
  | { type: 'SET_SIDEBAR_STATE'; payload: SidebarState }
  | { type: 'SET_SHOW_CONTENT_TESTER'; payload: boolean }
  | { type: 'SET_DEBUG_MODE'; payload: boolean }
  | { type: 'SET_ABORT_CONTROLLER'; payload: AbortController | null }
  | { type: 'REMOVE_SUGGESTIONS'; payload: string }
  | { type: 'RESET_CHAT' };

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
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    
    case 'ADD_MESSAGES':
      return { ...state, messages: [...state.messages, ...action.payload] };
    
    case 'REMOVE_TYPING_INDICATOR':
      return { 
        ...state, 
        messages: state.messages.filter(msg => msg.id !== 'typing') 
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_LOADING_SUGGESTIONS':
      return { ...state, isLoadingSuggestions: action.payload };
    
    case 'SET_SHOW_INITIAL_SUGGESTIONS':
      return { ...state, showInitialSuggestions: action.payload };
    
    case 'SET_SIDEBAR_STATE':
      return { ...state, sidebarState: action.payload };
    
    case 'SET_SHOW_CONTENT_TESTER':
      return { ...state, showContentTester: action.payload };
    
    case 'SET_DEBUG_MODE':
      return { ...state, debugMode: action.payload };
    
    case 'SET_ABORT_CONTROLLER':
      return { ...state, abortController: action.payload };
    
    case 'REMOVE_SUGGESTIONS':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload 
            ? { ...msg, suggestedQuestions: [] }
            : msg
        )
      };
    
    case 'RESET_CHAT':
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
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Helper function to generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Send message function
  const sendMessage = async (content: string) => {
    // Hide initial suggestions on first interaction and add intro message to history
    if (state.showInitialSuggestions) {
      dispatch({ type: 'SET_SHOW_INITIAL_SUGGESTIONS', payload: false });
      
      // Add the introduction message as a bot message to scroll it into history
      const introMessage: Message = {
        id: generateId(),
        role: 'bot',
        type: 'text',
        content: { 
          text: "Hi, I'm your supplement discovery assistant. I can help you find the right products based on your goals, health concerns, or ingredient preferences. Whether you're curious about which supplements support sleep, stress relief, immune health, or energy, I'll guide you toward options that match your needs.\n\nYou can ask about specific conditions, ingredients, or general wellness goals — and I'll provide tailored product recommendations."
        }
      };
      
      dispatch({ type: 'SET_MESSAGES', payload: [introMessage] });
    }
    
    // Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      type: 'text',
      content: { text: content }
    };
    
    // Add typing indicator immediately
    const typingMessage: Message = {
      id: 'typing',
      role: 'bot',
      type: 'typing',
      content: {}
    };
    
    dispatch({ type: 'ADD_MESSAGES', payload: [userMessage, typingMessage] });
    dispatch({ type: 'SET_LOADING', payload: true });

    // Create new AbortController for this request
    const controller = new AbortController();
    dispatch({ type: 'SET_ABORT_CONTROLLER', payload: controller });

    try {
      // Send message to backend server
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Log raw BotDojo response to browser console if available and debug mode is enabled
      if (data.debug && state.debugMode) {
        console.group('🔍 BotDojo Debug Info');
        console.log('📡 Endpoint:', data.debug.endpoint);
        console.log('📤 Request Body:', data.debug.requestBody);
        console.log('📥 Raw BotDojo Response:', data.debug.rawBotDojoResponse);
        console.log('💾 Cached:', data.debug.cached || false);
        console.groupEnd();
      }

      // Remove typing indicator and add real bot messages
      dispatch({ type: 'REMOVE_TYPING_INDICATOR' });
      
      if (data.messages && Array.isArray(data.messages)) {
        const botMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || generateId(),
          role: msg.role || 'bot',
          type: msg.type || 'text',
          content: msg.content || 'Sorry, I could not process your message.',
          suggestedQuestions: msg.suggestedQuestions || undefined,
          structured: msg.structured || undefined
        }));
        
        dispatch({ type: 'ADD_MESSAGES', payload: botMessages });
      } else {
        // Fallback for single message response
        const botMessage: Message = {
          id: generateId(),
          role: 'bot',
          type: data.type || 'text',
          content: data.content || 'Sorry, I could not process your message.',
          suggestedQuestions: data.suggestedQuestions || undefined
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: botMessage });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if the request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        // Remove typing indicator and add cancellation message
        dispatch({ type: 'REMOVE_TYPING_INDICATOR' });
        const cancelledMessage: Message = {
          id: generateId(),
          role: 'bot',
          type: 'text',
          content: { text: 'Generation stopped.' }
        };
        dispatch({ type: 'ADD_MESSAGE', payload: cancelledMessage });
      } else {
        // Remove typing indicator and add error message
        dispatch({ type: 'REMOVE_TYPING_INDICATOR' });
        const errorMessage: Message = {
          id: generateId(),
          role: 'bot',
          type: 'text',
          content: { text: 'Sorry, there was an error processing your message. Please try again.' }
        };
        dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ABORT_CONTROLLER', payload: null });
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
    dispatch({ type: 'RESET_CHAT' });
  };

  const handleViewRecommendations = (messageId: string) => {
    dispatch({ type: 'SET_SIDEBAR_STATE', payload: { isOpen: true, messageId } });
  };

  const handleCloseSidebar = () => {
    dispatch({ type: 'SET_SIDEBAR_STATE', payload: { isOpen: false, messageId: null } });
  };

  const handleTestStructuredContent = async (contentType: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('/test-structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test content');
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        const testMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || generateId(),
          role: msg.role || 'bot',
          type: msg.type || 'text',
          content: msg.content || 'Test content',
          structured: msg.structured || undefined
        }));
        
        dispatch({ type: 'ADD_MESSAGES', payload: testMessages });
      }
    } catch (error) {
      console.error('Error testing structured content:', error);
      // Add error message to chat
      const errorMessage: Message = {
        id: generateId(),
        role: 'bot',
        type: 'text',
        content: { text: 'Sorry, there was an error loading the test content.' }
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleRefreshSuggestions = async () => {
    if (state.messages.length === 0) return;
    
    dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: true });
    try {
      // Send a request to get fresh suggestions
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: "Please provide some suggested follow-up questions" }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh suggestions');
      }

      const data = await response.json();
      
      // Log raw BotDojo response to browser console if available and debug mode is enabled
      if (data.debug && state.debugMode) {
        console.group('🔍 BotDojo Debug Info (Suggestions Refresh)');
        console.log('📡 Endpoint:', data.debug.endpoint);
        console.log('📤 Request Body:', data.debug.requestBody);
        console.log('📥 Raw BotDojo Response:', data.debug.rawBotDojoResponse);
        console.groupEnd();
      }

      // Update the last bot message with new suggestions
      if (data.messages && Array.isArray(data.messages)) {
        const newMessages = [...state.messages];
        // Find the last bot message index
        let lastBotMessageIndex = -1;
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'bot') {
            lastBotMessageIndex = i;
            break;
          }
        }
        
        if (lastBotMessageIndex !== -1) {
          // Find suggestions from the new response
          const suggestionsMessage = data.messages.find((msg: any) => msg.suggestedQuestions);
          if (suggestionsMessage) {
            newMessages[lastBotMessageIndex] = {
              ...newMessages[lastBotMessageIndex],
              suggestedQuestions: suggestionsMessage.suggestedQuestions
            };
            dispatch({ type: 'SET_MESSAGES', payload: newMessages });
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: false });
    }
  };

  // Get suggested questions from the last bot message
  const getSuggestedQuestions = () => {
    const lastBotMessage = [...state.messages].reverse().find(msg => msg.role === 'bot');
    return lastBotMessage?.suggestedQuestions || [];
  };

  // Get context from the last bot message for suggestions
  const getSuggestionsContext = () => {
    const lastBotMessage = [...state.messages].reverse().find(msg => msg.role === 'bot');
    if (lastBotMessage && lastBotMessage.content && lastBotMessage.content.text) {
      // Extract key topics from the bot's response for context
      const text = lastBotMessage.content.text.toLowerCase();
      if (text.includes('sleep')) return 'sleep and relaxation';
      if (text.includes('energy') || text.includes('focus')) return 'energy and cognitive function';
      if (text.includes('immune')) return 'immune system support';
      if (text.includes('stress')) return 'stress management';
      if (text.includes('vitamin') || text.includes('multivitamin')) return 'daily vitamins and nutrition';
      if (text.includes('digest')) return 'digestive health';
      if (text.includes('heart')) return 'cardiovascular health';
      if (text.includes('recovery')) return 'recovery and performance';
    }
    return 'general health and wellness';
  };

  const handleRemoveSuggestions = (messageId: string) => {
    dispatch({ type: 'REMOVE_SUGGESTIONS', payload: messageId });
  };

  const contextValue: ChatContextType = {
    state,
    dispatch,
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
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use the chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
