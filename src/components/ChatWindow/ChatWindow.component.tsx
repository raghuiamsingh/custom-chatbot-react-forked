import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { motion } from "framer-motion";
import { MessageRenderer } from "@components";
import { type Message } from "@types";
import { INTRODUCTION_MESSAGE, parseMarkdownBold, getRandomSuggestedQuestions } from "@utils/constants";

interface ChatWindowProps {
  messages: Message[];
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
  onRemoveSuggestions?: (messageId: string) => void;
  isLoading?: boolean;
  onScrollChange?: (isNearBottom: boolean) => void;
}

export interface ChatWindowRef {
  scrollToBottom: () => void;
  isNearBottom: () => boolean;
}

export const ChatWindow = forwardRef<ChatWindowRef, ChatWindowProps>(({
  messages,
  onButtonClick,
  onQuestionClick,
  onViewRecommendations,
  onRemoveSuggestions,
  isLoading = false,
  onScrollChange,
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const isNearBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100; // Consider "near bottom" if within 100px
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom,
    isNearBottom,
  }));

  useEffect(() => {
    const handleScroll = () => {
      if (onScrollChange) {
        onScrollChange(isNearBottom());
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      // Initial check
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [onScrollChange]);

  useEffect(() => {
    // Only scroll when a bot response is received (last message is from bot)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "bot" && lastMessage.type !== "typing") {
        // Scroll 20px down smoothly
        scrollContainerRef.current?.scrollBy({
          top: 20,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto min-h-0 chatbot-content-scroll break-words"
      role="log"
      aria-label="Chat conversation"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="mx-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="space-y-6">
            {/* Introduction Message */}
            <div className="px-4 py-3" role="banner">
              <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap transition-colors duration-300 ease-in-out">
                {parseMarkdownBold(INTRODUCTION_MESSAGE)}
              </div>
            </div>

            {/* Starter Questions */}
            {onQuestionClick && (
              <div className="space-y-4">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h2 className="sr-only">Suggested starter questions</h2>
                  <div
                    className="grid gap-3"
                    role="group"
                    aria-label="Suggested starter questions"
                  >
                    {getRandomSuggestedQuestions().map((question, index) => (
                      <button
                        key={index}
                        onClick={() => !isLoading && onQuestionClick(question)}
                        disabled={isLoading}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ease-in-out group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
                        aria-label={`Ask: ${question}`}
                        type="button"
                      >
                        <span className={`transition-colors duration-200 ${isLoading ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'}`}>
                          {question}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div role="list" aria-label="Chat messages">
              {messages.map((message, index) => (
                <div key={message.id || index} role="listitem">
                  <MessageRenderer
                    message={message}
                    messages={messages}
                    messageIndex={index}
                    onButtonClick={onButtonClick}
                    onQuestionClick={onQuestionClick}
                    onViewRecommendations={onViewRecommendations}
                    onRemoveSuggestions={onRemoveSuggestions}
                    isLoading={isLoading}
                  />
                </div>
              ))}
            </div>
            {/* Loading dot when fetching from API */}
            {isLoading && (
              <div className="mb-6">
                <div className="px-4 pt-2">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-gray-600 dark:bg-gray-500"
                    animate={{
                      opacity: [0.6, 1, 0.6],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

ChatWindow.displayName = "ChatWindow";
