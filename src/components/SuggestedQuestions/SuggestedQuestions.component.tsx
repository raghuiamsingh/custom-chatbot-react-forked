import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
  questions?: string[];
  variant?: "onboarding" | "dynamic";
  disabled?: boolean;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  onQuestionClick,
  questions = [
    "What supplements can help with sleep?",
    "What can I take for stress?",
    "How do I support my immune system?",
    "What vitamins should I take daily?",
    "Are there supplements for energy and focus?",
  ],
  variant = "onboarding",
  disabled = false,
}) => {
  // Animation variants for onboarding
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  // Animation variants for dynamic pills
  const pillContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn",
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const pillVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.25,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  // Dynamic variant: box-style buttons under bot messages (consistent with starter questions)
  if (variant === "dynamic") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          className="px-4 py-3 mt-3"
          variants={pillContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Related Questions Header */}
          <motion.div
            className={`text-sm font-medium mb-3 transition-colors duration-200 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}
            variants={pillVariants}
          >
            Related Questions
          </motion.div>

          <motion.div className="grid gap-3" variants={pillContainerVariants}>
            {questions.map((question, index) => (
              <motion.button
                key={`${question}-${index}`}
                onClick={() => !disabled && onQuestionClick(question)}
                disabled={disabled}
                className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ease-in-out group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
                variants={pillVariants}
                whileHover={disabled ? {} : { scale: 1.01 }}
                whileTap={disabled ? {} : { scale: 0.99 }}
                aria-label={`Ask: ${question}`}
              >
                <span className={`transition-colors duration-200 ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'}`}>
                  {question}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Onboarding variant: full-width buttons in a section
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ease-in-out"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="max-w-4xl mx-auto">
          <motion.h3
            className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4 transition-colors duration-300 ease-in-out"
            variants={buttonVariants}
          >
            Suggested Questions
          </motion.h3>
          <motion.div
            className="flex flex-col gap-y-2 max-w-lg mx-auto"
            variants={containerVariants}
          >
            {questions.map((question, index) => (
              <motion.button
                key={index}
                onClick={() => !disabled && onQuestionClick(question)}
                disabled={disabled}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium text-sm sm:text-base rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-300 ease-in-out text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
                variants={buttonVariants}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
                aria-label={`Ask: ${question}`}
              >
                {question}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
