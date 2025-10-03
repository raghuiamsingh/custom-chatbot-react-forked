import React from 'react';

interface MessageBubbleProps {
  role: 'user' | 'bot';
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`px-4 py-2 max-w-md transition-colors duration-300 ease-in-out ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm'
          }`}
        >
          <p className="text-base whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">{text}</p>
        </div>
    </div>
  );
};

export default MessageBubble;
