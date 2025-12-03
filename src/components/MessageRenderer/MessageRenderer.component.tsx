import React from "react";
import { motion } from "framer-motion";
import { MessageBubble, ButtonGroup, TypingIndicator, SuggestedQuestions, ProductCard } from "@components";
import { type Message, type Product } from "@types";
import { parseMarkdownBold } from "@utils/constants";

interface MessageRendererProps {
  message: Message;
  messages: Message[];
  messageIndex: number;
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
  onRemoveSuggestions?: (messageId: string) => void;
  isLoading?: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  onButtonClick,
  onQuestionClick,
  onViewRecommendations,
  onRemoveSuggestions,
  isLoading = false,
}) => {
  const isUser = message.role === "user";

  // No longer need consecutive product grouping since products are stored as structured content

  if (isUser) {
    // User messages: right-aligned bubbles
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-full">
          {message.type === "text" && (
            <MessageBubble role={message.role} text={message.content.text} />
          )}
        </div>
      </div>
    );
  }

  // Handle typing indicator
  if (message.type === "typing") {
    return <TypingIndicator />;
  }

  // Bot messages: professional content blocks
  return (
    <div className="mb-6">
      <div className="mx-auto">
        {message.type === "text" && (
          <div className="px-4 py-3">
            <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap transition-colors duration-300 ease-in-out">
              {parseMarkdownBold(message.content.text)}
            </div>

            {/* Loading state for products */}
            {message.isLoadingProducts && (
              <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading products...</span>
                </div>
              </div>
            )}

            {/* Structured content (products, cards, etc.) - only show when loaded */}
            {!message.isLoadingProducts &&
              message.structured &&
              message.structured.type === "product" &&
              message.structured.data.length > 0 && (
                <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-md text-gray-900 dark:text-gray-100">
                      I found {message.structured.data.length} {message.structured.data.length === 1 ? "product" : "products"} —
                    </h3>

                    <motion.button
                      onClick={() => onViewRecommendations && onViewRecommendations(message.id)}
                      className="group relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 overflow-hidden"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-label="Open Canvas to view recommended products"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <span className="relative z-10 flex items-center gap-2">
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
                            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                          />
                        </svg>
                        <span>View Products</span>
                        <motion.svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </motion.svg>
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}

            {/* Loading state for suggested questions */}
            {message.isLoadingSuggestions && (
              <div className="mt-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading suggestions...</span>
              </div>
            )}
          </div>
        )}

        {message.type === "buttons" && (
          <div className="px-4 py-3">
            <ButtonGroup
              options={message.content.options}
              onButtonClick={onButtonClick || (() => { })}
            />
          </div>
        )}

        {message.type === "list" && (
          <div className="px-4 py-3">
            <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
              {message.content.items.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {!message.isLoadingSuggestions &&
          message.suggestedQuestions &&
          message.suggestedQuestions.length > 0 &&
          onQuestionClick && (
            <SuggestedQuestions
              onQuestionClick={(question) => {
                if (!isLoading) {
                  onQuestionClick(question);
                  // Remove suggestions after clicking
                  if (onRemoveSuggestions) {
                    onRemoveSuggestions(message.id);
                  }
                }
              }}
              questions={message.suggestedQuestions}
              variant="dynamic"
              disabled={isLoading}
            />
          )}
      </div>
    </div>
  );
};
