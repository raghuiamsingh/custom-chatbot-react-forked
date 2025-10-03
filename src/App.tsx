import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SettingsDropdown from './components/SettingsDropdown';
import ThemeToggle from './components/ThemeToggle';
import { type Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugMode, setDebugMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const sendMessage = async (content: string) => {
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
  };

      return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300 ease-in-out">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm transition-colors duration-300 ease-in-out">
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
      />
      
      <InputBar 
        onSendMessage={sendMessage} 
        disabled={isLoading}
      />
    </div>
  );
}

export default App;