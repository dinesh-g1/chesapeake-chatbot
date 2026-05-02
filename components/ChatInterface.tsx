"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { useVoice } from "@/lib/useVoice";

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
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Restore persisted messages from localStorage on mount
    try {
      const storedId =
        sessionId || localStorage.getItem("chesapeake_chat_session_id");
      if (storedId) {
        const saved = localStorage.getItem(
          `chesapeake_chat_messages_${storedId}`,
        );
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }
      }
    } catch (e) {
      console.error("Failed to restore chat history:", e);
    }
    return initialMessages;
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] =
    useState(conversationId);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );

  // Voice synthesis - free browser Web Speech API with Southern cadence
  const voice = useVoice({ rate: 0.85, pitch: 0.95 });
  const [inputCollapsed, setInputCollapsed] = useState(false);

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

  // Load saved messages from localStorage when session ID is established
  useEffect(() => {
    if (currentSessionId && messages.length === 0) {
      try {
        const saved = localStorage.getItem(
          `chesapeake_chat_messages_${currentSessionId}`,
        );
        if (saved) {
          const parsed = JSON.parse(saved);
          const restored = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          // Only restore if we have messages and current state is empty
          if (restored.length > 0) {
            setMessages(restored);
          }
        }
      } catch (e) {
        console.error("Failed to restore chat history:", e);
      }
    }
  }, [currentSessionId]);

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
    setInputCollapsed(true);

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
      setInputCollapsed(false);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
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
                    const newAssistantMessage: ChatMessage = {
                      id: generateMessageId(),
                      role: "assistant",
                      content: "",
                      timestamp: new Date(),
                    };
                    assistantMessage = newAssistantMessage;
                    setMessages((prev) => [...prev, newAssistantMessage]);
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
      setInputCollapsed(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render message content with formatting
  const renderMessageContent = (content: string) => {
    let formatted = content;

    // ── Pre-processing: handle raw HTML tags the LLM may output ──────
    // 1. Convert raw <a href="URL" ...>text</a> to markdown [text](URL)
    //    This catches when the LLM outputs full HTML anchor tags.
    formatted = formatted.replace(
      /<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_, url, text) => {
        const cleaned = text.replace(/\s+/g, " ").trim();
        return `[${cleaned}](${url})`;
      },
    );

    // 2. Strip any remaining raw HTML tags (preserving their inner text)
    formatted = formatted.replace(/<[^>]*>/g, "");

    // 3. Escape HTML entities to prevent XSS
    formatted = formatted
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // ── Link processing ──────────────────────────────────────────────
    // 4. Convert markdown links [text](url) to clickable <a> tags
    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0c5898] underline hover:text-[#a21f4b]">$1</a>',
    );

    // ── Enhanced markdown-like formatting ────────────────────────────
    formatted = formatted
      // Bold → Chesapeake blue
      .replace(
        /\*\*(.*?)\*\*/g,
        "<strong class='font-semibold text-[#0c5898]'>$1</strong>",
      )
      // Italic
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
      // Inline code → maroon accent
      .replace(
        /`(.*?)`/g,
        '<code class="bg-[#f0f0f0] px-1 py-px rounded text-[13px] font-mono text-[#a21f4b]">$1</code>',
      )
      // ### Headings
      .replace(
        /^#{3}\s+(.*)$/gm,
        '<div class="text-[#0c5898] font-semibold text-sm mt-2 mb-0.5">$1</div>',
      )
      // ## Headings
      .replace(
        /^#{2}\s+(.*)$/gm,
        '<div class="text-[#0c5898] font-semibold text-[15px] mt-2.5 mb-0.5">$1</div>',
      )
      // # Headings
      .replace(
        /^#{1}\s+(.*)$/gm,
        '<div class="text-[#a21f4b] font-bold text-base mt-2.5 mb-1">$1</div>',
      )
      // Numbered list items
      .replace(
        /^(\d+)\.\s+(.*)$/gm,
        '<div class="flex gap-1.5 ml-1 my-0.5"><span class="text-[#a21f4b] font-semibold min-w-[1.25rem] text-sm">$1.</span><span class="text-sm">$2</span></div>',
      )
      // Bullet list items
      .replace(
        /^[•\-\*]\s+(.*)$/gm,
        '<div class="flex gap-1.5 ml-1 my-0.5"><span class="text-[#a21f4b] font-semibold">•</span><span class="text-sm">$1</span></div>',
      )
      // Newlines: double newlines become paragraph breaks, single become <br>
      .replace(/\n\n+/g, "</p><p class='my-1'>")
      .replace(/\n/g, "<br />");

    formatted = `<p class='my-0.5'>${formatted}</p>`;
    return { __html: formatted };
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Chat container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length > 0 && (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "chesapeake-bg-primary text-white rounded-br-md"
                        : "bg-[#f8f9fa] text-[#454545] rounded-bl-md border border-[#e8eaed]"
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
                      className="text-sm leading-relaxed max-w-none space-y-1 [&_br]:content-[''] [&_br]:block [&_br]:h-1.5"
                      dangerouslySetInnerHTML={renderMessageContent(
                        message.content,
                      )}
                    />

                    {/* Voice controls for assistant messages */}
                    {message.role === "assistant" && voice.isSupported && (
                      <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-30 flex items-center gap-2">
                        {speakingMessageId !== message.id ? (
                          /* Not playing this message — show Listen */
                          <button
                            onClick={() => {
                              // Strip markdown for cleaner speech
                              const cleanText = message.content
                                .replace(/\*\*/g, "")
                                .replace(/\*/g, "")
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                                .replace(/[#>`]/g, "")
                                .replace(/\n{2,}/g, ". ")
                                .replace(/\n/g, ". ");
                              voice.speak(cleanText);
                              setSpeakingMessageId(message.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-gray-200 text-gray-600 hover:bg-gray-300"
                            aria-label="Listen to response"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Listen
                          </button>
                        ) : voice.status === "speaking" ? (
                          /* Playing — show Pause + Stop */
                          <>
                            <button
                              onClick={() => voice.pause()}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200"
                              aria-label="Pause speaking"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              Pause
                            </button>
                            <button
                              onClick={() => {
                                voice.stop();
                                setSpeakingMessageId(null);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                              aria-label="Stop speaking"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                              Stop
                            </button>
                          </>
                        ) : voice.status === "paused" ? (
                          /* Paused — show Resume + Stop */
                          <>
                            <button
                              onClick={() => voice.resume()}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                              aria-label="Resume speaking"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Resume
                            </button>
                            <button
                              onClick={() => {
                                voice.stop();
                                setSpeakingMessageId(null);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-red-100 text-red-600 hover:bg-red-200"
                              aria-label="Stop speaking"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                              Stop
                            </button>
                          </>
                        ) : (
                          /* idle / error / other — show Listen */
                          <button
                            onClick={() => {
                              const cleanText = message.content
                                .replace(/\*\*/g, "")
                                .replace(/\*/g, "")
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                                .replace(/[#>`]/g, "")
                                .replace(/\n{2,}/g, ". ")
                                .replace(/\n/g, ". ");
                              voice.speak(cleanText);
                              setSpeakingMessageId(message.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-gray-200 text-gray-600 hover:bg-gray-300"
                            aria-label="Listen to response"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Listen
                          </button>
                        )}
                      </div>
                    )}

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
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={renderMessageContent(
                        streamingContent,
                      )}
                    />
                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
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

        {/* Input area - collapsible when responding */}
        {inputCollapsed ? (
          <div
            onClick={() => {
              setInputCollapsed(false);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="border-t border-gray-200 px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 text-gray-400">
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span className="text-sm">Click to type your message...</span>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-stretch gap-3">
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

                <div className="flex flex-col justify-end gap-2">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`px-6 rounded-lg font-medium transition-colors self-stretch ${
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
                      className="px-6 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white text-sm transition-colors"
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
                    handleFollowUpClick(
                      "How do I contact the police department?",
                    )
                  }
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                  disabled={isLoading}
                >
                  Police contact
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleClearConversation}
                  className="text-xs font-medium text-gray-500 border border-gray-300 hover:border-red-400 hover:text-red-500 rounded-md px-3 py-1.5 transition-colors"
                  disabled={isLoading}
                >
                  Clear conversation
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
