import React, { useEffect, useRef } from "react";
import { MessageRenderer } from "@components";
import { type Message } from "@types";

interface ChatWindowProps {
  messages: Message[];
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
  onRemoveSuggestions?: (messageId: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onButtonClick,
  onQuestionClick,
  onViewRecommendations,
  onRemoveSuggestions,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      className="flex-1 overflow-y-auto"
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
                Hi, I'm your supplement discovery assistant. I can help you find
                the right products based on your goals, health concerns, or
                ingredient preferences. Whether you're curious about which
                supplements support sleep, stress relief, immune health, or
                energy, I'll guide you toward options that match your needs. You
                can ask about specific conditions, ingredients, or general
                wellness goals — and I'll provide tailored product
                recommendations.
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
                    {[
                      "What supplements can help with sleep?",
                      "What can I take for stress?",
                      "How do I support my immune system?",
                      "What are the best energy supplements?",
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={() => onQuestionClick(question)}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ease-in-out group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`Ask: ${question}`}
                        type="button"
                      >
                        <span className="text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-200">
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
                />
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </div>
  );
};
