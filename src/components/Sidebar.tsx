import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarContentRenderer from './SidebarContentRenderer';
import { type Message } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string | null;
  messages: Message[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, messageId, messages }) => {
  // Find the message with the given ID and extract structured content
  const message = messageId ? messages.find(msg => msg.id === messageId) : null;
  const structuredContent = message?.structured;
  
  // Generate title based on structured content type
  const getTitle = () => {
    if (!structuredContent) return 'Details';
    
    switch (structuredContent.type) {
      case 'product':
        return 'Recommended Supplements';
      case 'guide':
        return 'Guide';
      case 'faq':
        return 'Frequently Asked Questions';
      case 'labResult':
        return 'Lab Results';
      case 'image':
        return 'Images';
      case 'linkList':
        return 'Resources';
      default:
        return 'Details';
    }
  };

  const title = getTitle();
  return (
    <AnimatePresence>
      {isOpen && structuredContent && structuredContent.data.length > 0 && (
        <>
          {/* Mobile Overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-gray-900 shadow-xl z-50 md:shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <SidebarContentRenderer 
                type={structuredContent.type} 
                data={structuredContent.data} 
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
