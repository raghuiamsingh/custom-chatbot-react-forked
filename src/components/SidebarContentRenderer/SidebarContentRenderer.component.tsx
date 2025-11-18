import React from "react";
import { ProductCard } from "@components";

interface SidebarContentRendererProps {
  type: "product" | "guide" | "faq" | "labResult" | "image" | "linkList";
  data: any[];
}

export const SidebarContentRenderer: React.FC<SidebarContentRendererProps> = ({
  type,
  data,
}) => {
  switch (type) {
    case "product":
      return (
        <div className="grid grid-cols-1 gap-4">
          {data.map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>
      );

    case "guide":
      return (
        <div className="space-y-4">
          {data.map((step, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Step {index + 1}
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {step.content || step.text || step}
              </div>
            </div>
          ))}
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          {data.map((faq, index) => (
            <details key={index} className="group">
              <summary className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {faq.question || faq.title || `Question ${index + 1}`}
                </span>
                <svg
                  className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="p-3 pt-0 text-sm text-gray-700 dark:text-gray-300">
                {faq.answer || faq.content || faq.text}
              </div>
            </details>
          ))}
        </div>
      );

    case "labResult":
      return (
        <div className="space-y-4">
          {data.map((result, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {result.title || result.name || `Result ${index + 1}`}
                </h4>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {Object.entries(result.values || result.data || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center py-1"
                      >
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {key}:
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {String(value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
                {result.note && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-200">
                    {result.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );

    case "image":
      return (
        <div className="grid grid-cols-1 gap-4">
          {data.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image.url || image.src || image}
                alt={image.alt || image.caption || `Image ${index + 1}`}
                className="w-full h-auto rounded-lg shadow-sm"
              />
              {(image.caption || image.title) && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
                  {image.caption || image.title}
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case "linkList":
      return (
        <div className="space-y-3">
          {data.map((link, index) => (
            <a
              key={index}
              href={link.url || link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="flex-shrink-0 mr-3">
                {link.icon ? (
                  <img src={link.icon} alt="" className="w-5 h-5" />
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {link.title || link.text || link.name}
                </div>
                {link.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {link.description}
                  </div>
                )}
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
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
            </a>
          ))}
        </div>
      );

    default:
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>Unsupported content type: {type}</p>
        </div>
      );
  }
};
