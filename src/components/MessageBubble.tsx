import React from 'react';

interface MessageBubbleProps {
  content: string | { text: string };
  role: 'user' | 'bot';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ content, role }) => {
  const isUser = role === 'user';
  
  // Extract text content from either string or object
  const textContent = typeof content === 'string' ? content : content.text;
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{textContent}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
