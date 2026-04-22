import React, { useLayoutEffect, useRef, useState } from "react";

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
  const [alignSendToBottom, setAlignSendToBottom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MIN_VISIBLE_ROWS = 1;
  const MAX_VISIBLE_ROWS = 5;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.paddingTop = "";
    el.style.paddingBottom = "";

    el.style.height = "auto";
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 24;
    const paddingY =
      parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
    const minH = lineHeight * MIN_VISIBLE_ROWS + paddingY;
    const maxH = lineHeight * MAX_VISIBLE_ROWS + paddingY;
    const contentScrollHeight = el.scrollHeight;
    const next = Math.min(Math.max(contentScrollHeight, minH), maxH);
    el.style.height = `${next}px`;
    el.style.overflowY = contentScrollHeight > maxH ? "auto" : "hidden";

    setAlignSendToBottom(contentScrollHeight > minH + 1);

    if (message === "") {
      const padY = (next - lineHeight) / 2;
      el.style.paddingTop = `${Math.max(0, padY)}px`;
      el.style.paddingBottom = `${Math.max(0, padY)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
      <form
        onSubmit={handleSubmit}
        className={`flex gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg transition-shadow duration-200 ease-in-out ${
          alignSendToBottom ? "items-end" : "items-center"
        }`}
        role="form"
        aria-label="Chat message input"
      >
        <label htmlFor="message-input" className="sr-only">
          Message input
        </label>
        <textarea
          ref={textareaRef}
          id="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hi. How can I help you today?"
          disabled={disabled}
          rows={MIN_VISIBLE_ROWS}
          className="w-full min-h-0 flex-1 mx-1 my-1 px-5 py-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-lg leading-7 text-start placeholder:text-start placeholder-gray-400 rounded-2xl shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-0 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed resize-none transition-colors duration-300 ease-in-out"
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
            className="shrink-0 p-2.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full transition-colors duration-300 ease-in-out animate-pulse outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 flex items-center justify-center"
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
            className="shrink-0 p-2.5 bg-[#2563EB] text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 flex items-center justify-center"
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
