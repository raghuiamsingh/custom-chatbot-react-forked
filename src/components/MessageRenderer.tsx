import React from 'react';
import MessageBubble from './MessageBubble';
import ButtonGroup from './ButtonGroup';
import Card from './Card';
import { Message } from '../types';

interface MessageRendererProps {
  message: Message;
  onButtonClick?: (value: string) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message, onButtonClick }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isUser ? 'order-2' : 'order-1'}`}>
        {message.type === 'text' && (
          <MessageBubble content={message.content} role={message.role} />
        )}
        
        {message.type === 'buttons' && message.buttons && (
          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            <p className="text-sm mb-2">{message.content}</p>
            <ButtonGroup 
              buttons={message.buttons} 
              onButtonClick={onButtonClick || (() => {})} 
            />
          </div>
        )}
        
        {message.type === 'card' && message.card && (
          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            <p className="text-sm mb-2">{message.content}</p>
            <Card
              title={message.card.title}
              description={message.card.description}
              image={message.card.image}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageRenderer;
