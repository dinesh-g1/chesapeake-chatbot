import axios from "axios";
import {
  EmbeddingProvider,
  EmbeddingResult,
  EmbeddingOptions,
} from "../../types";

export class QwenEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimension: number;
  private readonly defaultOptions: EmbeddingOptions;

  constructor(config: any) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "qwen2.5:1.5b";
    this.dimension = config.dimension || 2048; // Qwen2.5-1.5B has 2048 dimensions

    // Note: No API key needed for local Ollama
    this.defaultOptions = {
      batchSize: config.batchSize || 1, // Ollama typically processes one at a time
      truncate: config.truncate || true,
    };
  }

  async generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const batchSize = finalOptions.batchSize || 1;
    const allEmbeddings: number[][] = [];

    // Process texts sequentially (Ollama doesn't support batch embeddings)
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      try {
        const response = await axios.post(
          `${this.baseUrl}/api/embeddings`,
          {
            model: this.model,
            prompt: text,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 60000, // 60 second timeout for local inference
          },
        );

        const data = response.data;

        if (!data.embedding || !Array.isArray(data.embedding)) {
          throw new Error(
            `Invalid response format from Ollama embeddings API: ${JSON.stringify(data)}`,
          );
        }

        allEmbeddings.push(data.embedding);

        // Validate embedding dimension
        if (data.embedding.length !== this.dimension) {
          console.warn(
            `Embedding dimension mismatch: expected ${this.dimension}, got ${data.embedding.length}. This may affect vector search accuracy.`,
          );
        }

        // Add small delay between requests to avoid overwhelming the local server
        if (i < texts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        if (error.response) {
          throw new Error(
            `Qwen embeddings API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          throw new Error(
            "Qwen embeddings API request failed - no response received. Make sure Ollama is running on " +
              this.baseUrl,
          );
        } else {
          throw new Error(`Qwen embeddings API error: ${error.message}`);
        }
      }
    }

    // Validate that we got the right number of embeddings
    if (allEmbeddings.length !== texts.length) {
      throw new Error(
        `Expected ${texts.length} embeddings but got ${allEmbeddings.length}`,
      );
    }

    return {
      embeddings: allEmbeddings,
      model: this.model,
      // Ollama doesn't provide token usage info in embeddings endpoint
      usage: undefined,
    };
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return this.model;
  }
}
