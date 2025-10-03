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
            className="bg-gray-200 rounded-md px-3 py-1 hover:bg-gray-300 transition-colors text-sm"
          >
            {option}
          </button>
        ))}
    </div>
  );
};

export default ButtonGroup;
