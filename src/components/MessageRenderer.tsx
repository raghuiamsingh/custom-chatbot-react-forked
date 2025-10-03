import React from 'react';
import MessageBubble from './MessageBubble';
import ButtonGroup from './ButtonGroup';
import Card from './Card';
import TypingIndicator from './TypingIndicator';
import { type Message } from '../types';

interface MessageRendererProps {
  message: Message;
  messages: Message[];
  messageIndex: number;
  onButtonClick?: (value: string) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message, messages, messageIndex, onButtonClick }) => {
  const isUser = message.role === 'user';
  
  // Group consecutive card messages for grid layout
  const getConsecutiveCards = () => {
    const cards = [];
    let i = messageIndex;
    
    // If this is a card message, collect consecutive cards
    if (message.type === 'card') {
      while (i < messages.length && messages[i].type === 'card' && messages[i].role === 'bot') {
        cards.push(messages[i]);
        i++;
      }
    }
    
    return cards;
  };
  
  const consecutiveCards = getConsecutiveCards();
  const isFirstCard = message.type === 'card' && messageIndex === 0 || 
    (messageIndex > 0 && messages[messageIndex - 1].type !== 'card');
  
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
            
            {message.type === 'card' && isFirstCard && (
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consecutiveCards.map((cardMessage, index) => (
                    <Card key={cardMessage.id || index} {...cardMessage.content} />
                  ))}
                </div>
              </div>
            )}
            
            {message.type === 'card' && !isFirstCard && (
              // Skip rendering - this card is already rendered as part of the group
              null
            )}
            
            {message.type === 'list' && (
              <div className="px-4 py-3">
                <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
                  {message.content.items.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
};

export default MessageRenderer;