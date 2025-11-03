import React, { useEffect } from "react";
import { ChatWindow } from "../../components/ChatWindow";
import { InputBar } from "../../components/InputBar";
import { SettingsDropdown } from "../../components/SettingsDropdown";
import { Sidebar } from "../../components/Sidebar";
import { StructuredContentTester } from "../../components/StructuredContentTester";
import { SuggestedQuestionsAction } from "../../components/SuggestedQuestionsAction";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useChat } from "../../contexts/ChatContext";
import Logo from "../../assets/logo.png";

interface ChatbotContentProps {
  isThemeRequired?: boolean;
  baseFontSize?: number;
  sidebarZIndex?: number;
}

export const ChatbotContent: React.FC<ChatbotContentProps> = ({ 
  isThemeRequired = false,
  baseFontSize = 16,
  sidebarZIndex = 50
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
            <SettingsDropdown
              debugMode={state.debugMode}
              onDebugModeChange={(debugMode) =>
                dispatch({ type: "SET_DEBUG_MODE", payload: debugMode })
              }
              onNewChat={handleNewChat}
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
