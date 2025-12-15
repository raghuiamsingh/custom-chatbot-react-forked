import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChatWindow, InputBar, Sidebar, StructuredContentTester, SuggestedQuestionsAction, ThemeToggle, type ChatWindowRef } from "@components";
import { useChat } from "@contexts";

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
  const chatWindowRef = useRef<ChatWindowRef>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(550);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarMinWidth = 550; // Default width when sidebar opens
  const sidebarMaxWidth = 1200; // Maximum width for sidebar
  const conversationalPaneMinWidth = 470; // Minimum width for conversational pane

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

  // Reset sidebar width when it closes
  useEffect(() => {
    if (!state.sidebarState.isOpen && sidebarWidth !== 550) {
      setSidebarWidth(550);
    }
  }, [state.sidebarState.isOpen, sidebarWidth]);

  const handleScrollToBottom = () => {
    chatWindowRef.current?.scrollToBottom();
  };

  const handleScrollChange = (isNearBottom: boolean) => {
    setShowScrollButton(!isNearBottom && state.messages.length > 0);
  };

  // Update scroll button visibility when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      const isNearBottom = chatWindowRef.current.isNearBottom();
      setShowScrollButton(!isNearBottom && state.messages.length > 0);
    }
  }, [state.messages.length]);

  // Handle sidebar resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = document.querySelector('.chatbot-container') as HTMLElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      // Calculate available width for conversational pane
      const conversationalPaneWidth = containerRect.width - newWidth;
      
      // Enforce minimum width for conversational pane
      if (conversationalPaneWidth < conversationalPaneMinWidth) {
        const maxAllowedSidebarWidth = containerRect.width - conversationalPaneMinWidth;
        setSidebarWidth(Math.min(maxAllowedSidebarWidth, sidebarMaxWidth));
        return;
      }
      
      // Enforce minimum and maximum width for sidebar
      if (newWidth < sidebarMinWidth) {
        setSidebarWidth(sidebarMinWidth);
      } else if (newWidth > sidebarMaxWidth) {
        setSidebarWidth(sidebarMaxWidth);
      } else {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarMinWidth, sidebarMaxWidth, conversationalPaneMinWidth]);

  return (
    <div
      className="chatbot-container flex flex-col h-screen bg-[#FDFDFC] dark:bg-[#0D1117] font-sans transition-colors duration-300 ease-in-out"
      style={{
        '--chatbot-font-base': `${baseFontSize}px`,
        ...(maxHeight && { maxHeight: `${maxHeight}px` })
      } as React.CSSProperties}
    >
      {/* Main Content and Sidebar Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversational Pane - centered in remaining space */}
        <div className="flex-1 flex justify-center overflow-hidden" style={{ minWidth: `${conversationalPaneMinWidth}px` }}>
          {/* Main Content and Input Field Container - max-width 80rem */}
          <div className="flex flex-col max-w-[80rem] w-full h-full overflow-y-auto flex-shrink">
            {/* Header - part of conversational pane */}
            <div className="px-6 py-4 transition-colors duration-300 ease-in-out">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const event = new CustomEvent('closeChatbot');
                      window.dispatchEvent(event);
                    }}
                    className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
                    aria-label="Close Chatbot"
                  >
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 770 760" 
                    className="text-gray-800 dark:text-gray-100"
                    style={{ width: '3rem', height: 'auto', color: '#033F46' }}
                    aria-label="JAINE Logo"
                  >
                    <g transform="translate(0.000000,736) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                      <path d="M5003 7209 c-45 -13 -64 -56 -74 -164 -10 -100 -63 -353 -114 -540 -57 -206 -157 -413 -271 -556 -255 -322 -565 -528 -994 -660 -141 -43 -147 -47 -164 -88 -29 -73 25 -171 102 -186 26 -5 79 -20 167 -46 22 -7 70 -27 106 -45 37 -19 73 -34 80 -34 48 -2 337 -170 438 -254 301 -252 466 -531 580 -981 40 -154 71 -326 71 -387 0 -58 35 -154 60 -168 10 -6 39 -10 64 -10 36 0 52 6 76 28 37 32 49 78 79 297 28 201 60 326 121 481 120 301 224 461 420 650 129 125 188 171 305 241 149 88 264 139 469 208 104 35 136 50 165 79 30 31 36 43 36 80 0 71 -24 88 -205 145 -221 68 -447 185 -649 335 -233 174 -390 386 -518 700 -87 211 -128 379 -158 644 -14 127 -40 203 -74 221 -28 16 -85 20 -118 10z" />
                      <path d="M2256 6237 c-8 -12 -33 -75 -56 -140 -49 -143 -101 -225 -204 -325 -57 -56 -95 -82 -160 -113 -47 -22 -92 -47 -101 -55 -15 -15 -14 -18 2 -36 10 -11 31 -27 48 -35 242 -122 378 -271 415 -458 18 -91 52 -145 89 -145 22 0 41 37 77 150 70 222 163 324 401 443 39 20 74 41 78 47 10 16 -35 53 -124 100 -200 107 -312 244 -371 455 -24 86 -37 116 -54 127 -18 12 -25 9 -40 -15z" />
                      <path d="M2340 4409 c-127 -13 -370 -65 -480 -104 -239 -83 -509 -239 -694 -401 -286 -251 -516 -605 -616 -950 -43 -146 -56 -219 -75 -423 -15 -159 -15 -186 0 -335 35 -357 119 -615 298 -915 31 -52 60 -110 63 -129 8 -39 -24 -207 -58 -311 -28 -86 -88 -198 -158 -296 -69 -96 -76 -115 -55 -154 24 -48 45 -54 159 -47 251 16 425 46 750 127 l198 50 148 -51 c432 -148 798 -177 1180 -93 391 85 703 250 973 512 183 177 314 357 421 576 82 166 126 300 166 500 56 277 56 530 0 811 -60 302 -163 539 -347 796 -71 100 -260 298 -362 380 -187 151 -418 278 -646 357 -202 69 -546 120 -625 92 -22 -7 -45 -8 -69 -2 -64 16 -95 18 -171 10z m-507 -1665 c96 -34 173 -118 204 -223 40 -137 -36 -289 -180 -361 -135 -67 -299 -23 -386 103 -130 190 -31 442 196 496 43 10 111 4 166 -15z m1600 6 c83 -26 155 -88 194 -168 23 -47 28 -70 27 -127 0 -38 -6 -89 -12 -112 -34 -115 -173 -213 -301 -213 -81 0 -156 32 -219 93 -63 61 -84 108 -90 198 -10 170 69 283 233 335 57 18 94 17 168 -6z" />
                      <path d="M6296 2627 c-16 -16 -28 -49 -41 -112 -10 -50 -29 -119 -42 -154 -31 -85 -120 -217 -188 -279 -68 -63 -180 -138 -232 -156 -79 -28 -120 -54 -133 -86 -12 -28 -11 -34 6 -50 10 -10 60 -35 109 -55 129 -53 200 -99 285 -185 97 -97 158 -213 191 -359 13 -58 30 -109 41 -121 18 -20 72 -28 82 -12 2 4 21 64 41 132 56 191 92 259 194 360 94 94 157 139 277 199 44 21 87 48 96 58 16 18 16 21 2 42 -9 12 -68 48 -133 79 -106 52 -124 65 -216 157 -142 142 -175 204 -236 444 -21 78 -45 121 -69 121 -6 0 -21 -10 -34 -23z" />
                    </g>
                  </svg>
                  <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
                    Product Discovery by JAINE
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {isThemeRequired && <ThemeToggle />}
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
                </div>
              </div>
            </div>

            {/* Structured Content Tester - show when enabled in settings */}
            {state.showContentTester && (
              <div className="px-6 py-4">
                <StructuredContentTester
                  onTestContent={handleTestStructuredContent}
                />
              </div>
            )}

            <ChatWindow
              ref={chatWindowRef}
              messages={state.messages}
              onButtonClick={handleButtonClick}
              onQuestionClick={sendMessage}
              onViewRecommendations={handleViewRecommendations}
              onRemoveSuggestions={handleRemoveSuggestions}
              isLoading={state.isLoading}
              onScrollChange={handleScrollChange}
            />

            {/* Suggested Questions Action and Input Bar Container */}
            <div className="sticky bottom-0 bg-[#FDFDFC] dark:bg-[#0D1117] transition-colors duration-300 ease-in-out relative">
              {/* Suggested Questions Action - floating style */}
              {/* {state.messages.length > 0 && !state.isLoading && (
                <div className="px-6 py-3">
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
              )} */}

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-6 bg-transparent pointer-events-none">
                  <button
                    onClick={handleScrollToBottom}
                    className="p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all duration-200 ease-in-out focus:outline-none flex items-center justify-center pointer-events-auto scroll-to-bottom-btn"
                    aria-label="Scroll to bottom"
                  >
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <InputBar
                onSendMessage={sendMessage}
                disabled={state.isLoading}
                isLoading={state.isLoading}
                onCancel={cancelRequest}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - right-aligned, stuck on the right */}
        <Sidebar
            isOpen={state.sidebarState.isOpen}
            onClose={handleCloseSidebar}
            messageId={state.sidebarState.messageId}
            messages={state.messages}
            zIndex={sidebarZIndex}
            isLoadingProductInfo={state.sidebarState.isLoadingProductInfo}
            width={sidebarWidth}
            onResizeStart={handleMouseDown}
            minWidth={sidebarMinWidth}
            isResizing={isResizing}
          />
      </div>
    </div>
  );
};
