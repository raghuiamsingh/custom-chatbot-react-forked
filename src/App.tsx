import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SettingsDropdown from './components/SettingsDropdown';
import ThemeToggle from './components/ThemeToggle';
import SuggestedQuestionsAction from './components/SuggestedQuestionsAction';
import Sidebar from './components/Sidebar';
import StructuredContentTester from './components/StructuredContentTester';
import { type Message, type SidebarState } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugMode, setDebugMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialSuggestions, setShowInitialSuggestions] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>({ isOpen: false, messageId: null });
  const [showContentTester, setShowContentTester] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const sendMessage = async (content: string) => {
    // Hide initial suggestions on first interaction and add intro message to history
    if (showInitialSuggestions) {
      setShowInitialSuggestions(false);
      
      // Add the introduction message as a bot message to scroll it into history
      const introMessage: Message = {
        id: generateId(),
        role: 'bot',
        type: 'text',
        content: { 
          text: "Hi, I'm your supplement discovery assistant. I can help you find the right products based on your goals, health concerns, or ingredient preferences. Whether you're curious about which supplements support sleep, stress relief, immune health, or energy, I'll guide you toward options that match your needs.\n\nYou can ask about specific conditions, ingredients, or general wellness goals — and I'll provide tailored product recommendations."
        }
      };
      
      setMessages(prev => [introMessage]);
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
    
    setMessages(prev => [...prev, userMessage, typingMessage]);
    setIsLoading(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

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
      if (data.debug && debugMode) {
        console.group('🔍 BotDojo Debug Info');
        console.log('📡 Endpoint:', data.debug.endpoint);
        console.log('📤 Request Body:', data.debug.requestBody);
        console.log('📥 Raw BotDojo Response:', data.debug.rawBotDojoResponse);
        console.groupEnd();
      }

      // Remove typing indicator and add real bot messages
      setMessages(prev => {
        const messagesWithoutTyping = prev.filter(msg => msg.id !== 'typing');
        
        if (data.messages && Array.isArray(data.messages)) {
          const botMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id || generateId(),
            role: msg.role || 'bot',
            type: msg.type || 'text',
            content: msg.content || 'Sorry, I could not process your message.',
            suggestedQuestions: msg.suggestedQuestions || undefined,
            structured: msg.structured || undefined
          }));
          
          return [...messagesWithoutTyping, ...botMessages];
        } else {
          // Fallback for single message response
          const botMessage: Message = {
            id: generateId(),
            role: 'bot',
            type: data.type || 'text',
            content: data.content || 'Sorry, I could not process your message.',
            suggestedQuestions: data.suggestedQuestions || undefined
          };
          
          return [...messagesWithoutTyping, botMessage];
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if the request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        // Remove typing indicator and add cancellation message
        setMessages(prev => {
          const messagesWithoutTyping = prev.filter(msg => msg.id !== 'typing');
          const cancelledMessage: Message = {
            id: generateId(),
            role: 'bot',
            type: 'text',
            content: { text: 'Generation stopped.' }
          };
          return [...messagesWithoutTyping, cancelledMessage];
        });
      } else {
        // Remove typing indicator and add error message
        setMessages(prev => {
          const messagesWithoutTyping = prev.filter(msg => msg.id !== 'typing');
          const errorMessage: Message = {
            id: generateId(),
            role: 'bot',
            type: 'text',
            content: { text: 'Sorry, there was an error processing your message. Please try again.' }
          };
          return [...messagesWithoutTyping, errorMessage];
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleButtonClick = async (value: string) => {
    await sendMessage(value);
  };

  const cancelRequest = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowInitialSuggestions(true);
    setSidebarState({ isOpen: false, messageId: null }); // Clear sidebar when starting new chat
    setShowContentTester(false); // Hide content tester when starting new chat
  };

  const handleViewRecommendations = (messageId: string) => {
    setSidebarState({ isOpen: true, messageId });
  };

  const handleCloseSidebar = () => {
    setSidebarState({ isOpen: false, messageId: null });
  };

  const handleTestStructuredContent = async (contentType: string) => {
    try {
      setIsLoading(true);
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
        
        setMessages(prev => [...prev, ...testMessages]);
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
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshSuggestions = async () => {
    if (messages.length === 0) return;
    
    setIsLoadingSuggestions(true);
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
      if (data.debug && debugMode) {
        console.group('🔍 BotDojo Debug Info (Suggestions Refresh)');
        console.log('📡 Endpoint:', data.debug.endpoint);
        console.log('📤 Request Body:', data.debug.requestBody);
        console.log('📥 Raw BotDojo Response:', data.debug.rawBotDojoResponse);
        console.groupEnd();
      }

      // Update the last bot message with new suggestions
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(prev => {
          const newMessages = [...prev];
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
            }
          }
          
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Get suggested questions from the last bot message
  const getSuggestedQuestions = () => {
    const lastBotMessage = [...messages].reverse().find(msg => msg.role === 'bot');
    return lastBotMessage?.suggestedQuestions || [];
  };

  // Get context from the last bot message for suggestions
  const getSuggestionsContext = () => {
    const lastBotMessage = [...messages].reverse().find(msg => msg.role === 'bot');
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
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, suggestedQuestions: [] }
        : msg
    ));
  };

  return (
        <div className="flex flex-col h-screen bg-[#FDFDFC] dark:bg-[#0D1117] font-sans transition-colors duration-300 ease-in-out">
          {/* Header - floating style */}
          <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="GetHealthy Assistant Logo" 
                  className="w-8 h-8"
                />
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">GetHealthy Assistant</h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <SettingsDropdown
                  debugMode={debugMode}
                  onDebugModeChange={setDebugMode}
                  onNewChat={handleNewChat}
                  showContentTester={showContentTester}
                  onContentTesterToggle={setShowContentTester}
                />
              </div>
            </div>
          </div>
      
      {/* Structured Content Tester - show when enabled in settings */}
      {showContentTester && (
        <div className="max-w-4xl mx-auto px-6 py-4">
          <StructuredContentTester onTestContent={handleTestStructuredContent} />
        </div>
      )}
      
      <ChatWindow 
        messages={messages} 
        onButtonClick={handleButtonClick}
        onQuestionClick={sendMessage}
        onViewRecommendations={handleViewRecommendations}
        onRemoveSuggestions={handleRemoveSuggestions}
      />
      
      {/* Suggested Questions Action - floating style */}
      {messages.length > 0 && (
        <div className="px-6 py-3 transition-colors duration-300 ease-in-out">
          <div className="flex justify-center">
            <SuggestedQuestionsAction
              onQuestionClick={sendMessage}
              onRefresh={handleRefreshSuggestions}
              questions={getSuggestedQuestions()}
              isLoading={isLoadingSuggestions}
              context={getSuggestionsContext()}
            />
          </div>
        </div>
      )}
      
      <InputBar 
        onSendMessage={sendMessage} 
        disabled={isLoading}
        isLoading={isLoading}
        onCancel={cancelRequest}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarState.isOpen}
        onClose={handleCloseSidebar}
        messageId={sidebarState.messageId}
        messages={messages}
      />
    </div>
  );
}

export default App;