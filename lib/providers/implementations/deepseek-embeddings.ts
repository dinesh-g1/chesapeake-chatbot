import axios from "axios";
import {
  EmbeddingProvider,
  EmbeddingResult,
  EmbeddingOptions,
} from "../../types";

export class DeepSeekEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly dimension: number;
  private readonly defaultOptions: EmbeddingOptions;

  constructor(config: any) {
    this.apiKey = config.apiKey || "";
    this.baseUrl = config.baseUrl || "https://api.deepseek.com";
    this.model = config.model || "deepseek-embedding";
    this.dimension = config.dimension || 1536; // DeepSeek embeddings dimension

    if (!this.apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    this.defaultOptions = {
      batchSize: config.batchSize || 32,
      truncate: config.truncate || true,
    };
  }

  async generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const batchSize = finalOptions.batchSize || 32;
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    // Process texts in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await axios.post(
          `${this.baseUrl}/embeddings`,
          {
            model: this.model,
            input: batch,
            encoding_format: "float",
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000, // 30 second timeout
          },
        );

        const data = response.data;

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid response format from DeepSeek embeddings API");
        }

        // Extract embeddings from response
        const batchEmbeddings = data.data.map((item: any) => item.embedding);
        allEmbeddings.push(...batchEmbeddings);

        // Accumulate token usage if available
        if (data.usage?.total_tokens) {
          totalTokens += data.usage.total_tokens;
        }

        // Respect rate limits - add small delay between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        if (error.response) {
          throw new Error(
            `DeepSeek embeddings API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          throw new Error("DeepSeek embeddings API request failed - no response received");
        } else {
          throw new Error(`DeepSeek embeddings API error: ${error.message}`);
        }
      }
    }

    // Validate that we got the right number of embeddings
    if (allEmbeddings.length !== texts.length) {
      throw new Error(`Expected ${texts.length} embeddings but got ${allEmbeddings.length}`);
    }

    // Validate embedding dimensions
    for (const embedding of allEmbeddings) {
      if (!Array.isArray(embedding)) {
        throw new Error("Embedding is not an array");
      }
      if (embedding.length !== this.dimension) {
        console.warn(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
      }
    }

    return {
      embeddings: allEmbeddings,
      model: this.model,
      usage: totalTokens > 0 ? { tokens: totalTokens } : undefined,
    };
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}
