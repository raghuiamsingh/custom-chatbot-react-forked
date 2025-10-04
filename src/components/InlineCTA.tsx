import React from 'react';
import { motion } from 'framer-motion';

interface InlineCTAProps {
  count: number;
  contentType: 'product' | 'guide' | 'faq' | 'labResult' | 'image' | 'linkList';
  messageId: string;
  onViewRecommendations: (messageId: string) => void;
}

const InlineCTA: React.FC<InlineCTAProps> = ({ count, contentType, messageId, onViewRecommendations }) => {
  const getTypeLabel = () => {
    switch (contentType) {
      case 'product':
        return 'supplements';
      case 'guide':
        return 'guide steps';
      case 'faq':
        return 'questions';
      case 'labResult':
        return 'lab results';
      case 'image':
        return 'images';
      case 'linkList':
        return 'resources';
      default:
        return 'items';
    }
  };

  const getActionLabel = () => {
    switch (contentType) {
      case 'product':
        return 'View Recommendations';
      case 'guide':
        return 'View Guide';
      case 'faq':
        return 'View FAQ';
      case 'labResult':
        return 'View Lab Results';
      case 'image':
        return 'View Images';
      case 'linkList':
        return 'View Resources';
      default:
        return 'View Details';
    }
  };

  const getIcon = () => {
    switch (contentType) {
      case 'product':
        return '💊';
      case 'guide':
        return '📖';
      case 'faq':
        return '❓';
      case 'labResult':
        return '🧪';
      case 'image':
        return '🖼️';
      case 'linkList':
        return '🔗';
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
          onClick={() => onViewRecommendations(messageId)}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {getActionLabel()}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default InlineCTA;
