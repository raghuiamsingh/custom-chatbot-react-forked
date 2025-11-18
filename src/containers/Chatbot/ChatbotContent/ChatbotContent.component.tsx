import React, { useEffect } from "react";
import { ChatWindow, InputBar, SettingsDropdown, Sidebar, StructuredContentTester, SuggestedQuestionsAction, ThemeToggle } from "@components";
import { useChat } from "@contexts";
import Logo from "@assets/logo.png";

interface ChatbotContentProps {
  isThemeRequired?: boolean;
  baseFontSize?: number;
  sidebarZIndex?: number;
  maxHeight?: number;
}

export const ChatbotContent: React.FC<ChatbotContentProps> = ({ 
  isThemeRequired = false,
  baseFontSize = 16,
  sidebarZIndex = 50,
  maxHeight
}) => {
  // Ensure light theme is default when theme toggle is not required
  useEffect(() => {
    if (!isThemeRequired) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isThemeRequired]);

  // Hooks
  const {
    state,
    initData,
    sendMessage,
    handleButtonClick,
    cancelRequest,
    handleNewChat,
    handleViewRecommendations,
    handleCloseSidebar,
    handleTestStructuredContent,
    handleRefreshSuggestions,
    handleRemoveSuggestions,
    getSuggestedQuestions,
    getSuggestionsContext,
    dispatch,
  } = useChat();

  return (
    <div 
      className="chatbot-container flex flex-col h-screen bg-[#FDFDFC] dark:bg-[#0D1117] font-sans transition-colors duration-300 ease-in-out"
      style={{
        '--chatbot-font-base': `${baseFontSize}px`,
        ...(maxHeight && { maxHeight: `${maxHeight}px` })
      } as React.CSSProperties}
    >
      {/* Header - floating style */}
      <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
        <div className="flex justify-between items-center mx-auto">
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt="GetHealthy Assistant Logo"
              className="w-8 h-8"
            />
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
              GetHealthy Assistant
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isThemeRequired && <ThemeToggle />}
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center gap-2"
              aria-label="New Chat"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="text-sm font-medium">New Chat</span>
            </button>
            <SettingsDropdown
              debugMode={state.debugMode}
              onDebugModeChange={(debugMode) =>
                dispatch({ type: "SET_DEBUG_MODE", payload: debugMode })
              }
              showContentTester={state.showContentTester}
              onContentTesterToggle={(show) =>
                dispatch({ type: "SET_SHOW_CONTENT_TESTER", payload: show })
              }
            />
          </div>
        </div>
      </div>

      {/* Structured Content Tester - show when enabled in settings */}
      {state.showContentTester && (
        <div className="max-w-4xl mx-auto px-6 py-4">
          <StructuredContentTester
            onTestContent={handleTestStructuredContent}
          />
        </div>
      )}

      <ChatWindow
        messages={state.messages}
        onButtonClick={handleButtonClick}
        onQuestionClick={sendMessage}
        onViewRecommendations={handleViewRecommendations}
        onRemoveSuggestions={handleRemoveSuggestions}
      />

      {/* Suggested Questions Action - floating style */}
      {state.messages.length > 0 && (
        <div className="px-6 py-3 transition-colors duration-300 ease-in-out">
          <div className="flex justify-center">
            <SuggestedQuestionsAction
              onQuestionClick={sendMessage}
              onRefresh={handleRefreshSuggestions}
              questions={getSuggestedQuestions()}
              isLoading={state.isLoadingSuggestions}
              context={getSuggestionsContext()}
              initData={initData}
            />
          </div>
        </div>
      )}

      <InputBar
        onSendMessage={sendMessage}
        disabled={state.isLoading}
        isLoading={state.isLoading}
        onCancel={cancelRequest}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={state.sidebarState.isOpen}
        onClose={handleCloseSidebar}
        messageId={state.sidebarState.messageId}
        messages={state.messages}
        zIndex={sidebarZIndex}
      />
    </div>
  );
};
