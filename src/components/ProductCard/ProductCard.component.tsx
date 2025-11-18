import React from "react";
import type { Product } from "@types";

interface ProductCardProps extends Product { }

export const ProductCard: React.FC<ProductCardProps> = ({
  sku,
  name,
  description,
  price,
  ingredients,
  benefits,
  dosage,
  warnings,
  productUrl,
  imageUrl,
  category,
  brand,
  servings,
  form,
}) => {
  const displayTitle = name || `Product: ${sku}`;
  const productImage = imageUrl;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    // Dispatch custom event with SKU for external application handling
    const event = new CustomEvent('customChatbotProductSelected', {
      detail: { sku },
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }

  const cardContent = (
    <div className="flex flex-row items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg hover:shadow-xl dark:hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ease-in-out overflow-hidden">
      {/* Product Image - Left Side */}
      <div className="w-48 h-48 flex-shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {productImage ? (
          <img
            src={productImage}
            alt={displayTitle}
            className="w-full h-full object-contain"
          />
        ) : (
          <svg
            className="w-12 h-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      {/* Product Info - Right Side */}
      <div className="flex-1 flex flex-col justify-center">
        <div>
          {/* Product Title */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-tight transition-colors duration-300 ease-in-out">
            {displayTitle}
          </h3>

          {/* Brand */}
          {brand && (
            <p className="text-sm text-gray-600 dark:text-gray-400 my-2 leading-tight transition-colors duration-300 ease-in-out">
              by {brand}
            </p>
          )}

          {/* Product Description */}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300 ease-in-out mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Product Details */}
          {price && (
            <div className="text-base text-gray-500 dark:text-gray-400 leading-relaxed transition-colors duration-300 ease-in-out">
              <span className="font-bold text-black">{price}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Make entire card clickable if SKU exists
  if (sku) {
    return (
      <div
        onClick={handleCardClick}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(e);
          }
        }}
        aria-label={`View product: ${displayTitle}`}
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
};
