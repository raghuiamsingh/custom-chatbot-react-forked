import React, { useEffect, useRef } from 'react';
import MessageRenderer from './MessageRenderer';
import SuggestedQuestions from './SuggestedQuestions';
import { type Message, type SidebarContent } from '../types';

interface ChatWindowProps {
  messages: Message[];
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (content: SidebarContent) => void;
  showInitialSuggestions?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  onButtonClick, 
  onQuestionClick, 
  onViewRecommendations,
  showInitialSuggestions = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Initial Suggested Questions Section - only show when no messages and enabled */}
      {messages.length === 0 && showInitialSuggestions && onQuestionClick && (
        <SuggestedQuestions onQuestionClick={onQuestionClick} />
      )}
      
      <div className="max-w-4xl mx-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-base leading-relaxed transition-colors duration-300 ease-in-out">Start a conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageRenderer
              key={message.id || index}
              message={message}
              messages={messages}
              messageIndex={index}
              onButtonClick={onButtonClick}
              onQuestionClick={onQuestionClick}
              onViewRecommendations={onViewRecommendations}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
