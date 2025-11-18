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
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-soft-md dark:shadow-dark-md hover:shadow-soft-lg dark:hover:shadow-dark-lg focus-within:shadow-soft-lg dark:focus-within:shadow-dark-lg transition-shadow duration-200 ease-in-out"
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
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-base transition-colors duration-300 ease-in-out"
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
              className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full font-medium transition-colors duration-300 ease-in-out animate-pulse focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Stop generating response"
              aria-describedby="stop-help"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !message.trim()}
              className="px-5 py-2 bg-[#2563EB] text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={
                message.trim() ? `Send message: ${message}` : "Send message"
              }
              aria-describedby="send-help"
            >
              Send
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
    </div>
  );
};
