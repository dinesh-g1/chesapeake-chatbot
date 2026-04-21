// Core types and interfaces for modular Chesapeake City Chatbot architecture

// ============================================================================
// LLM Provider Interface
// ============================================================================

export interface LLMProvider {
  /**
   * Generate a completion based on the given messages
   */
  generateCompletion(
    messages: ChatMessage[],
    options?: LLMGenerateOptions,
  ): Promise<LLMResponse>;

  /**
   * Generate a streaming completion for real-time responses
   */
  generateStreamingCompletion(
    messages: ChatMessage[],
    options?: LLMGenerateOptions,
  ): AsyncIterable<string>;

  /**
   * Get the model name being used
   */
  getModelName(): string;

  /**
   * Estimate token count for a given text
   */
  countTokens(text: string): Promise<number>;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

// ============================================================================
// Embedding Provider Interface
// ============================================================================

export interface EmbeddingProvider {
  /**
   * Generate embeddings for the given texts
   */
  generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult>;

  /**
   * Get the dimension size of the embeddings
   */
  getDimension(): number;

  /**
   * Get the model name being used
   */
  getModelName(): string;
}

export interface EmbeddingOptions {
  batchSize?: number;
  truncate?: boolean;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  usage?: {
    tokens: number;
  };
}

// ============================================================================
// Vector Store Interface
// ============================================================================

export interface VectorStore {
  /**
   * Initialize the vector store (create tables/collections if needed)
   */
  initialize(): Promise<void>;

  /**
   * Add documents to the vector store
   */
  addDocuments(
    documents: VectorDocument[],
    options?: VectorStoreOptions,
  ): Promise<void>;

  /**
   * Search for similar documents
   */
  similaritySearch(
    query: string | number[],
    options?: VectorSearchOptions,
  ): Promise<VectorSearchResult[]>;

  /**
   * Search with metadata filtering
   */
  similaritySearchWithFilter(
    query: string | number[],
    filter: Record<string, any>,
    options?: VectorSearchOptions,
  ): Promise<VectorSearchResult[]>;

  /**
   * Delete documents by IDs
   */
  deleteDocuments(ids: string[]): Promise<void>;

  /**
   * Get document count
   */
  getDocumentCount(): Promise<number>;

  /**
   * Clear all documents
   */
  clear(): Promise<void>;
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface DocumentMetadata {
  source: string;
  url: string;
  title?: string;
  pageTitle?: string;
  section?: string;
  chunkIndex?: number;
  totalChunks?: number;
  lastUpdated?: Date;
  tags?: string[];
  [key: string]: any;
}

export interface VectorSearchOptions {
  k?: number; // number of results to return
  scoreThreshold?: number;
  includeMetadata?: boolean;
  includeEmbedding?: boolean;
}

export interface VectorSearchResult {
  document: VectorDocument;
  score: number;
}

export interface VectorStoreOptions {
  batchSize?: number;
}

// ============================================================================
// Content Scraper Interface
// ============================================================================

export interface ContentScraper {
  /**
   * Scrape content from a URL
   */
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedContent>;

  /**
   * Scrape multiple URLs
   */
  scrapeMultiple(
    urls: string[],
    options?: ScrapeOptions,
  ): Promise<ScrapedContent[]>;

  /**
   * Extract sitemap URLs from a website
   */
  extractSitemapUrls(baseUrl: string): Promise<string[]>;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  html?: string;
  metadata: {
    description?: string;
    keywords?: string[];
    lastModified?: Date;
    contentType?: string;
  };
  sections: ContentSection[];
  links: string[];
}

export interface ContentSection {
  heading?: string;
  level?: number;
  content: string;
  html?: string;
}

export interface ScrapeOptions {
  depth?: number;
  includeLinks?: boolean;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  delay?: number;
}

// ============================================================================
// Chat & Conversation Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: DocumentMetadata[];
    tokens?: number;
    model?: string;
  };
}

export interface Conversation {
  id: string;
  userId?: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    topic?: string;
    department?: string;
    serviceType?: string;
    satisfaction?: number;
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  sessionId?: string;
  userId?: string;
  options?: ChatOptions;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  messageId: string;
  sources?: DocumentMetadata[];
  metadata?: {
    responseTime: number;
    model: string;
    tokensUsed: number;
  };
  suggestedFollowUps?: string[];
}

export interface ChatOptions {
  stream?: boolean;
  temperature?: number;
  includeSources?: boolean;
  maxTokens?: number;
  contextWindow?: number; // number of previous messages to include
}

// ============================================================================
// RAG Pipeline Types
// ============================================================================

export interface RAGPipeline {
  /**
   * Process a query through the RAG pipeline
   */
  processQuery(query: string, context?: RAGContext): Promise<RAGResult>;

  /**
   * Add documents to the knowledge base
   */
  addDocuments(documents: VectorDocument[]): Promise<void>;

  /**
   * Clear the knowledge base
   */
  clearKnowledgeBase(): Promise<void>;
}

export interface RAGContext {
  conversationHistory?: ChatMessage[];
  userId?: string;
  sessionId?: string;
  filters?: Record<string, any>;
}

export interface RAGResult {
  answer: string;
  sources: DocumentMetadata[];
  relevantChunks: VectorDocument[];
  metadata: {
    retrievalTime: number;
    generationTime: number;
    totalTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  llm: LLMConfig;
  embeddings: EmbeddingConfig;
  vectorStore: VectorStoreConfig;
  scraper: ScraperConfig;
  rag: RAGConfig;
  chat: ChatConfig;
  deployment: DeploymentConfig;
}

export interface LLMConfig {
  provider: "openai" | "deepseek" | "anthropic" | "local" | "mock";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface EmbeddingConfig {
  provider: "openai" | "deepseek" | "local" | "mock" | "qwen";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimension: number;
  batchSize: number;
}

export interface VectorStoreConfig {
  provider: "supabase" | "pinecone" | "chroma" | "qdrant" | "sqlite" | "mock";
  connectionString?: string;
  apiKey?: string;
  collectionName?: string;
  tableName?: string;
  dimension: number;
}

export interface ScraperConfig {
  provider: "cheerio" | "playwright" | "mock";
  baseUrl: string;
  maxDepth: number;
  maxPages: number;
  delay: number;
  respectRobotsTxt: boolean;
  userAgent: string;
}

export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  scoreThreshold: number;
  contextWindow: number;
  systemPrompt: string;
  includeSources: boolean;
}

export interface ChatConfig {
  maxHistoryLength: number;
  sessionTimeout: number;
  enableSuggestions: boolean;
  enableStreaming: boolean;
  defaultTemperature: number;
}

export interface DeploymentConfig {
  environment: "development" | "staging" | "production";
  apiUrl: string;
  frontendUrl: string;
  enableAnalytics: boolean;
  enableLogging: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

// ============================================================================
// Factory Types for Dependency Injection
// ============================================================================

export interface ProviderFactory {
  createLLMProvider(config: LLMConfig): LLMProvider;
  createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider;
  createVectorStore(config: VectorStoreConfig): VectorStore;
  createContentScraper(config: ScraperConfig): ContentScraper;
  createRAGPipeline(
    config: RAGConfig,
    providers: {
      llm: LLMProvider;
      embeddings: EmbeddingProvider;
      vectorStore: VectorStore;
    },
  ): RAGPipeline;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> &
  Omit<T, K>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Environment Configuration
// ============================================================================

export interface EnvironmentVariables {
  // LLM Configuration
  LLM_PROVIDER: "openai" | "deepseek" | "anthropic" | "local" | "mock";
  LLM_MODEL: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;

  // Embeddings Configuration
  EMBEDDING_PROVIDER: "openai" | "deepseek" | "local" | "mock" | "qwen";
  EMBEDDING_MODEL: string;
  EMBEDDING_API_KEY?: string;
  EMBEDDING_BASE_URL?: string;

  // Vector Store Configuration
  VECTOR_STORE_PROVIDER:
    | "supabase"
    | "pinecone"
    | "chroma"
    | "qdrant"
    | "sqlite"
    | "mock";
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  PINECONE_API_KEY?: string;
  PINECONE_ENVIRONMENT?: string;

  // Database Configuration
  DATABASE_URL?: string;

  // Scraper Configuration
  SCRAPER_BASE_URL: string;
  SCRAPER_MAX_PAGES: string;
  SCRAPER_DELAY: string;

  // Application Configuration
  NODE_ENV: "development" | "production" | "test";
  PORT: string;
  API_URL: string;
  FRONTEND_URL: string;

  // Security
  JWT_SECRET?: string;
  ENCRYPTION_KEY?: string;

  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
}
