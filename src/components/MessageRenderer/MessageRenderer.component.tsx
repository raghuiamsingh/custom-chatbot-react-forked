import React from "react";
import { motion } from "framer-motion";
import { MessageBubble, ButtonGroup, SuggestedQuestions, ProductCard, TypingIndicator } from "@components";
import { type Message, type Product } from "@types";
import { parseMarkdownBold, parseStreamedText } from "@utils/constants";
import { formatDuration } from "@utils/formatDuration";

interface MessageRendererProps {
  message: Message;
  messages: Message[];
  messageIndex: number;
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
  onRemoveSuggestions?: (messageId: string) => void;
  isLoading?: boolean;
  isTextStreaming?: boolean;
  requestStartTime?: number | null;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  messages,
  messageIndex,
  onButtonClick,
  onQuestionClick,
  onViewRecommendations,
  onRemoveSuggestions,
  isLoading = false,
  isTextStreaming = false,
  requestStartTime = null,
}) => {
  const isLastMessage = messageIndex === messages.length - 1;
  const showLoadingState = isLoading && message.role === "bot" && message.type === "text" && isLastMessage;
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


  // Typing message - loading text at top
  if (message.type === "typing") {
    return (
      <div className="px-4 py-3">
        <div className="mb-2">
          <TypingIndicator variant="pre-stream" requestStartTime={requestStartTime} />
        </div>
      </div>
    );
  }

  // Bot messages: professional content blocks
  // Extract plain text when content is the raw JSON object (text + suggestedQuestions + products)
  const displayText = parseStreamedText(message.content.text || "");

  // Only show products section after text or suggested questions have been received
  const hasTextOrSuggQ =
    displayText.length > 0 || message.isLoadingSuggestions === false;

  return (
    <div>
      <div className="mx-auto">
        {message.type === "text" && (
          <div className="px-4 py-3">
            {/* Loading text at top when loading; finished text when done */}
            {message.responseTimeSeconds != null ? (
              <div className="mb-2 text-[15px] text-gray-500 dark:text-gray-400">
                Finished in {formatDuration(message.responseTimeSeconds)}
              </div>
            ) : showLoadingState && (
              <div className="mb-2">
                <TypingIndicator variant={(isTextStreaming || displayText.length > 0) ? "streaming" : "pre-stream"} requestStartTime={requestStartTime} />
              </div>
            )}
            <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap transition-colors duration-300 ease-in-out">
              {parseMarkdownBold(displayText)}
            </div>


            {/* Products: only visible after text/suggQ received; show loading or loaded content */}
            {hasTextOrSuggQ && (
              <>
                {message.isLoadingProducts && (
                  <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="h-5 w-48 bg-gray-200 dark:bg-gray-600 rounded" />
                      <div className="h-10 w-32 bg-gray-200 dark:bg-gray-600 rounded-xl" />
                    </div>
                  </div>
                )}
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
              </>
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
