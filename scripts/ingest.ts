#!/usr/bin/env node

/**
 * Data Ingestion Script for Chesapeake City Chatbot
 *
 * This script scrapes content from the Chesapeake City website,
 * processes it into chunks, generates embeddings, and stores it
 * in the vector database for the RAG pipeline.
 */

import { configManager } from "../lib/config";
import { createProvidersFromConfig } from "../lib/providers/factory";
import { ChunkingService } from "../lib/services/chunking";
import { ValidationService } from "../lib/services/validation";
import { ScrapedContent, VectorDocument } from "../lib/types";

import fs from "fs";
import path from "path";

interface IngestionOptions {
  maxPages?: number;
  maxDepth?: number;
  delay?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  skipScraping?: boolean;
  skipEmbedding?: boolean;
  outputDir?: string;
  validateUrls?: boolean;
  verbose?: boolean;
}

class DataIngestionPipeline {
  private config = configManager.getConfig();
  private providers = createProvidersFromConfig(this.config);
  private chunkingService = new ChunkingService();
  private validationService = ValidationService.createDefault();
  private options: Required<IngestionOptions>;

  constructor(options: IngestionOptions = {}) {
    this.options = {
      maxPages: options.maxPages || this.config.scraper.maxPages,
      maxDepth: options.maxDepth || this.config.scraper.maxDepth,
      delay: options.delay || this.config.scraper.delay,
      chunkSize: options.chunkSize || this.config.rag.chunkSize,
      chunkOverlap: options.chunkOverlap || this.config.rag.chunkOverlap,
      skipScraping: options.skipScraping || false,
      skipEmbedding: options.skipEmbedding || false,
      outputDir: options.outputDir || "./data/ingestion",
      validateUrls: options.validateUrls || true,
      verbose: options.verbose || false,
    };

    // Ensure output directory exists
    this.ensureDirectoryExists(this.options.outputDir);
  }

  async run(): Promise<void> {
    console.log("🚀 Starting Chesapeake City data ingestion pipeline\n");
    console.log(`Base URL: ${this.config.scraper.baseUrl}`);
    console.log(`Max Pages: ${this.options.maxPages}`);
    console.log(`Max Depth: ${this.options.maxDepth}`);
    console.log(`Chunk Size: ${this.options.chunkSize}`);
    console.log(`Chunk Overlap: ${this.options.chunkOverlap}`);
    console.log("---\n");

    try {
      // Step 1: Scrape website content
      const scrapedContent = await this.scrapeContent();

      // Step 2: Validate scraped content
      const validatedContent = await this.validateContent(scrapedContent);

      // Step 3: Save raw content (optional)
      await this.saveRawContent(validatedContent);

      // Step 4: Chunk content
      const chunks = await this.chunkContent(validatedContent);

      // Step 5: Generate embeddings
      const documents = await this.generateEmbeddings(chunks);

      // Step 6: Store in vector database
      await this.storeInVectorDB(documents);

      // Step 7: Generate ingestion report
      await this.generateReport(scrapedContent, chunks, documents);

      console.log("\n✅ Data ingestion completed successfully!");
    } catch (error) {
      console.error("\n❌ Data ingestion failed:", error);
      process.exit(1);
    }
  }

  /**
   * Step 1: Scrape website content
   */
  private async scrapeContent(): Promise<ScrapedContent[]> {
    if (this.options.skipScraping) {
      console.log("⏭️ Skipping scraping (skipScraping flag is set)");
      const existingFiles = this.loadExistingScrapedContent();
      if (existingFiles.length > 0) {
        console.log(
          `📂 Loaded ${existingFiles.length} previously scraped files`,
        );
        return existingFiles;
      }
      throw new Error(
        "No previously scraped content found and scraping is disabled",
      );
    }

    console.log("🕸️  Step 1: Scraping website content...");

    // Extract sitemap URLs or use base URL
    const urls = await this.providers.scraper.extractSitemapUrls(
      this.config.scraper.baseUrl,
    );

    if (urls.length === 0) {
      console.log("⚠️  No URLs found in sitemap, using base URL only");
      urls.push(this.config.scraper.baseUrl);
    }

    console.log(`🔗 Found ${urls.length} URLs to scrape`);
    console.log(`📄 Limiting to ${this.options.maxPages} pages\n`);

    const scrapedContent: ScrapedContent[] = [];
    const scrapeOptions = {
      maxPages: this.options.maxPages,
      depth: 0,
      delay: this.options.delay,
    };

    // Scrape each URL
    for (let i = 0; i < Math.min(urls.length, this.options.maxPages); i++) {
      const url = urls[i];
      console.log(
        `  [${i + 1}/${Math.min(urls.length, this.options.maxPages)}] Scraping: ${url}`,
      );

      try {
        const content = await this.providers.scraper.scrape(url, scrapeOptions);
        scrapedContent.push(content);

        if (this.options.verbose) {
          console.log(`    ✓ Title: ${content.title}`);
          console.log(`    ✓ Sections: ${content.sections.length}`);
          console.log(
            `    ✓ Content length: ${content.content.length} characters`,
          );
        }
      } catch (error: any) {
        console.log(`    ✗ Failed to scrape ${url}: ${error.message}`);
      }
    }

    console.log(`\n✅ Scraped ${scrapedContent.length} pages successfully\n`);
    return scrapedContent;
  }

  /**
   * Step 2: Validate scraped content
   */
  private async validateContent(
    content: ScrapedContent[],
  ): Promise<ScrapedContent[]> {
    console.log("🔍 Step 2: Validating scraped content...");

    const validatedContent: ScrapedContent[] = [];
    let skippedCount = 0;

    for (const item of content) {
      // Basic validation
      if (!item.content || item.content.trim().length < 100) {
        console.log(
          `  ⚠️  Skipping ${item.url}: Content too short (${item.content?.length || 0} chars)`,
        );
        skippedCount++;
        continue;
      }

      if (!item.title || item.title === "Untitled Page") {
        console.log(`  ⚠️  ${item.url}: Missing or generic title`);
      }

      // URL validation if enabled
      if (this.options.validateUrls) {
        try {
          const validation = await this.validationService.validateUrl(
            item.url,
            {
              checkUrlStatus: false,
              trustKnowledgeBase: true,
            },
          );

          if (!validation.valid && this.options.verbose) {
            console.log(
              `  ⚠️  URL validation warnings for ${item.url}:`,
              validation.warnings,
            );
          }
        } catch (error) {
          // Continue even if validation fails
        }
      }

      validatedContent.push(item);
    }

    console.log(
      `\n✅ Validated ${validatedContent.length} pages (skipped ${skippedCount})\n`,
    );
    return validatedContent;
  }

  /**
   * Step 3: Save raw content (optional)
   */
  private async saveRawContent(content: ScrapedContent[]): Promise<void> {
    console.log("💾 Step 3: Saving raw content...");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = path.join(
      this.options.outputDir,
      `raw-content-${timestamp}.json`,
    );

    const saveData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.config.scraper.baseUrl,
      totalPages: content.length,
      pages: content.map((item) => ({
        url: item.url,
        title: item.title,
        contentLength: item.content.length,
        sections: item.sections.length,
        metadata: item.metadata,
      })),
    };

    fs.writeFileSync(outputFile, JSON.stringify(saveData, null, 2));
    console.log(`  📄 Saved metadata to: ${outputFile}`);

    // Save full content if verbose mode
    if (this.options.verbose) {
      const fullContentFile = path.join(
        this.options.outputDir,
        `full-content-${timestamp}.json`,
      );
      fs.writeFileSync(fullContentFile, JSON.stringify(content, null, 2));
      console.log(`  📄 Saved full content to: ${fullContentFile}`);
    }

    console.log("");
  }

  /**
   * Step 4: Chunk content
   */
  private async chunkContent(
    content: ScrapedContent[],
  ): Promise<VectorDocument[]> {
    console.log("✂️  Step 4: Chunking content...");

    const chunkingService = new ChunkingService({
      chunkSize: this.options.chunkSize,
      chunkOverlap: this.options.chunkOverlap,
    });

    const allChunks: VectorDocument[] = [];
    let totalChunks = 0;

    for (const item of content) {
      const result = chunkingService.chunkContent(item);
      const documents = chunkingService.chunksToVectorDocuments(result.chunks);

      allChunks.push(...documents);
      totalChunks += result.chunks.length;

      if (this.options.verbose) {
        console.log(`  ${item.title}:`);
        console.log(`    → Chunks: ${result.chunks.length}`);
        console.log(
          `    → Avg size: ${result.statistics.averageChunkSize} chars`,
        );
        console.log(`    → Total chars: ${result.statistics.totalCharacters}`);
      }
    }

    console.log(
      `\n✅ Created ${totalChunks} chunks from ${content.length} pages\n`,
    );
    return allChunks;
  }

  /**
   * Step 5: Generate embeddings
   */
  private async generateEmbeddings(
    documents: VectorDocument[],
  ): Promise<VectorDocument[]> {
    if (this.options.skipEmbedding) {
      console.log(
        "⏭️ Skipping embedding generation (skipEmbedding flag is set)",
      );
      console.log("  ⚠️  Documents will be stored without embeddings");
      return documents;
    }

    console.log("🧠 Step 5: Generating embeddings...");
    console.log(`  Generating embeddings for ${documents.length} chunks...`);

    try {
      // Extract text content from documents
      const texts = documents.map((doc) => doc.content);

      // Generate embeddings in batches
      const embeddingResult =
        await this.providers.embeddings.generateEmbeddings(texts);

      // Add embeddings to documents
      const documentsWithEmbeddings = documents.map((doc, index) => ({
        ...doc,
        embedding: embeddingResult.embeddings[index],
      }));

      console.log(
        `  ✅ Generated ${embeddingResult.embeddings.length} embeddings`,
      );
      console.log(
        `  📊 Embedding dimension: ${embeddingResult.embeddings[0]?.length || "unknown"}`,
      );

      if (embeddingResult.usage?.tokens) {
        console.log(`  📈 Tokens used: ${embeddingResult.usage.tokens}`);
      }

      console.log("");
      return documentsWithEmbeddings;
    } catch (error: any) {
      console.error(`  ❌ Failed to generate embeddings: ${error.message}`);
      console.log("  ⚠️  Continuing without embeddings...");
      return documents;
    }
  }

  /**
   * Step 6: Store in vector database
   */
  private async storeInVectorDB(documents: VectorDocument[]): Promise<void> {
    console.log("🗄️  Step 6: Storing in vector database...");

    // Initialize vector store
    await this.providers.vectorStore.initialize();

    // Clear existing data (optional - for fresh ingestion)
    console.log("  Clearing existing documents...");
    await this.providers.vectorStore.clear();

    // Store documents in batches
    console.log(`  Storing ${documents.length} documents...`);

    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.providers.vectorStore.addDocuments(batch);

      if (this.options.verbose) {
        console.log(
          `    Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`,
        );
      }
    }

    // Verify storage
    const documentCount = await this.providers.vectorStore.getDocumentCount();
    console.log(`\n✅ Stored ${documentCount} documents in vector database\n`);
  }

  /**
   * Step 7: Generate ingestion report
   */
  private async generateReport(
    scrapedContent: ScrapedContent[],
    chunks: VectorDocument[],
    documents: VectorDocument[],
  ): Promise<void> {
    console.log("📊 Step 7: Generating ingestion report...");

    const timestamp = new Date().toISOString();
    const report = {
      ingestionDate: timestamp,
      configuration: {
        baseUrl: this.config.scraper.baseUrl,
        maxPages: this.options.maxPages,
        maxDepth: this.options.maxDepth,
        chunkSize: this.options.chunkSize,
        chunkOverlap: this.options.chunkOverlap,
      },
      statistics: {
        pagesScraped: scrapedContent.length,
        chunksCreated: chunks.length,
        documentsStored: documents.length,
        documentsWithEmbeddings: documents.filter((d) => d.embedding).length,
        uniqueDomains: this.extractUniqueDomains(scrapedContent),
      },
      pages: scrapedContent.map((page) => ({
        url: page.url,
        title: page.title,
        contentLength: page.content.length,
        sections: page.sections.length,
        lastModified: page.metadata.lastModified,
      })),
    };

    const reportFile = path.join(
      this.options.outputDir,
      `ingestion-report-${timestamp.replace(/[:.]/g, "-")}.json`,
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(`  📄 Report saved to: ${reportFile}`);

    // Print summary
    console.log("\n📈 INGESTION SUMMARY:");
    console.log("====================");
    console.log(`Pages scraped:       ${report.statistics.pagesScraped}`);
    console.log(`Chunks created:      ${report.statistics.chunksCreated}`);
    console.log(`Documents stored:    ${report.statistics.documentsStored}`);
    console.log(
      `With embeddings:     ${report.statistics.documentsWithEmbeddings}`,
    );
    console.log(`Unique domains:      ${report.statistics.uniqueDomains.size}`);
    console.log("");
  }

  /**
   * Utility: Extract unique domains from scraped content
   */
  private extractUniqueDomains(content: ScrapedContent[]): Set<string> {
    const domains = new Set<string>();

    for (const item of content) {
      try {
        const url = new URL(item.url);
        domains.add(url.hostname);
      } catch (error) {
        // Ignore invalid URLs
      }
    }

    return domains;
  }

  /**
   * Utility: Ensure directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Utility: Load existing scraped content from files
   */
  private loadExistingScrapedContent(): ScrapedContent[] {
    const files = fs
      .readdirSync(this.options.outputDir)
      .filter(
        (file) => file.startsWith("full-content-") && file.endsWith(".json"),
      )
      .sort()
      .reverse(); // Most recent first

    if (files.length === 0) {
      return [];
    }

    try {
      const mostRecentFile = path.join(this.options.outputDir, files[0]);
      const content = JSON.parse(fs.readFileSync(mostRecentFile, "utf8"));
      return Array.isArray(content) ? content : [];
    } catch (error) {
      console.error(`Failed to load scraped content: ${error}`);
      return [];
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options: IngestionOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--max-pages":
        options.maxPages = parseInt(args[++i], 10);
        break;
      case "--max-depth":
        options.maxDepth = parseInt(args[++i], 10);
        break;
      case "--chunk-size":
        options.chunkSize = parseInt(args[++i], 10);
        break;
      case "--chunk-overlap":
        options.chunkOverlap = parseInt(args[++i], 10);
        break;
      case "--skip-scraping":
        options.skipScraping = true;
        break;
      case "--skip-embedding":
        options.skipEmbedding = true;
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
      case "--no-validate":
        options.validateUrls = false;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        return;
    }
  }

  const pipeline = new DataIngestionPipeline(options);
  await pipeline.run();
}

function printHelp() {
  console.log(`
Data Ingestion Script for Chesapeake City Chatbot

Usage:
  npm run ingest [options]

Options:
  --max-pages <number>    Maximum number of pages to scrape (default: 20)
  --max-depth <number>    Maximum depth for crawling (default: 2)
  --chunk-size <number>   Character size for chunks (default: 512)
  --chunk-overlap <number> Overlap between chunks (default: 50)
  --skip-scraping         Skip scraping, use existing data
  --skip-embedding        Skip embedding generation
  --output-dir <path>     Output directory for data (default: ./data/ingestion)
  --no-validate           Skip URL validation
  --verbose, -v          Enable verbose logging
  --help, -h             Show this help message

Environment Variables:
  LLM_API_KEY            DeepSeek API key for embeddings
  EMBEDDING_API_KEY      DeepSeek API key for embeddings (fallback to LLM_API_KEY)
  DATABASE_URL           Vector database connection string

Example:
  npm run ingest -- --max-pages 50 --chunk-size 256 --verbose
  npm run ingest -- --skip-scraping --skip-embedding

Notes:
  - The script will scrape the Chesapeake City website by default
  - Generated embeddings will be stored in the vector database
  - Raw content and reports are saved in the output directory
  `);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { type IngestionOptions, DataIngestionPipeline };
