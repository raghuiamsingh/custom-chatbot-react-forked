import React from 'react';
import MessageBubble from './MessageBubble';
import ButtonGroup from './ButtonGroup';
import Card from './Card';
import { type Message } from '../types';

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
        
        {message.type === 'buttons' && (
          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            <p className="text-sm mb-2">
              {typeof message.content === 'string' ? message.content : message.content.text || ''}
            </p>
            <ButtonGroup 
              buttons={typeof message.content === 'object' && message.content.options ? 
                message.content.options.map((option: string) => ({ text: option, value: option })) : []} 
              onButtonClick={onButtonClick || (() => {})} 
            />
          </div>
        )}
        
        {message.type === 'card' && (
          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            <p className="text-sm mb-2">
              {typeof message.content === 'string' ? message.content : message.content.text || ''}
            </p>
            <Card
              title={typeof message.content === 'object' ? message.content.title || '' : ''}
              description={typeof message.content === 'object' ? message.content.description || '' : ''}
              image={typeof message.content === 'object' ? message.content.image : undefined}
            />
          </div>
        )}
        
        {message.type === 'list' && (
          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            <p className="text-sm mb-2">
              {typeof message.content === 'string' ? message.content : message.content.text || ''}
            </p>
            <ul className="list-disc list-inside space-y-1">
              {typeof message.content === 'object' && Array.isArray(message.content.list) && 
                message.content.list.map((item: string, index: number) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageRenderer;