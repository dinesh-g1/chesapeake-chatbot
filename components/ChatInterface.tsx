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
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  initialMessages = [],
  conversationId,
  userId,
  sessionId,
  apiEndpoint = "/api/chat",
  streamingEnabled = true,
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    if (currentSessionId) {
      try {
        const savedMessages = localStorage.getItem(
          `chesapeake_chat_messages_${currentSessionId}`,
        );
        if (savedMessages && !initialMessages.length) {
          const parsed = JSON.parse(savedMessages);
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(messagesWithDates);
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
  }, [currentSessionId, initialMessages]);

  // Save messages to localStorage
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      try {
        localStorage.setItem(
          `chesapeake_chat_messages_${currentSessionId}`,
          JSON.stringify(messages.slice(-50)), // Keep last 50 messages
        );
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
    }
  }, [messages, currentSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Generate a message ID
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);
    setIsTyping(true);
    setStreamingContent("");

    // Prepare request
    const requestBody = {
      message: userMessage.content,
      conversationId: currentConversationId,
      sessionId: currentSessionId,
      userId,
      options: {
        temperature: 0.7,
        includeSources: true,
        maxTokens: 1000,
        contextWindow: 10,
      },
      stream: streamingEnabled,
    };

    try {
      abortControllerRef.current = new AbortController();

      if (streamingEnabled) {
        await handleStreamingResponse(requestBody);
      } else {
        await handleNonStreamingResponse(requestBody);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Request aborted");
      } else {
        setError(err.message || "Failed to send message");
        console.error("Chat error:", err);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // Handle streaming response
  const handleStreamingResponse = async (requestBody: any) => {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": currentSessionId || "",
      },
      body: JSON.stringify(requestBody),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage: ChatMessage | null = null;
    let accumulatedContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case "metadata":
                  if (!assistantMessage) {
                    assistantMessage = {
                      id: generateMessageId(),
                      role: "assistant",
                      content: "",
                      timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    if (parsed.conversationId) {
                      setCurrentConversationId(parsed.conversationId);
                    }
                  }
                  break;

                case "chunk":
                  accumulatedContent += parsed.content;
                  setStreamingContent(accumulatedContent);
                  break;

                case "sources":
                  // Sources handled separately
                  break;

                case "error":
                  throw new Error(parsed.error);
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Finalize assistant message
    if (assistantMessage && accumulatedContent) {
      const finalMessage: ChatMessage = {
        ...assistantMessage,
        content: accumulatedContent,
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage!.id ? finalMessage : msg,
        ),
      );
      setStreamingContent("");
    }
  };

  // Handle non-streaming response
  const handleNonStreamingResponse = async (requestBody: any) => {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": currentSessionId || "",
      },
      body: JSON.stringify({ ...requestBody, stream: false }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: data.data.message,
      timestamp: new Date(),
      sources: data.data.sources,
      suggestedFollowUps: data.data.suggestedFollowUps,
      metadata: data.data.metadata,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    if (data.data.conversationId) {
      setCurrentConversationId(data.data.conversationId);
    }
  };

  // Handle follow-up suggestion click
  const handleFollowUpClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Handle key press in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Clear conversation
  const handleClearConversation = () => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
      setCurrentConversationId(undefined);
      setError(null);

      if (currentSessionId) {
        localStorage.removeItem(`chesapeake_chat_messages_${currentSessionId}`);
      }
    }
  };

  // Cancel ongoing request
  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsTyping(false);
      setStreamingContent("");
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render message content with formatting
  const renderMessageContent = (content: string) => {
    // Simple markdown-like formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>',
      )
      .replace(/\n/g, "<br />");

    return { __html: formatted };
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-700 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Chesapeake City Assistant</h2>
            <p className="text-blue-100 text-sm">
              Ask me anything about Chesapeake City services and information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm bg-blue-600 px-3 py-1 rounded-full">
              {messages.length} messages
            </span>
            <button
              onClick={handleClearConversation}
              className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full transition-colors"
              disabled={isLoading}
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
                <svg
                  className="w-12 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to Chesapeake Chat Assistant
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                I can help you with information about Chesapeake City services,
                departments, events, and more. Try asking about permits,
                utilities, city services, or local events.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium opacity-80">
                        {message.role === "user"
                          ? "You"
                          : "Chesapeake Assistant"}
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
                        <div className="mt-3 pt-3 border-t border-gray-300 border-opacity-30">
                          <p className="text-xs font-medium mb-2 opacity-80">
                            Sources:
                          </p>
                          <div className="space-y-1">
                            {message.sources
                              .slice(0, 3)
                              .map((source, index) => (
                                <a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs hover:underline opacity-80 truncate"
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
                        <div className="mt-3 pt-3 border-t border-gray-300 border-opacity-30">
                          <p className="text-xs font-medium mb-2 opacity-80">
                            Suggested follow-ups:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestedFollowUps.map(
                              (suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() =>
                                    handleFollowUpClick(suggestion)
                                  }
                                  className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {message.metadata && (
                      <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-20">
                        <p className="text-xs opacity-60">
                          {message.metadata.responseTime &&
                            `Response: ${message.metadata.responseTime}ms`}
                          {message.metadata.model &&
                            ` • Model: ${message.metadata.model}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming content */}
              {isTyping && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-gray-100 text-gray-800 px-5 py-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium opacity-80">
                        Chesapeake Assistant
                      </span>
                      <span className="text-xs opacity-60">Typing...</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && !streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-gray-100 text-gray-800 px-5 py-3 border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-700 font-medium">Error</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg
                  className="w-5 h-5"
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
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Chesapeake City services, departments, events, or information..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isLoading}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  Shift+Enter for new line
                </div>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    !input.trim() || isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>

                {isLoading && (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="px-6 py-3 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleFollowUpClick("What are the trash pickup schedules?")
                }
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                disabled={isLoading}
              >
                Trash schedules
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFollowUpClick("How do I apply for a building permit?")
                }
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                disabled={isLoading}
              >
                Building permits
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFollowUpClick(
                    "What city services are available online?",
                  )
                }
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                disabled={isLoading}
              >
                Online services
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFollowUpClick("How do I contact the police department?")
                }
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                disabled={isLoading}
              >
                Police contact
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                {currentSessionId && (
                  <span>Session: {currentSessionId.substring(0, 8)}...</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span>
                  Streaming: {streamingEnabled ? "Enabled" : "Disabled"}
                </span>
                <span>Messages auto-saved locally</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
