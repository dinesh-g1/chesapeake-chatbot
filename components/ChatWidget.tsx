"use client";

import { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ChatInterface from "./ChatInterface";

interface ChatWidgetProps {
  initialMessages?: any[];
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  apiEndpoint?: string;
  streamingEnabled?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  initialMessages,
  conversationId,
  userId,
  sessionId,
  apiEndpoint,
  streamingEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
        setIsExpanded(false);
      }, 300);
    } else {
      setIsOpen(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Demo questions for the demo section
  const demoQuestions = [
    "How do I apply for a building permit?",
    "What are the trash pickup schedules?",
    "How do I report a pothole?",
    "Where can I pay my water bill online?",
    "What city events are happening this month?",
    "How do I contact the police department?",
  ];

  // Calculate widget dimensions based on state
  const getWidgetDimensions = () => {
    if (isMobile) {
      return {
        width: "calc(100vw - 1rem)",
        height: isExpanded ? "90vh" : "85vh",
        maxWidth: "calc(100vw - 1rem)",
        maxHeight: "90vh",
      };
    }

    if (isExpanded) {
      return {
        width: "700px",
        height: "700px",
        maxWidth: "700px",
        maxHeight: "700px",
      };
    }

    return {
      width: "500px",
      height: "600px",
      maxWidth: "500px",
      maxHeight: "600px",
    };
  };

  const widgetDimensions = getWidgetDimensions();

  return (
    <>
      {/* Floating Chat Button - Always bottom right */}
      <div
        className="fixed z-[9999]"
        style={{
          bottom: "4rem",
          right: "1.5rem",
          left: "auto",
          top: "auto",
        }}
      >
        <button
          onClick={handleToggle}
          className={`
            flex items-center justify-center rounded-full shadow-2xl
            transition-all duration-300 ease-in-out hover:scale-105
            ${
              isOpen
                ? "bg-[#a21f4b] hover:bg-[#8c1a3f] text-white w-12 h-12 md:w-14 md:h-14 shadow-[0_4px_20px_rgba(162,34,76,0.4)]"
                : "bg-[#a21f4b] hover:bg-[#8c1a3f] text-white w-14 h-14 md:w-16 md:h-16 shadow-[0_4px_20px_rgba(162,34,76,0.4)]"
            }
          `}
          aria-label={isOpen ? "Close chat" : "Open chat"}
          style={{
            width: isOpen ? "3rem" : "3.5rem",
            height: isOpen ? "3rem" : "3.5rem",
          }}
        >
          {isOpen ? (
            <X className="w-5 h-5 md:w-6 md:h-6" />
          ) : (
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
          )}
        </button>
      </div>

      {/* Overlay when chat is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9997] bg-black bg-opacity-30 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleToggle}
          aria-hidden="true"
        />
      )}

      {/* Chat Widget Container - Bottom right positioning */}
      {isOpen && (
        <div
          className="fixed z-[9998]"
          style={{
            bottom: isMobile ? "9rem" : "9rem",
            right: isMobile ? "1rem" : "2rem",
            left: "auto",
            top: "auto",
            width: widgetDimensions.width,
            height: widgetDimensions.height,
            maxWidth: `min(${widgetDimensions.maxWidth}, calc(100vw - ${isMobile ? "1rem" : "2rem"}))`,
            maxHeight: `min(${widgetDimensions.maxHeight}, calc(100vh - ${isMobile ? "15rem" : "15rem"}))`,
          }}
        >
          <div
            className={`
            bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden
            transition-all duration-300 ease-in-out flex flex-col h-full w-full
            ${isAnimating ? "animate-slide-up" : ""}
          `}
            style={{
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.15), 0 5px 20px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Widget Header */}
            <div className="bg-gradient-to-r from-[#0c5898] to-[#127a8e] text-white px-4 py-3 border-b border-[#083a6b] flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base">
                    Chesapeake City AI Chatbot
                  </h3>
                  <p className="text-xs text-gray-200">
                    Live Demo • DeepSeek AI
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpand}
                    className="text-white hover:text-gray-200 transition-colors p-1"
                    aria-label={isExpanded ? "Minimize" : "Expand"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleToggle}
                    className="text-white hover:text-gray-200 transition-colors p-1"
                    aria-label="Close chat"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Interface Container */}
            <div className="flex-grow overflow-hidden">
              <ChatInterface
                initialMessages={initialMessages}
                conversationId={conversationId}
                userId={userId}
                sessionId={sessionId}
                apiEndpoint={apiEndpoint}
                streamingEnabled={streamingEnabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .chat-widget-container {
            bottom: 5.5rem !important;
            right: 1rem !important;
            left: auto !important;
            max-width: calc(100vw - 2rem) !important;
          }

          .chat-overlay {
            background-color: rgba(0, 0, 0, 0.4);
          }
        }

        /* Handle very small screens */
        @media (max-width: 400px) {
          .chat-widget-container {
            bottom: 4.5rem !important;
            right: 0.5rem !important;
            max-width: calc(100vw - 1rem) !important;
            max-height: calc(100vh - 5rem) !important;
          }
        }

        @media (max-height: 600px) {
          .chat-widget-container {
            max-height: 70vh !important;
          }
        }

        /* Prevent text selection on demo questions for better UX */
        .demo-question {
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Better touch targets */
        @media (hover: none) and (pointer: coarse) {
          button,
          .demo-question {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Prevent body scroll when chat is open on mobile */
        @media (max-width: 768px) {
          body.chat-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default ChatWidget;
