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
  isLoadingProductInfo?: boolean;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  minWidth?: number;
  isResizing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  messageId,
  messages,
  zIndex = 50,
  isLoadingProductInfo = false,
  width = 550,
  onResizeStart,
  minWidth = 550,
  isResizing = false,
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
        return "Recommended Products";
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
  const hasContent = structuredContent && structuredContent.data.length > 0;
  const shouldShow = isOpen && hasContent;

  return (
    <aside
      className={`sidebar-container flex-shrink-0 bg-white dark:bg-neutral-900 flex flex-col h-full overflow-hidden relative ${shouldShow ? "border-l border-gray-200 dark:border-neutral-800" : ""
        }`}
      style={{
        zIndex,
        width: shouldShow ? `${width}px` : "0",
        transition: isResizing ? "none" : "width 0.3s ease-in-out"
      }}
    >
      {/* Resize Handle */}
      {shouldShow && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:w-1.5 hover:bg-blue-500 dark:hover:bg-blue-400 transition-all duration-200 z-10 group"
          style={{ marginLeft: '-4px', paddingLeft: '4px', paddingRight: '4px' }}
          aria-label="Resize sidebar"
          title="Drag to resize"
        >
          <div className="w-full h-full bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 rounded transition-colors duration-200" />
        </div>
      )}
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            className="flex flex-col h-full"
            style={{ width: `${width}px` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Fixed Header */}
            <div className="bg-white dark:bg-neutral-900 px-6 py-4 flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                aria-label="Collapse sidebar"
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            </div>

            {/* Scrollable Content Area */}
            <div className="sidebar-content sidebar-scroll px-4 py-3 space-y-4 scroll-smooth">
              {isLoadingProductInfo ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                  </div>
                </div>
              ) : (
                <SidebarContentRenderer
                  type={structuredContent.type}
                  data={structuredContent.data}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
