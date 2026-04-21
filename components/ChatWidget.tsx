"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, ChevronRight } from "lucide-react";
import ChatInterface from "./ChatInterface";

interface ChatWidgetProps {
  // Optional props that can be passed to the ChatInterface
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
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 300);
    } else {
      setIsOpen(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
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

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleToggle}
          className={`
            flex items-center justify-center rounded-full shadow-lg
            transition-all duration-300 ease-in-out
            ${
              isOpen
                ? "bg-[#a21f4b] hover:bg-[#8c1a3f] text-white w-12 h-12 shadow-[3px_3px_25px_0_rgba(162,34,76,0.81)]"
                : "bg-[#a21f4b] hover:bg-[#8c1a3f] text-white w-14 h-14 shadow-[3px_3px_25px_0_rgba(162,34,76,0.81)]"
            }
          `}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MessageSquare className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Chat Widget Container */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-40 w-[calc(100vw-48px)] max-w-[400px]">
          <div
            className={`
            bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden
            transition-all duration-300 ease-in-out
            ${isAnimating ? "animate-slide-up" : ""}
          `}
          >
            {/* Widget Header */}
            <div className="bg-[#0c5898] text-white p-4 border-b border-[#083a6b]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">
                    Chesapeake City AI Assistant
                  </h3>
                  <p className="text-sm text-gray-200">
                    Live Demo • Powered by DeepSeek AI
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Demo Section - Only shows initially */}
            <div className="p-5 border-b border-gray-200">
              <div className="mb-5">
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  Experience how our AI chatbot can assist with Chesapeake City
                  services
                </h4>
                <p className="text-gray-700 mb-4 text-sm">
                  Try asking about city services, permits, schedules, and more.
                </p>
              </div>

              <div className="mb-5">
                <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <ChevronRight className="w-4 h-4 mr-1 text-[#a21f4b]" />
                  Try Asking About:
                </h5>
                <div className="space-y-2">
                  {demoQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="text-sm text-[#454545] p-3 bg-[#fafafa] rounded border border-[#898a8e] hover:bg-[#f2f2f2] transition-colors cursor-pointer hover:border-[#a21f4b]"
                      onClick={() => {
                        // This would trigger sending the question
                        console.log("Question clicked:", question);
                      }}
                    >
                      {question}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <h5 className="font-semibold text-[#454545] mb-3 flex items-center">
                  <ChevronRight className="w-4 h-4 mr-1 text-[#a21f4b]" />
                  Key Features in Demo:
                </h5>
                <ul className="text-sm text-[#454545] space-y-1">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a21f4b] mt-1.5 mr-2 shrink-0"></div>
                    <span>Real-time responses with streaming</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a21f4b] mt-1.5 mr-2 shrink-0"></div>
                    <span>Context-aware conversation</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a21f4b] mt-1.5 mr-2 shrink-0"></div>
                    <span>Source citations from official website</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a21f4b] mt-1.5 mr-2 shrink-0"></div>
                    <span>Suggested follow-up questions</span>
                  </li>
                </ul>
              </div>

              <div className="text-center pt-4 border-t border-[#898a8e]">
                <p className="text-sm text-[#454545]">
                  <span className="font-semibold text-[#0c5898]">
                    Chesapeake City Agentic AI Chatbot
                  </span>
                  <br />
                  Live Demo • Powered by DeepSeek AI
                </p>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="h-[380px] border-t border-[#898a8e]">
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

      {/* Styles for animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ChatWidget;
