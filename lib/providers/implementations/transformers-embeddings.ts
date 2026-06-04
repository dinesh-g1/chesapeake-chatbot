import {
  EmbeddingProvider,
  EmbeddingResult,
  EmbeddingOptions,
} from "../../types";

/**
 * Embedding provider using Transformers.js (local, no server needed).
 * Uses the all-MiniLM-L6-v2 model (384 dimensions, fast, good quality).
 * Runs entirely in-process, no external API calls.
 */
export class TransformersEmbeddingProvider implements EmbeddingProvider {
  private readonly model: string;
  private readonly dimension: number;
  private pipeline: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: any) {
    this.model = config.model || "Xenova/all-MiniLM-L6-v2";
    this.dimension = config.dimension || 384; // all-MiniLM-L6-v2 produces 384-dim embeddings
  }

  private async ensurePipeline(): Promise<any> {
    if (this.pipeline) return this.pipeline;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        const { pipeline } = await import("@xenova/transformers");
        console.log(`[TransformersEmbedding] Loading model: ${this.model}...`);
        this.pipeline = await pipeline("feature-extraction", this.model);
        console.log(`[TransformersEmbedding] Model loaded: ${this.model}`);
      })();
    }

    await this.initPromise;
    return this.pipeline;
  }

  async generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResult> {
    const extractor = await this.ensurePipeline();
    const allEmbeddings: number[][] = [];

    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });

      // Convert Float32Array to regular number array
      const embedding = Array.from(output.data as Float32Array);
      allEmbeddings.push(embedding);
    }

    return {
      embeddings: allEmbeddings,
      model: this.model,
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
