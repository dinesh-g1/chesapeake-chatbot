import {
  LLMProvider,
  EmbeddingProvider,
  VectorStore,
  ContentScraper,
  RAGPipeline,
  ProviderFactory,
  LLMConfig,
  EmbeddingConfig,
  VectorStoreConfig,
  ScraperConfig,
  RAGConfig,
  AppConfig,
  ChatMessage,
  LLMResponse,
  EmbeddingResult,
  VectorDocument,
  VectorSearchResult,
  ScrapedContent,
  RAGResult,
} from "../types";

import { configManager } from "../config";

// Import real implementations
import { DeepSeekLLMProvider } from "./implementations/deepseek-llm";
import { DeepSeekEmbeddingProvider } from "./implementations/deepseek-embeddings";
import { QwenEmbeddingProvider } from "./implementations/qwen-embeddings";
import { CheerioContentScraper } from "./implementations/cheerio-scraper";
import { SQLiteVectorStore } from "./implementations/sqlite-vector-store";

// ============================================================================
// Mock Implementations (for testing/demo fallback)
// ============================================================================

class MockLLMProvider implements LLMProvider {
  constructor(private config: LLMConfig) {}

  async generateCompletion(
    messages: ChatMessage[],
    options?: any,
  ): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay

    const lastMessage = messages[messages.length - 1]?.content || "Hello";
    return {
      content: `Mock response to: "${lastMessage}". This is a mock LLM provider for testing.`,
      model: this.config.model,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: "stop",
    };
  }

  async *generateStreamingCompletion(
    messages: ChatMessage[],
    options?: any,
  ): AsyncIterable<string> {
    const response = await this.generateCompletion(messages, options);
    const words = response.content.split(" ");
    for (const word of words) {
      yield word + " ";
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  getModelName(): string {
    return this.config.model;
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  constructor(private config: EmbeddingConfig) {}

  async generateEmbeddings(
    texts: string[],
    options?: any,
  ): Promise<EmbeddingResult> {
    const dimension = this.config.dimension;
    const embeddings = texts.map(() =>
      Array.from({ length: dimension }, () => Math.random() * 2 - 1),
    );

    return {
      embeddings,
      model: this.config.model,
      usage: {
        tokens: texts.reduce((sum, text) => sum + text.length, 0),
      },
    };
  }

  getDimension(): number {
    return this.config.dimension;
  }

  getModelName(): string {
    return this.config.model;
  }
}

class MockVectorStore implements VectorStore {
  private documents: Map<string, VectorDocument> = new Map();

  async initialize(): Promise<void> {
    // Nothing to initialize for mock
  }

  async addDocuments(
    documents: VectorDocument[],
    options?: any,
  ): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
  }

  async similaritySearch(
    query: string | number[],
    options?: any,
  ): Promise<VectorSearchResult[]> {
    const k = options?.k || 5;
    const results: VectorSearchResult[] = [];
    const docsArray = Array.from(this.documents.values());

    for (const doc of docsArray) {
      if (results.length >= k) break;
      results.push({
        document: doc,
        score: Math.random() * 0.5 + 0.5, // Random score between 0.5 and 1.0
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async similaritySearchWithFilter(
    query: string | number[],
    filter: Record<string, any>,
    options?: any,
  ): Promise<VectorSearchResult[]> {
    const allResults = await this.similaritySearch(query, options);
    return allResults.filter((result) => {
      for (const [key, value] of Object.entries(filter)) {
        if (result.document.metadata[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  async getDocumentCount(): Promise<number> {
    return this.documents.size;
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }
}

class MockContentScraper implements ContentScraper {
  constructor(private config: ScraperConfig) {}

  async scrape(url: string, options?: any): Promise<ScrapedContent> {
    await new Promise((resolve) =>
      setTimeout(resolve, this.config.delay || 1000),
    );

    return {
      url,
      title: `Mock page: ${url}`,
      content: `This is mock content scraped from ${url}. In a real implementation, this would contain actual website content.`,
      metadata: {
        description: "Mock description",
        lastModified: new Date(),
        contentType: "text/html",
      },
      sections: [
        {
          heading: "Mock Section",
          level: 2,
          content: "Mock section content",
        },
      ],
      links: [
        `${this.config.baseUrl}/mock-page-1`,
        `${this.config.baseUrl}/mock-page-2`,
      ],
    };
  }

  async scrapeMultiple(
    urls: string[],
    options?: any,
  ): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    for (const url of urls) {
      results.push(await this.scrape(url, options));
    }
    return results;
  }

  async extractSitemapUrls(baseUrl: string): Promise<string[]> {
    return [
      `${baseUrl}/`,
      `${baseUrl}/services`,
      `${baseUrl}/departments`,
      `${baseUrl}/contact`,
      `${baseUrl}/news`,
    ];
  }
}

// ============================================================================
// RAG Pipeline Implementation
// ============================================================================

class RealRAGPipeline implements RAGPipeline {
  constructor(
    private config: RAGConfig,
    private llm: LLMProvider,
    private embeddings: EmbeddingProvider,
    private vectorStore: VectorStore,
  ) {}

  async processQuery(query: string, context?: any): Promise<RAGResult> {
    const startTime = Date.now();

    // Generate embedding for the query
    const queryEmbeddingResult = await this.embeddings.generateEmbeddings([
      query,
    ]);
    const queryEmbedding = queryEmbeddingResult.embeddings[0];

    // Retrieve relevant documents
    const retrievalStart = Date.now();
    const relevantChunks = await this.vectorStore.similaritySearch(
      queryEmbedding,
      {
        k: this.config.topK,
        scoreThreshold: this.config.scoreThreshold,
        includeMetadata: true,
      },
    );
    const retrievalTime = Date.now() - retrievalStart;

    // Prepare context for LLM
    const contextText = relevantChunks
      .map((result, index) => {
        const source = result.document.metadata.source || "Unknown source";
        const title = result.document.metadata.title || "Untitled";
        return `[Source ${index + 1}: ${title} (${source})]\n${result.document.content}`;
      })
      .join("\n\n");

    const conversationHistory = context?.conversationHistory || [];
    const historyText = conversationHistory
      .slice(-this.config.contextWindow)
      .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Prepare system prompt with context
    const fullSystemPrompt = `${this.config.systemPrompt}\n\nContext from Chesapeake City website:\n${contextText}\n\nConversation history:\n${historyText}`;

    // Generate response
    const generationStart = Date.now();
    const response = await this.llm.generateCompletion([
      {
        id: "system",
        role: "system",
        content: fullSystemPrompt,
        timestamp: new Date(),
      },
      {
        id: "user",
        role: "user",
        content: query,
        timestamp: new Date(),
      },
    ]);
    const generationTime = Date.now() - generationStart;

    const sources = relevantChunks.map((result) => result.document.metadata);

    return {
      answer: response.content,
      sources: this.config.includeSources ? sources : [],
      relevantChunks: relevantChunks.map((result) => result.document),
      metadata: {
        retrievalTime,
        generationTime,
        totalTime: Date.now() - startTime,
        tokensUsed: response.usage?.totalTokens || 0,
        model: response.model,
      },
    };
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    // Generate embeddings for documents
    const texts = documents.map((doc) => doc.content);
    const embeddingResult = await this.embeddings.generateEmbeddings(texts);

    // Add embeddings to documents
    const documentsWithEmbeddings = documents.map((doc, index) => ({
      ...doc,
      embedding: embeddingResult.embeddings[index],
    }));

    await this.vectorStore.addDocuments(documentsWithEmbeddings);
  }

  async clearKnowledgeBase(): Promise<void> {
    await this.vectorStore.clear();
  }
}

// ============================================================================
// Main Provider Factory
// ============================================================================

export class ChesapeakeProviderFactory implements ProviderFactory {
  createLLMProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case "deepseek":
        return new DeepSeekLLMProvider(config);
      case "openai":
        // Would return OpenAI provider implementation
        throw new Error("OpenAI provider not implemented yet");
      case "anthropic":
        // Would return Anthropic provider implementation
        throw new Error("Anthropic provider not implemented yet");
      case "local":
        // Would return local LLM provider implementation
        throw new Error("Local LLM provider not implemented yet");
      case "mock":
        return new MockLLMProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
    switch (config.provider) {
      case "deepseek":
        return new DeepSeekEmbeddingProvider(config);
      case "openai":
        // Would return OpenAI embeddings implementation
        throw new Error("OpenAI embeddings not implemented yet");
      case "local":
        // Would return local embeddings implementation
        throw new Error("Local embeddings not implemented yet");
      case "qwen":
        return new QwenEmbeddingProvider(config);
      case "mock":
        return new MockEmbeddingProvider(config);
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  }

  createVectorStore(config: VectorStoreConfig): VectorStore {
    switch (config.provider) {
      case "supabase":
        // Would return Supabase vector store implementation
        throw new Error("Supabase vector store not implemented yet");
      case "pinecone":
        // Would return Pinecone vector store implementation
        throw new Error("Pinecone vector store not implemented yet");
      case "chroma":
        // Would return ChromaDB vector store implementation
        throw new Error("ChromaDB vector store not implemented yet");
      case "qdrant":
        // Would return Qdrant vector store implementation
        throw new Error("Qdrant vector store not implemented yet");
      case "sqlite":
        return new SQLiteVectorStore(config);
      case "mock":
        return new MockVectorStore();
      default:
        throw new Error(`Unsupported vector store: ${config.provider}`);
    }
  }

  createContentScraper(config: ScraperConfig): ContentScraper {
    switch (config.provider) {
      case "cheerio":
        return new CheerioContentScraper(config);
      case "playwright":
        // Would return Playwright scraper implementation
        throw new Error("Playwright scraper not implemented yet");
      case "mock":
        return new MockContentScraper(config);
      default:
        throw new Error(`Unsupported scraper: ${config.provider}`);
    }
  }

  createRAGPipeline(
    config: RAGConfig,
    providers: {
      llm: LLMProvider;
      embeddings: EmbeddingProvider;
      vectorStore: VectorStore;
    },
  ): RAGPipeline {
    return new RealRAGPipeline(
      config,
      providers.llm,
      providers.embeddings,
      providers.vectorStore,
    );
  }
}

// ============================================================================
// Singleton Factory Instance
// ============================================================================

let factoryInstance: ChesapeakeProviderFactory | null = null;

export function getProviderFactory(): ChesapeakeProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new ChesapeakeProviderFactory();
  }
  return factoryInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function createProvidersFromConfig(config: AppConfig) {
  const factory = getProviderFactory();

  const llm = factory.createLLMProvider(config.llm);
  const embeddings = factory.createEmbeddingProvider(config.embeddings);
  const vectorStore = factory.createVectorStore(config.vectorStore);
  const scraper = factory.createContentScraper(config.scraper);
  const rag = factory.createRAGPipeline(config.rag, {
    llm,
    embeddings,
    vectorStore,
  });

  return {
    llm,
    embeddings,
    vectorStore,
    scraper,
    rag,
    factory,
  };
}

export function createDefaultProviders() {
  const config = configManager.getConfig();
  return createProvidersFromConfig(config);
}
