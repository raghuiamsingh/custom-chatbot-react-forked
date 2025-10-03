import React, { useEffect, useRef } from 'react';
import MessageRenderer from './MessageRenderer';
import { Message } from '../types';

interface ChatWindowProps {
  messages: Message[];
  onButtonClick?: (value: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onButtonClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageRenderer
            key={index}
            message={message}
            onButtonClick={onButtonClick}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
