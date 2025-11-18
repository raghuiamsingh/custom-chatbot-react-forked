import React from "react";

interface StructuredContentTesterProps {
  onTestContent: (contentType: string) => void;
}

export const StructuredContentTester: React.FC<
  StructuredContentTesterProps
> = ({ onTestContent }) => {
  const contentTypes = [
    {
      type: "guide",
      label: "📘 Sleep Guide",
      description: "Step-by-step sleep hygiene guide",
    },
    {
      type: "faq",
      label: "❓ FAQ",
      description: "Frequently asked questions about supplements",
    },
    {
      type: "labResult",
      label: "🧪 Lab Results",
      description: "Sample lab results with ranges",
    },
    {
      type: "image",
      label: "🖼️ Images",
      description: "Sleep cycle diagrams and charts",
    },
    {
      type: "linkList",
      label: "🔗 Resources",
      description: "Helpful sleep health links",
    },
    {
      type: "product",
      label: "💊 Products",
      description: "Sleep supplement recommendations",
    },
  ];

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Test Different Structured Content Types
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Click any button below to test how different content types render in the
        sidebar:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {contentTypes.map(({ type, label, description }) => (
          <button
            key={type}
            onClick={() => onTestContent(type)}
            className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
