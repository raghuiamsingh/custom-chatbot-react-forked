import React from "react";
import { MessageBubble, ButtonGroup, TypingIndicator, SuggestedQuestions, ProductCard } from "@components";
import { type Message, type Product } from "@types";

interface MessageRendererProps {
  message: Message;
  messages: Message[];
  messageIndex: number;
  onButtonClick?: (value: string) => void;
  onQuestionClick?: (question: string) => void;
  onViewRecommendations?: (messageId: string) => void;
  onRemoveSuggestions?: (messageId: string) => void;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  onButtonClick,
  onQuestionClick,
  onViewRecommendations,
  onRemoveSuggestions,
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
              {message.content.text}
            </div>
            {/* Show products in vertical list if structured content is available */}
            {message.structured &&
              message.structured.type === "product" &&
              message.structured.data.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Recommended Products
                  </h3>
                  <div className="space-y-4">
                    {message.structured.data.map((product: Product, index: number) => (
                      <ProductCard key={product.sku || index} {...product} />
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {message.type === "buttons" && (
          <div className="px-4 py-3">
            <ButtonGroup
              options={message.content.options}
              onButtonClick={onButtonClick || (() => {})}
            />
          </div>
        )}

        {/* Product messages are now handled as structured content in text messages */}

        {message.type === "list" && (
          <div className="px-4 py-3">
            <ul className="list-disc list-inside space-y-2 text-base leading-relaxed text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
              {message.content.items.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dynamic Suggested Questions */}
        {message.suggestedQuestions &&
          message.suggestedQuestions.length > 0 &&
          onQuestionClick && (
            <SuggestedQuestions
              onQuestionClick={(question) => {
                onQuestionClick(question);
                // Remove suggestions after clicking
                if (onRemoveSuggestions) {
                  onRemoveSuggestions(message.id);
                }
              }}
              questions={message.suggestedQuestions}
              variant="dynamic"
            />
          )}
      </div>
    </div>
  );
};
