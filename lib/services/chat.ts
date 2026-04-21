import {
  ChatMessage,
  Conversation,
  ChatRequest,
  ChatResponse,
  ChatOptions,
  RAGPipeline,
  LLMProvider,
  VectorStore,
  DocumentMetadata,
} from "../types";

import { v4 as uuidv4 } from "uuid";

export interface ChatServiceConfig {
  maxHistoryLength: number;
  sessionTimeout: number;
  enableSuggestions: boolean;
  enableStreaming: boolean;
  defaultTemperature: number;
}

export interface ConversationStorage {
  getConversation(id: string): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  listConversations(sessionId?: string, userId?: string): Promise<Conversation[]>;
  clearConversations(sessionId?: string, userId?: string): Promise<void>;
}

export class ChatService {
  private conversations: Map<string, Conversation> = new Map();
  private sessionLastActive: Map<string, number> = new Map();

  constructor(
    private ragPipeline: RAGPipeline,
    private llmProvider: LLMProvider,
    private config: ChatServiceConfig,
    private storage?: ConversationStorage
  ) {}

  /**
   * Process a chat message and generate a response
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get or create conversation
    let conversation = await this.getConversation(request);

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: request.message,
      timestamp: new Date(),
    };

    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date();

    // Generate response using RAG pipeline
    const context = {
      conversationHistory: this.getRelevantHistory(conversation.messages, request.options?.contextWindow),
      userId: request.userId,
      sessionId: request.sessionId,
    };

    const ragResult = await this.ragPipeline.processQuery(request.message, context);

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: ragResult.answer,
      timestamp: new Date(),
      metadata: {
        sources: ragResult.sources,
        tokens: ragResult.metadata.tokensUsed,
        model: ragResult.metadata.model,
      },
    };

    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    // Update conversation title if it's the first message
    if (conversation.messages.length === 2) {
      conversation.title = await this.generateConversationTitle(request.message);
    }

    // Save conversation
    await this.saveConversation(conversation);

    // Generate suggested follow-up questions
    let suggestedFollowUps: string[] = [];
    if (this.config.enableSuggestions) {
      suggestedFollowUps = await this.generateFollowUpQuestions(
        ragResult.answer,
        conversation.messages
      );
    }

    const responseTime = Date.now() - startTime;

    return {
      message: ragResult.answer,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      sources: ragResult.sources,
      metadata: {
        responseTime,
        model: ragResult.metadata.model,
        tokensUsed: ragResult.metadata.tokensUsed,
      },
      suggestedFollowUps,
    };
  }

  /**
   * Process a chat message with streaming response
   */
  async *processMessageStream(request: ChatRequest): AsyncIterable<string> {
    // Get or create conversation
    let conversation = await this.getConversation(request);

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: request.message,
      timestamp: new Date(),
    };

    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date();

    // Generate streaming response
    const context = {
      conversationHistory: this.getRelevantHistory(conversation.messages, request.options?.contextWindow),
      userId: request.userId,
      sessionId: request.sessionId,
    };

    // For streaming, we need to handle the response differently
    // This is a simplified version - in production, we'd integrate with streaming LLM
    let fullResponse = "";

    // Simulate streaming by words
    const ragResult = await this.ragPipeline.processQuery(request.message, context);
    const words = ragResult.answer.split(" ");

    for (const word of words) {
      yield word + " ";
      fullResponse += word + " ";
      await new Promise(resolve => setTimeout(resolve, 30)); // Simulate streaming delay
    }

    // Create assistant message with full response
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content: fullResponse.trim(),
      timestamp: new Date(),
      metadata: {
        sources: ragResult.sources,
        tokens: ragResult.metadata.tokensUsed,
        model: ragResult.metadata.model,
      },
    };

    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    // Update conversation title if it's the first message
    if (conversation.messages.length === 2) {
      conversation.title = await this.generateConversationTitle(request.message);
    }

    // Save conversation
    await this.saveConversation(conversation);
  }

  /**
   * Get conversation by ID or create new one
   */
  private async getConversation(request: ChatRequest): Promise<Conversation> {
    const sessionId = request.sessionId || this.generateSessionId();
    const now = Date.now();

    // Update session activity
    this.sessionLastActive.set(sessionId, now);

    // Clean up old sessions
    this.cleanupOldSessions();

    if (request.conversationId) {
      // Try to load existing conversation
      const existing = await this.loadConversation(request.conversationId);
      if (existing) {
        return existing;
      }
    }

    // Create new conversation
    const conversation: Conversation = {
      id: uuidv4(),
      sessionId,
      userId: request.userId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return conversation;
  }

  /**
   * Load conversation from storage or memory
   */
  private async loadConversation(id: string): Promise<Conversation | null> {
    // First try storage
    if (this.storage) {
      const stored = await this.storage.getConversation(id);
      if (stored) {
        this.conversations.set(id, stored);
        return stored;
      }
    }

    // Then try memory cache
    const cached = this.conversations.get(id);
    if (cached) {
      return cached;
    }

    return null;
  }

  /**
   * Save conversation to storage and memory
   */
  private async saveConversation(conversation: Conversation): Promise<void> {
    // Trim conversation history if needed
    if (conversation.messages.length > this.config.maxHistoryLength * 2) {
      // Keep system message if present, and recent messages
      const systemMessages = conversation.messages.filter(m => m.role === "system");
      const recentMessages = conversation.messages
        .filter(m => m.role !== "system")
        .slice(-this.config.maxHistoryLength);

      conversation.messages = [...systemMessages, ...recentMessages];
    }

    // Update memory cache
    this.conversations.set(conversation.id, conversation);

    // Update storage if available
    if (this.storage) {
      await this.storage.saveConversation(conversation);
    }
  }

  /**
   * Get relevant conversation history
   */
  private getRelevantHistory(
    messages: ChatMessage[],
    contextWindow?: number
  ): ChatMessage[] {
    const windowSize = contextWindow || this.config.maxHistoryLength;

    // Filter out system messages from history (they're handled separately)
    const nonSystemMessages = messages.filter(m => m.role !== "system");

    // Return the most recent messages within the window
    return nonSystemMessages.slice(-windowSize);
  }

  /**
   * Generate a conversation title based on first message
   */
  private async generateConversationTitle(firstMessage: string): Promise<string> {
    // Simple title generation - extract first few words or generate summary
    const words = firstMessage.split(" ");
    if (words.length <= 5) {
      return firstMessage;
    }

    // Try to generate a better title using LLM (simplified for now)
    const title = words.slice(0, 5).join(" ") + "...";
    return title;
  }

  /**
   * Generate follow-up questions based on conversation
   */
  private async generateFollowUpQuestions(
    lastResponse: string,
    messages: ChatMessage[]
  ): Promise<string[]> {
    // Simple implementation - in production, use LLM to generate relevant follow-ups
    const commonFollowUps = [
      "Can you tell me more about that?",
      "What are the requirements for this?",
      "How do I apply for this service?",
      "What documents do I need?",
      "What are the fees involved?",
      "How long does this process take?",
      "Who should I contact for more information?",
      "Are there any deadlines I should be aware of?",
    ];

    // Return 3 random follow-ups for demo
    return commonFollowUps
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  /**
   * Get all conversations for a session or user
   */
  async getConversations(sessionId?: string, userId?: string): Promise<Conversation[]> {
    if (this.storage) {
      return await this.storage.listConversations(sessionId, userId);
    }

    // Fallback to memory cache
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(conv => {
      if (sessionId && conv.sessionId !== sessionId) return false;
      if (userId && conv.userId !== userId) return false;
      return true;
    });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);

    if (this.storage) {
      await this.storage.deleteConversation(id);
    }
  }

  /**
   * Clear all conversations for a session or user
   */
  async clearConversations(sessionId?: string, userId?: string): Promise<void> {
    if (this.storage) {
      await this.storage.clearConversations(sessionId, userId);
    }

    // Also clear from memory cache
    for (const [id, conv] of this.conversations.entries()) {
      if ((sessionId && conv.sessionId === sessionId) ||
          (userId && conv.userId === userId)) {
        this.conversations.delete(id);
      }
    }
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const timeout = this.config.sessionTimeout;

    for (const [sessionId, lastActive] of this.sessionLastActive.entries()) {
      if (now - lastActive > timeout) {
        this.sessionLastActive.delete(sessionId);
        // Optionally clear conversations for this session
        // this.clearConversations(sessionId);
      }
    }
  }

  /**
   * Get session activity status
   */
  getSessionActivity(sessionId: string): { lastActive: number; isActive: boolean } {
    const lastActive = this.sessionLastActive.get(sessionId) || 0;
    const isActive = Date.now() - lastActive < this.config.sessionTimeout;

    return { lastActive, isActive };
  }
}

/**
 * In-memory conversation storage implementation
 */
export class MemoryConversationStorage implements ConversationStorage {
  private conversations: Map<string, Conversation> = new Map();

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
  }

  async listConversations(sessionId?: string, userId?: string): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(conv => {
      if (sessionId && conv.sessionId !== sessionId) return false;
      if (userId && conv.userId !== userId) return false;
      return true;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async clearConversations(sessionId?: string, userId?: string): Promise<void> {
    for (const [id, conv] of this.conversations.entries()) {
      if ((sessionId && conv.sessionId === sessionId) ||
          (userId && conv.userId === userId)) {
        this.conversations.delete(id);
      }
    }
  }
}

/**
 * Create a chat service with default configuration
 */
export function createChatService(
  ragPipeline: RAGPipeline,
  llmProvider: LLMProvider,
  config?: Partial<ChatServiceConfig>,
  storage?: ConversationStorage
): ChatService {
  const defaultConfig: ChatServiceConfig = {
    maxHistoryLength: 20,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    enableSuggestions: true,
    enableStreaming: true,
    defaultTemperature: 0.7,
  };

  const finalConfig = { ...defaultConfig, ...config };
  const finalStorage = storage || new MemoryConversationStorage();

  return new ChatService(ragPipeline, llmProvider, finalConfig, finalStorage);
}
