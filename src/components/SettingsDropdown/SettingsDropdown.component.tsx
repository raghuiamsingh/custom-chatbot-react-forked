import React, { useState, useRef, useEffect } from "react";

interface SettingsDropdownProps {
  debugMode: boolean;
  onDebugModeChange: (enabled: boolean) => void;
  showContentTester: boolean;
  onContentTesterToggle: (show: boolean) => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  debugMode,
  onDebugModeChange,
  showContentTester,
  onContentTesterToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="Settings"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 transition-colors duration-300 ease-in-out">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
              Settings
            </h3>
          </div>

          {/* Debug Mode Toggle */}
          <div className="px-4 py-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => onDebugModeChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors duration-300 ease-in-out"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300 ease-in-out">
                  Debug Mode
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 ease-in-out">
                  Show raw BotDojo responses in console
                </p>
              </div>
            </label>
          </div>

          {/* Content Tester Toggle */}
          <div className="px-4 py-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showContentTester}
                onChange={(e) => onContentTesterToggle(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors duration-300 ease-in-out"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300 ease-in-out">
                  Content Tester
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 ease-in-out">
                  Show structured content type testing panel
                </p>
              </div>
            </label>
          </div>

        </div>
      )}
    </div>
  );
};
