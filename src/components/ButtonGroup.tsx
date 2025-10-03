import React from 'react';

interface ButtonGroupProps {
  options: string[];
  onButtonClick: (value: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ options, onButtonClick }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onButtonClick(option)}
          className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-full px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 cursor-pointer"
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;
