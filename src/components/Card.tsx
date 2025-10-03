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
      className={`bg-white rounded-xl shadow-md max-w-xs mb-4 ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''
      }`}
      onClick={onClick}
    >
      {image && (
        <img
          src={image}
          alt={title}
          className="w-full h-32 object-cover rounded-t-xl"
        />
      )}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 text-base">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default Card;
