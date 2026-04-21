// Chunking service for processing scraped content into vector-ready chunks

import { v4 as uuidv4 } from "uuid";
import {
  ScrapedContent,
  VectorDocument,
  DocumentMetadata,
  ChunkingOptions,
} from "../types";

export interface Chunk {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  index: number;
  totalChunks: number;
}

export interface ChunkingResult {
  chunks: Chunk[];
  statistics: {
    totalChunks: number;
    averageChunkSize: number;
    maxChunkSize: number;
    minChunkSize: number;
    totalCharacters: number;
  };
}

export class ChunkingService {
  private defaultOptions: ChunkingOptions;

  constructor(options?: Partial<ChunkingOptions>) {
    this.defaultOptions = {
      chunkSize: 512, // characters (approx 128 tokens)
      chunkOverlap: 50, // characters
      separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
      ...options,
    };
  }

  /**
   * Chunk scraped content into smaller pieces
   */
  chunkContent(
    content: ScrapedContent,
    options?: Partial<ChunkingOptions>
  ): ChunkingResult {
    const finalOptions = { ...this.defaultOptions, ...options };
    const baseMetadata = this.createBaseMetadata(content);

    // Extract all text sections from content
    const textSections = this.extractTextSections(content);

    // Chunk each section separately to preserve structure
    const allChunks: Chunk[] = [];
    let sectionStartIndex = 0;

    for (const section of textSections) {
      if (!section.text.trim()) continue;

      const sectionChunks = this.chunkText(
        section.text,
        baseMetadata,
        finalOptions,
        sectionStartIndex,
        section.heading || "Content"
      );

      // Update metadata with section information
      const enrichedChunks = sectionChunks.map((chunk) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          section: section.heading,
          sectionLevel: section.level,
        },
      }));

      allChunks.push(...enrichedChunks);
      sectionStartIndex += sectionChunks.length;
    }

    // If no sections were created (empty content), create a single chunk
    if (allChunks.length === 0) {
      const fullText = content.content.trim();
      if (fullText) {
        const chunks = this.chunkText(
          fullText,
          baseMetadata,
          finalOptions,
          0,
          "Content"
        );
        allChunks.push(...chunks);
      }
    }

    // Update total chunks count in metadata
    const totalChunks = allChunks.length;
    const updatedChunks = allChunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        chunkIndex: index,
        totalChunks,
      },
      index,
      totalChunks,
    }));

    return {
      chunks: updatedChunks,
      statistics: this.calculateStatistics(updatedChunks),
    };
  }

  /**
   * Chunk multiple contents
   */
  chunkMultipleContents(
    contents: ScrapedContent[],
    options?: Partial<ChunkingOptions>
  ): ChunkingResult[] {
    return contents.map((content) => this.chunkContent(content, options));
  }

  /**
   * Convert chunks to vector documents
   */
  chunksToVectorDocuments(chunks: Chunk[]): VectorDocument[] {
    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata,
    }));
  }

  /**
   * Extract text sections from scraped content
   */
  private extractTextSections(content: ScrapedContent): Array<{
    text: string;
    heading?: string;
    level?: number;
  }> {
    const sections: Array<{ text: string; heading?: string; level?: number }> =
      [];

    // Use sections from scraped content if available
    if (content.sections && content.sections.length > 0) {
      for (const section of content.sections) {
        if (section.content.trim()) {
          sections.push({
            text: section.content,
            heading: section.heading,
            level: section.level,
          });
        }
      }
    }

    // If no sections found, use the main content
    if (sections.length === 0 && content.content.trim()) {
      sections.push({
        text: content.content,
        heading: content.title,
        level: 1,
      });
    }

    return sections;
  }

  /**
   * Chunk a single text string
   */
  private chunkText(
    text: string,
    baseMetadata: DocumentMetadata,
    options: ChunkingOptions,
    startIndex: number,
    heading?: string
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const { chunkSize, chunkOverlap, separators } = options;

    // Clean the text
    const cleanedText = this.cleanText(text);

    // If text is shorter than chunk size, return as single chunk
    if (cleanedText.length <= chunkSize) {
      const chunk: Chunk = {
        id: uuidv4(),
        content: cleanedText,
        metadata: {
          ...baseMetadata,
          title: heading || baseMetadata.title,
          section: heading,
        },
        index: startIndex,
        totalChunks: 1,
      };
      return [chunk];
    }

    // Split text into chunks with overlap
    let position = 0;
    let chunkIndex = 0;

    while (position < cleanedText.length) {
      // Determine chunk end position
      let chunkEnd = position + chunkSize;

      // If we're not at the end of the text, try to end at a separator
      if (chunkEnd < cleanedText.length) {
        for (const separator of separators) {
          if (separator === "") {
            // Last resort: break at character boundary
            break;
          }

          const separatorIndex = cleanedText.lastIndexOf(separator, chunkEnd);
          if (separatorIndex > position + chunkSize * 0.5) {
            // Found a good separator, adjust chunk end
            chunkEnd = separatorIndex + separator.length;
            break;
          }
        }
      }

      // Extract chunk
      const chunkText = cleanedText.substring(position, chunkEnd).trim();

      if (chunkText) {
        const chunk: Chunk = {
          id: uuidv4(),
          content: chunkText,
          metadata: {
            ...baseMetadata,
            title: heading || baseMetadata.title,
            section: heading,
          },
          index: startIndex + chunkIndex,
          totalChunks: 0, // Will be updated later
        };
        chunks.push(chunk);
        chunkIndex++;
      }

      // Move position for next chunk with overlap
      position = chunkEnd - chunkOverlap;

      // Ensure we make progress
      if (position <= chunkEnd - chunkSize) {
        position = chunkEnd - Math.floor(chunkSize / 2);
      }
    }

    return chunks;
  }

  /**
   * Create base metadata from scraped content
   */
  private createBaseMetadata(content: ScrapedContent): DocumentMetadata {
    return {
      source: content.url,
      url: content.url,
      title: content.title || "Untitled",
      pageTitle: content.title,
      lastUpdated: content.metadata.lastModified || new Date(),
      tags: content.metadata.keywords || [],
    };
  }

  /**
   * Clean text for chunking
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .replace(/\t+/g, " ") // Replace tabs with spaces
      .replace(/[ \t]+/g, " ") // Clean up spaces
      .trim();
  }

  /**
   * Calculate statistics for chunks
   */
  private calculateStatistics(chunks: Chunk[]): {
    totalChunks: number;
    averageChunkSize: number;
    maxChunkSize: number;
    minChunkSize: number;
    totalCharacters: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageChunkSize: 0,
        maxChunkSize: 0,
        minChunkSize: 0,
        totalCharacters: 0,
      };
    }

    const chunkSizes = chunks.map((chunk) => chunk.content.length);
    const totalCharacters = chunkSizes.reduce((sum, size) => sum + size, 0);
    const averageChunkSize = Math.round(totalCharacters / chunks.length);
    const maxChunkSize = Math.max(...chunkSizes);
    const minChunkSize = Math.min(...chunkSizes);

    return {
      totalChunks: chunks.length,
      averageChunkSize,
      maxChunkSize,
      minChunkSize,
      totalCharacters,
    };
  }

  /**
   * Estimate tokens for a text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Chunk by tokens instead of characters (for more accurate LLM context)
   */
  chunkByTokens(
    text: string,
    baseMetadata: DocumentMetadata,
    options: {
      tokenLimit: number;
      tokenOverlap: number;
    },
    heading?: string
  ): Chunk[] {
    const { tokenLimit, tokenOverlap } = options;
    const chunks: Chunk[] = [];

    // Simple tokenization by words for approximation
    const words = text.split(/\s+/);
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;

    for (const word of words) {
      const wordTokens = this.estimateTokens(word);

      // If adding this word would exceed token limit, finalize current chunk
      if (currentTokenCount + wordTokens > tokenLimit && currentChunk.length > 0) {
        const chunkText = currentChunk.join(" ").trim();
        if (chunkText) {
          chunks.push({
            id: uuidv4(),
            content: chunkText,
            metadata: {
              ...baseMetadata,
              title: heading || baseMetadata.title,
              section: heading,
            },
            index: chunkIndex,
            totalChunks: 0,
          });
          chunkIndex++;
        }

        // Start new chunk with overlap
        const overlapTokens = Math.min(tokenOverlap, currentTokenCount);
        const overlapWords = [];
        let overlapCount = 0;

        // Add words from end of previous chunk for overlap
        for (let i = currentChunk.length - 1; i >= 0 && overlapCount < overlapTokens; i--) {
          const overlapWord = currentChunk[i];
          const wordTokenCount = this.estimateTokens(overlapWord);
          if (overlapCount + wordTokenCount <= overlapTokens) {
            overlapWords.unshift(overlapWord);
            overlapCount += wordTokenCount;
          } else {
            break;
          }
        }

        currentChunk = overlapWords;
        currentTokenCount = overlapCount;
      }

      // Add word to current chunk
      currentChunk.push(word);
      currentTokenCount += wordTokens;
    }

    // Add final chunk if there's remaining text
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(" ").trim();
      if (chunkText) {
        chunks.push({
          id: uuidv4(),
          content: chunkText,
          metadata: {
            ...baseMetadata,
            title: heading || baseMetadata.title,
            section: heading,
          },
          index: chunkIndex,
          totalChunks: chunks.length + 1,
        });
      }
    }

    // Update total chunks count
    return chunks.map((chunk, index) => ({
      ...chunk,
      index,
      totalChunks: chunks.length,
    }));
  }
}
