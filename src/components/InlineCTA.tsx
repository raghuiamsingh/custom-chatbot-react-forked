import React from 'react';
import { motion } from 'framer-motion';

interface InlineCTAProps {
  count: number;
  type: 'product' | 'supplement' | 'recommendation';
  onViewRecommendations: () => void;
}

const InlineCTA: React.FC<InlineCTAProps> = ({ count, type, onViewRecommendations }) => {
  const getTypeLabel = () => {
    switch (type) {
      case 'product':
        return 'products';
      case 'supplement':
        return 'supplements';
      case 'recommendation':
        return 'recommendations';
      default:
        return 'items';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'product':
      case 'supplement':
        return '💊';
      case 'recommendation':
        return '💡';
      default:
        return '💡';
    }
  };

  return (
    <motion.div
      className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getIcon()}</span>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            I found {count} {getTypeLabel()} — 
          </span>
        </div>
        <motion.button
          onClick={onViewRecommendations}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View Recommendations
        </motion.button>
      </div>
    </motion.div>
  );
};

export default InlineCTA;
