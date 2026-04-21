"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: Array<{
    source: string;
    url: string;
    title?: string;
  }>;
  suggestedFollowUps?: string[];
  metadata?: {
    responseTime?: number;
    model?: string;
    tokensUsed?: number;
  };
}

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  apiEndpoint?: string;
  streamingEnabled?: boolean;
  isExpanded?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialMessages = [],
  conversationId,
  userId,
  sessionId,
  apiEndpoint = "/api/chat",
  streamingEnabled = true,
  isExpanded = false,
}) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] =
    useState(conversationId);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedFromStorageRef = useRef(false);
  const localStorageVersion = "v1.0"; // Version to clear old test data

  // Check and clear old localStorage data on mount
  useEffect(() => {
    const storedVersion = localStorage.getItem("chesapeake_chat_version");
    if (storedVersion !== localStorageVersion) {
      // Clear all old chat data when version changes
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("chesapeake_chat_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("chesapeake_chat_version", localStorageVersion);
    }
  }, []);

  // Initialize session ID if not provided
  useEffect(() => {
    if (!currentSessionId) {
      const storedSessionId = localStorage.getItem(
        "chesapeake_chat_session_id",
      );
      if (storedSessionId) {
        setCurrentSessionId(storedSessionId);
      } else {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(newSessionId);
        localStorage.setItem("chesapeake_chat_session_id", newSessionId);
      }
    }
  }, [currentSessionId]);

  // Load conversation history from localStorage
  useEffect(() => {
    if (currentSessionId && !hasLoadedFromStorageRef.current) {
      try {
        const savedMessages = localStorage.getItem(
          `chesapeake_chat_messages_${currentSessionId}`,
        );
        if (
          savedMessages &&
          (!initialMessages || initialMessages.length === 0)
        ) {
          const parsed = JSON.parse(savedMessages);
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(messagesWithDates);
          hasLoadedFromStorageRef.current = true;
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, [currentSessionId, initialMessages.length]); // Only depend on initialMessages.length, not the array reference

  // Reset loaded flag when session changes
  useEffect(() => {
    hasLoadedFromStorageRef.current = false;
  }, [currentSessionId]);

  // Save messages to localStorage
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      try {
        localStorage.setItem(
          `chesapeake_chat_messages_${currentSessionId}`,
          JSON.stringify(messages),
        );
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages, currentSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  // Focus input when component mounts or when chat opens
  useEffect(() => {
    if (inputRef.current && messages.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages.length]);

  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setIsTyping(true);
    setStreamingContent("");

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    if (streamingEnabled) {
      await handleStreamingResponse(userMessage.content);
    } else {
      await handleNonStreamingResponse(userMessage.content);
    }

    setIsLoading(false);
    setIsTyping(false);
    abortControllerRef.current = null;
  };

  const handleStreamingResponse = async (userMessage: string) => {
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": currentSessionId || "",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
          sessionId: currentSessionId,
          options: {
            temperature: 0.7,
            includeSources: true,
            maxTokens: 1000,
            contextWindow: 4096,
          },
          stream: true,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body reader available");
      }

      let assistantMessage: ChatMessage | null = null;
      let accumulatedContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() === "") continue;

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "content") {
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);

                  if (!assistantMessage) {
                    assistantMessage = {
                      id: generateMessageId(),
                      role: "assistant",
                      content: accumulatedContent,
                      timestamp: new Date(),
                    };
                  }
                }
              } catch (e) {
                console.error("Error parsing stream data:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (assistantMessage) {
        const finalMessage = {
          ...assistantMessage,
          content: accumulatedContent,
        };
        setMessages((prev) => [...prev, finalMessage]);
        setStreamingContent("");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Streaming error:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      }
    }
  };

  const handleNonStreamingResponse = async (userMessage: string) => {
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": currentSessionId || "",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
          sessionId: currentSessionId,
          options: {
            temperature: 0.7,
            includeSources: true,
            maxTokens: 1000,
            contextWindow: 4096,
          },
          stream: false,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        content: data.content || "",
        timestamp: new Date(),
        sources: data.sources,
        suggestedFollowUps: data.suggestedFollowUps,
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Non-streaming error:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      }
    }
  };

  const handleFollowUpClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleClearConversation = () => {
    if (showClearConfirm) {
      setMessages([]);
      setShowClearConfirm(false);
      hasLoadedFromStorageRef.current = true; // Mark as loaded to prevent re-loading
      if (currentSessionId) {
        localStorage.removeItem(`chesapeake_chat_messages_${currentSessionId}`);
      }
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours || 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  const renderMessageContent = (content: string) => {
    const formatted = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>',
      )
      .replace(/\n/g, "<br />");

    return { __html: formatted };
  };

  const quickQuestions = [
    "How do I apply for a building permit?",
    "What are the trash pickup schedules?",
    "How do I report a pothole?",
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg
                    className="w-8 h-8 text-[#0c5898]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Welcome to Chesapeake Assistant
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto mb-6">
                  I can help you with city services, permits, utilities, events,
                  and more.
                </p>

                <div className="space-y-3 max-w-sm mx-auto">
                  <h4 className="text-sm font-medium text-gray-700">
                    Try asking:
                  </h4>
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleFollowUpClick(question)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-sm text-gray-700 hover:text-gray-900"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-[#a21f4b] text-white rounded-br-none"
                        : "bg-gray-50 text-gray-800 rounded-bl-none border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium opacity-80">
                        {message.role === "user" ? "You" : "Assistant"}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>

                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={renderMessageContent(
                        message.content,
                      )}
                    />

                    {message.role === "assistant" &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium mb-2 text-gray-600">
                            Sources:
                          </p>
                          <div className="space-y-1">
                            {message.sources
                              .slice(0, 2)
                              .map((source, index) => (
                                <a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:underline truncate"
                                >
                                  {source.title || source.source}
                                </a>
                              ))}
                          </div>
                        </div>
                      )}

                    {message.role === "assistant" &&
                      message.suggestedFollowUps &&
                      message.suggestedFollowUps.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium mb-2 text-gray-600">
                            Related questions:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestedFollowUps
                              .slice(0, 3)
                              .map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() =>
                                    handleFollowUpClick(suggestion)
                                  }
                                  className="text-xs bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1 rounded-full transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {isTyping && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-none bg-gray-50 border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Assistant
                      </span>
                      <span className="text-xs text-gray-400">typing...</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Error</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Input Area - Always visible at bottom */}
        <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about city services, permits, schedules, events..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={2}
                  disabled={isLoading}
                  style={{ minHeight: "56px" }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {isLoading
                    ? "Processing..."
                    : "Enter to send, Shift+Enter for new line"}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    !input.trim() || isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#0c5898] to-[#127a8e] hover:from-[#083a6b] hover:to-[#0c5898] text-white shadow-md"
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span
                        className="w-2 h-2 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-white rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></span>
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>

                {isLoading && (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="px-4 py-2.5 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
