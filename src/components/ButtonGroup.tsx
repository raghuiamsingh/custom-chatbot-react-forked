import React from 'react';

interface ButtonGroupProps {
  options: string[];
  onButtonClick: (value: string) => void;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ options, onButtonClick }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onButtonClick(option)}
            className="border border-gray-300 text-gray-700 rounded-md px-3 py-2 text-sm hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            {option}
          </button>
        ))}
    </div>
  );
};

export default ButtonGroup;
