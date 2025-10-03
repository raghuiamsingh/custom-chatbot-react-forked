import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedQuestionsActionProps {
  onQuestionClick: (question: string) => void;
  onRefresh?: () => void;
  questions?: string[];
  isLoading?: boolean;
  context?: string;
}

const SuggestedQuestionsAction: React.FC<SuggestedQuestionsActionProps> = ({
  onQuestionClick,
  onRefresh,
  questions = [],
  isLoading = false,
  context
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestionSets, setSuggestionSets] = useState<string[][]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Load suggestion sets when component mounts or context changes
  useEffect(() => {
    if (isExpanded && suggestionSets.length === 0) {
      loadSuggestionSets();
    }
  }, [isExpanded, context]);

  const loadSuggestionSets = async () => {
    setIsLoadingSets(true);
    try {
      const response = await fetch('http://localhost:3001/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          context: context || 'general health and wellness',
          currentSetIndex: currentSetIndex
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load suggestions');
      }

      const data = await response.json();
      setSuggestionSets(data.suggestedQuestions || []);
      setCurrentSetIndex(data.currentSetIndex || 0);
    } catch (error) {
      console.error('Error loading suggestion sets:', error);
      // Fallback to default sets
      setSuggestionSets([
        [
          "What supplements can help with sleep?",
          "What can I take for stress?", 
          "How do I support my immune system?"
        ],
        [
          "What vitamins should I take daily?",
          "Are there supplements for energy and focus?",
          "What helps with digestion?"
        ],
        [
          "What are natural-only options?",
          "Which supplements support recovery?",
          "What helps with heart health?"
        ]
      ]);
    } finally {
      setIsLoadingSets(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleQuestionClick = (question: string) => {
    onQuestionClick(question);
    setIsExpanded(false); // Collapse panel after selection
  };

  const handleRefresh = () => {
    if (suggestionSets.length > 1) {
      // Cycle through existing sets
      setCurrentSetIndex((prev) => (prev + 1) % suggestionSets.length);
    } else {
      // Load new sets from server
      loadSuggestionSets();
    }
  };

  // Get current questions to display
  const currentQuestions = suggestionSets.length > 0 
    ? suggestionSets[currentSetIndex] || suggestionSets[0] 
    : questions;

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

  const questionSetVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.2,
        ease: "easeIn"
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
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Suggested Questions
                </h3>
                {suggestionSets.length > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentSetIndex + 1} of {suggestionSets.length}
                  </span>
                )}
              </div>
              <motion.button
                onClick={handleRefresh}
                disabled={isLoadingSets}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: isLoadingSets ? 360 : 0 }}
                transition={{ duration: isLoadingSets ? 1 : 0.2, repeat: isLoadingSets ? Infinity : 0 }}
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
            </div>

            {/* Questions Grid with Animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSetIndex}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={questionSetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {currentQuestions.length > 0 ? (
                  currentQuestions.map((question, index) => (
                    <motion.button
                      key={`${currentSetIndex}-${index}`}
                      onClick={() => handleQuestionClick(question)}
                      className="min-h-[120px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center p-4"
                      variants={buttonVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-200 text-center leading-relaxed">
                        {question}
                      </span>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full min-h-[120px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                    {isLoadingSets ? 'Loading suggestions...' : 'No suggestions available'}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuggestedQuestionsAction;
