import React from 'react';

interface CardProps {
  title: string;
  description: string;
  image?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, image, onClick }) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-md border dark:border-gray-700 transition-all duration-300 ease-in-out ${
        onClick ? 'cursor-pointer hover:shadow-md dark:hover:shadow-lg hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      {image ? (
        <img
          src={image}
          alt={title}
          className="w-full h-40 object-cover rounded-t-xl"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-t-xl flex items-center justify-center transition-colors duration-300 ease-in-out">
          <svg
            className="w-10 h-10 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 leading-tight transition-colors duration-300 ease-in-out">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed transition-colors duration-300 ease-in-out">{description}</p>
      </div>
    </div>
  );
};

export default Card;
