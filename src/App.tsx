import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import { type Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugMode, setDebugMode] = useState(false);
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
    
    setMessages(prev => [...prev, userMessage]);
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

      // Handle multiple messages from server response
      if (data.messages && Array.isArray(data.messages)) {
        const botMessages: Message[] = data.messages.map((msg: any) => ({
          id: generateId(),
          role: msg.role || 'bot',
          type: msg.type || 'text',
          content: msg.content || 'Sorry, I could not process your message.'
        }));
        
        setMessages(prev => [...prev, ...botMessages]);
      } else {
        // Fallback for single message response
        const botMessage: Message = {
          id: generateId(),
          role: 'bot',
          type: data.type || 'text',
          content: data.content || 'Sorry, I could not process your message.'
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'bot',
        type: 'text',
        content: 'Sorry, there was an error processing your message. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = async (value: string) => {
    await sendMessage(value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">ChatBot</h1>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-600">
              🔍 Debug Mode
            </span>
          </label>
        </div>
      </div>
      
      <ChatWindow 
        messages={messages} 
        onButtonClick={handleButtonClick}
      />
      
      <InputBar 
        onSendMessage={sendMessage} 
        disabled={isLoading}
      />
    </div>
  );
}

export default App;