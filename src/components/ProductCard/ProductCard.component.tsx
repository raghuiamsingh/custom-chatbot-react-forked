import React from "react";
import type { Product } from "@types";

interface ProductCardProps extends Partial<Product> {
  // Allow alternative field names that might come from API
  title?: string;
  url?: string;
  image?: string;
  productId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  sku,
  name,
  title,
  description,
  price,
  ingredients,
  benefits,
  dosage,
  warnings,
  productUrl,
  url,
  imageUrl,
  image,
  category,
  brand,
  servings,
  form,
}) => {
  // Support both 'name' and 'title' fields
  const displayTitle = name || title || (sku ? `Product: ${sku}` : 'Product');
  // Support both 'imageUrl' and 'image' fields
  const productImage = imageUrl || image;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    if (!sku) return;

    // Dispatch custom event with SKU for external application handling
    const event = new CustomEvent('customChatbotProductSelected', {
      detail: { sku },
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }

  const cardContent = (
    <div className="group relative flex flex-row items-stretch gap-5 p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700/50 hover:shadow-md dark:hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 ease-out overflow-hidden">
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 dark:from-blue-900/0 dark:to-purple-900/0 group-hover:from-blue-50/10 group-hover:to-purple-50/5 dark:group-hover:from-blue-900/5 dark:group-hover:to-purple-900/5 transition-all duration-200 pointer-events-none" />

      {/* Product Image - Left Side */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl overflow-hidden ring-1 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-gray-300/50 dark:group-hover:ring-gray-600/50 transition-all duration-200">
        {productImage ? (
          <img
            src={productImage}
            alt={displayTitle}
            className="w-full h-full object-contain p-2 group-hover:scale-[1.02] transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info - Right Side */}
      <div className="flex-1 flex flex-col justify-between min-w-0 relative z-10">
        <div className="flex-1">
          {/* Category Badge */}
          {category && (
            <div className="inline-flex items-center mb-2">
              <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/50">
                {category}
              </span>
            </div>
          )}

          {/* Product Title */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1.5 leading-tight transition-colors duration-200 ease-in-out group-hover:text-gray-800 dark:group-hover:text-gray-200 line-clamp-2">
            {displayTitle}
          </h3>

          {/* Brand */}
          {brand && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight transition-colors duration-300 ease-in-out">
                by {brand}
              </p>
            </div>
          )}

          {/* Product Description */}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300 ease-in-out mb-3 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Bottom Section - Price and Additional Info */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          {/* Price */}
          {price && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900 dark:text-gray-50 transition-colors duration-300">
                {price}
              </span>
            </div>
          )}

          {/* Additional Info Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {form && (
              <span className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                {form}
              </span>
            )}
            {servings && (
              <span className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                {servings} servings
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Arrow Indicator */}
      {sku && (
        <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
          <svg
            className="w-5 h-5 text-blue-500 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer rounded-2xl"
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
};
