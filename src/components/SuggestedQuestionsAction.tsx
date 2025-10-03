import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedQuestionsActionProps {
  onQuestionClick: (question: string) => void;
  onRefresh?: () => void;
  questions?: string[];
  isLoading?: boolean;
}

const SuggestedQuestionsAction: React.FC<SuggestedQuestionsActionProps> = ({
  onQuestionClick,
  onRefresh,
  questions = [],
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleQuestionClick = (question: string) => {
    onQuestionClick(question);
    setIsExpanded(false); // Collapse panel after selection
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Animation variants
  const panelVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
        staggerChildren: 0.05
      }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      scale: 0.95,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.15,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="relative">
      {/* Compact Action Chip */}
      <motion.button
        onClick={toggleExpanded}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>Suggested Questions</span>
        <motion.svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Suggested Questions
              </h3>
              {onRefresh && (
                <motion.button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ rotate: isLoading ? 360 : 0 }}
                  transition={{ duration: isLoading ? 1 : 0.2, repeat: isLoading ? Infinity : 0 }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.button>
              )}
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-1 gap-2">
              {questions.length > 0 ? (
                questions.map((question, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleQuestionClick(question)}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    variants={buttonVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {question}
                    </span>
                  </motion.button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No suggestions available
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuggestedQuestionsAction;
