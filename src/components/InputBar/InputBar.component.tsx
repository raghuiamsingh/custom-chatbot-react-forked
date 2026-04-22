import React, { useState } from "react";

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false,
  onCancel,
}) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
      <form
          onSubmit={handleSubmit}
          className="flex gap-3 p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg transition-shadow duration-200 ease-in-out"
          role="form"
          aria-label="Chat message input"
        >
          <label htmlFor="message-input" className="sr-only">
            Type your message
          </label>
          <input
            id="message-input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={disabled}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-base transition-colors duration-300 ease-in-out"
            aria-describedby="input-help"
            autoComplete="off"
            maxLength={1000}
          />
          <div id="input-help" className="sr-only">
            Press Enter to send, Shift+Enter for new line. Maximum 1000
            characters.
          </div>
          {isLoading ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full transition-colors duration-300 ease-in-out animate-pulse focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
              aria-label="Stop generating response"
              aria-describedby="stop-help"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !message.trim()}
              className="p-2 bg-[#2563EB] text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
              aria-label={
                message.trim() ? `Send message: ${message}` : "Send message"
              }
              aria-describedby="send-help"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          )}
          <div id="stop-help" className="sr-only">
            Click to stop the current response generation
          </div>
          <div id="send-help" className="sr-only">
            Click to send your message to the chatbot
          </div>
        </form>
    </div>
  );
};
