import React from 'react';

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
  questions?: string[];
  variant?: 'initial' | 'dynamic';
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ 
  onQuestionClick, 
  questions = [
    "What supplements can help with sleep?",
    "What can I take for stress?",
    "How do I support my immune system?",
    "What vitamins should I take daily?",
    "Are there supplements for energy and focus?"
  ],
  variant = 'initial'
}) => {
  const isInitial = variant === 'initial';
  
  return (
    <div className={`px-6 py-4 transition-colors duration-300 ease-in-out ${
      isInitial 
        ? 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900' 
        : 'px-4 py-3'
    }`}>
      <div className={`max-w-4xl mx-auto ${isInitial ? '' : 'max-w-2xl'}`}>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4 transition-colors duration-300 ease-in-out">
          Suggested Questions
        </h3>
        <div className={`flex gap-2 ${
          isInitial 
            ? 'flex-col gap-y-2 max-w-lg mx-auto' 
            : 'flex-wrap'
        }`}>
          {questions.map((question, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(question)}
              className={`px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium text-sm sm:text-base rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-300 ease-in-out text-left ${
                isInitial ? 'w-full' : 'flex-shrink-0'
              }`}
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuggestedQuestions;
