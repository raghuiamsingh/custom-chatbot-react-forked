import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarContentRenderer } from "@components";
import { type Message } from "@types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string | null;
  messages: Message[];
  zIndex?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  messageId,
  messages,
  zIndex = 50,
}) => {
  // Find the message with the given ID and extract structured content
  const message = messageId
    ? messages.find((msg) => msg.id === messageId)
    : null;
  const structuredContent = message?.structured;

  // Generate title based on structured content type
  const getTitle = () => {
    if (!structuredContent) return "Details";

    switch (structuredContent.type) {
      case "product":
        return "Recommended Supplements";
      case "guide":
        return "Guide";
      case "faq":
        return "Frequently Asked Questions";
      case "labResult":
        return "Lab Results";
      case "image":
        return "Images";
      case "linkList":
        return "Resources";
      default:
        return "Details";
    }
  };

  const title = getTitle();
  return (
    <AnimatePresence>
      {isOpen && structuredContent && structuredContent.data.length > 0 && (
        <>
          {/* Mobile Overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 md:hidden"
            style={{ zIndex: zIndex - 10 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            className="sidebar-container fixed top-0 right-0 w-full md:w-[400px] bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800 shadow-xl md:shadow-2xl"
            style={{ zIndex }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                aria-label="Close sidebar"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="sidebar-content sidebar-scroll px-4 py-3 space-y-4 scroll-smooth">
              <SidebarContentRenderer
                type={structuredContent.type}
                data={structuredContent.data}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
