import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SettingsDropdown from './components/SettingsDropdown';
import ThemeToggle from './components/ThemeToggle';
import SuggestedQuestionsAction from './components/SuggestedQuestionsAction';
import Sidebar from './components/Sidebar';
import { type Message, type SidebarContent } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugMode, setDebugMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialSuggestions, setShowInitialSuggestions] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [sidebarContent, setSidebarContent] = useState<SidebarContent | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const sendMessage = async (content: string) => {
    // Hide initial suggestions on first interaction
    if (showInitialSuggestions) {
      setShowInitialSuggestions(false);
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

    try {
      // Send message to backend server
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
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
            id: generateId(),
            role: msg.role || 'bot',
            type: msg.type || 'text',
            content: msg.content || 'Sorry, I could not process your message.'
          }));
          
          return [...messagesWithoutTyping, ...botMessages];
        } else {
          // Fallback for single message response
          const botMessage: Message = {
            id: generateId(),
            role: 'bot',
            type: data.type || 'text',
            content: data.content || 'Sorry, I could not process your message.'
          };
          
          return [...messagesWithoutTyping, botMessage];
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = async (value: string) => {
    await sendMessage(value);
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowInitialSuggestions(true);
    setSidebarContent(null); // Clear sidebar when starting new chat
  };

  const handleViewRecommendations = (content: SidebarContent) => {
    setSidebarContent(content);
  };

  const handleCloseSidebar = () => {
    setSidebarContent(null);
  };

  const handleRefreshSuggestions = async () => {
    if (messages.length === 0) return;
    
    setIsLoadingSuggestions(true);
    try {
      // Send a request to get fresh suggestions
      const response = await fetch('http://localhost:3001/chat', {
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

      return (
        <div className="flex flex-col h-screen bg-[#FDFDFC] dark:bg-[#0D1117] font-sans transition-colors duration-300 ease-in-out">
          {/* Header - floating style */}
          <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">ChatBot</h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <SettingsDropdown
                  debugMode={debugMode}
                  onDebugModeChange={setDebugMode}
                  onNewChat={handleNewChat}
                />
              </div>
            </div>
          </div>
      
      <ChatWindow 
        messages={messages} 
        onButtonClick={handleButtonClick}
        onQuestionClick={sendMessage}
        onViewRecommendations={handleViewRecommendations}
        showInitialSuggestions={showInitialSuggestions}
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
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarContent !== null}
        onClose={handleCloseSidebar}
        content={sidebarContent}
      />
    </div>
  );
}

export default App;