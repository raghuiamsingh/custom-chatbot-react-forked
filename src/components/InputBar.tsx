import React, { useState } from 'react';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-full shadow-soft-md dark:shadow-dark-md hover:shadow-soft-lg dark:hover:shadow-dark-lg focus-within:shadow-soft-lg dark:focus-within:shadow-dark-lg transition-shadow duration-200 ease-in-out">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-full focus:outline-none focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-base transition-colors duration-300 ease-in-out"
          />
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="px-5 py-2 bg-[#2563EB] text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out font-medium"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default InputBar;
