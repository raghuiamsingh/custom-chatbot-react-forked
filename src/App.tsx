import { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import { type Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const sendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      type: 'text',
      content: content
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send message to backend
      const response = await fetch('/chat', {
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
      
      // Add bot response
      const botMessage: Message = {
        id: generateId(),
        role: 'bot',
        type: data.type || 'text',
        content: data.content || 'Sorry, I could not process your message.'
      };
      
      setMessages(prev => [...prev, botMessage]);
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
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-800">ChatBot</h1>
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