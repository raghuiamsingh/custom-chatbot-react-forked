import React from 'react';

interface MessageBubbleProps {
  role: 'user' | 'bot';
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`p-3 max-w-md ${
          isUser
            ? 'bg-blue-500 text-white rounded-lg self-end'
            : 'bg-white border rounded-lg self-start'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
