import React from "react";

interface MessageBubbleProps {
  role: "user" | "bot";
  text: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-4 py-2 rounded-2xl shadow-soft-sm dark:shadow-dark-sm transition-shadow duration-200 ease-in-out ${
          isUser
            ? "bg-[#E8F1FE] dark:bg-[#0A326A] text-gray-900 dark:text-gray-100"
            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        }`}
      >
        <p className="text-base whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
};
