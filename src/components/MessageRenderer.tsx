import React from 'react';
import MessageBubble from './MessageBubble';
import ButtonGroup from './ButtonGroup';
import ProductCard from './ProductCard';
import TypingIndicator from './TypingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import InlineCTA from './InlineCTA';
import { type Message } from '../types';

interface MessageRendererProps {
  message: Message;
  messages: Message[];
  messageIndex: number;
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message, messages, messageIndex, onButtonClick, onQuestionClick, onViewRecommendations }) => {
  const isUser = message.role === 'user';
  
  // No longer need consecutive product grouping since products are stored as structured content
  
  if (isUser) {
    // User messages: right-aligned bubbles
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-xs lg:max-w-md">
          {message.type === 'text' && (
            <MessageBubble role={message.role} text={message.content.text} />
          )}
        </div>
      </div>
    );
  }
  
  // Handle typing indicator
  if (message.type === 'typing') {
    return <TypingIndicator />;
  }
  
      // Bot messages: professional content blocks with centered max-width
      return (
        <div className="mb-6">
          <div className="max-w-2xl mx-auto">
            {message.type === 'text' && (
              <div className="px-4 py-3">
                <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap transition-colors duration-300 ease-in-out">
                  {message.content.text}
                </div>
                {/* Show CTA if structured content is available */}
                {message.structured && message.structured.data.length > 0 && onViewRecommendations && (
                  <InlineCTA
                    count={message.structured.data.length}
                    contentType={message.structured.type}
                    messageId={message.id}
                    onViewRecommendations={onViewRecommendations}
                  />
                )}
              </div>
            )}
            
            {message.type === 'buttons' && (
              <div className="px-4 py-3">
                <ButtonGroup 
                  options={message.content.options} 
                  onButtonClick={onButtonClick || (() => {})} 
                />
              </div>
            )}
            
            {/* Product messages are now handled as structured content in text messages */}
            
            {message.type === 'list' && (
              <div className="px-4 py-3">
                <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
                  {message.content.items.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Dynamic Suggested Questions */}
            {message.suggestedQuestions && message.suggestedQuestions.length > 0 && onQuestionClick && (
              <SuggestedQuestions 
                onQuestionClick={onQuestionClick} 
                questions={message.suggestedQuestions}
                variant="dynamic"
              />
            )}
          </div>
        </div>
      );
};

export default MessageRenderer;