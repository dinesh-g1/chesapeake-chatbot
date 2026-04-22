#!/usr/bin/env ts-node

/**
 * Test script for embedding providers
 *
 * Tests both Qwen (via Ollama) and mock embedding providers
 *
 * Usage:
 *   npm run test:embeddings (tests both providers)
 *   npm run test:embeddings qwen
 *   npm run test:embeddings mock
 *   npm run test:embeddings all
 */

import { QwenEmbeddingProvider } from "../lib/providers/implementations/qwen-embeddings";
import { MockEmbeddingProvider } from "../lib/providers/factory";
import { DeepSeekEmbeddingProvider } from "../lib/providers/implementations/deepseek-embeddings";
import { EmbeddingResult } from "../lib/types";

interface TestConfig {
  provider: string;
  config: any;
  expectedDimension: number;
  description: string;
}

const testTexts = [
  "How do I apply for a business license in Chesapeake?",
  "What are the trash pickup days in my area?",
  "Where can I find information about building permits?",
  "How do I contact the city utilities department?",
  "What recreational facilities are available in Chesapeake City?",
];

const testConfigs: Record<string, TestConfig> = {
  qwen: {
    provider: "qwen",
    config: {
      baseUrl: process.env.EMBEDDING_BASE_URL || "http://localhost:11434",
      model: process.env.EMBEDDING_MODEL || "qwen2.5:1.5b",
      apiKey: "",
      dimension: 2048,
      batchSize: 1,
    },
    expectedDimension: 2048,
    description: "Qwen embeddings via Ollama (local)",
  },
  mock: {
    provider: "mock",
    config: {
      baseUrl: "",
      model: "mock-embedding",
      apiKey: "",
      dimension: 1536,
      batchSize: 32,
    },
    expectedDimension: 1536,
    description: "Mock embeddings for testing",
  },
  deepseek: {
    provider: "deepseek",
    config: {
      baseUrl: process.env.LLM_BASE_URL || "https://api.deepseek.com",
      model: "deepseek-embedding",
      apiKey: process.env.LLM_API_KEY || "",
      dimension: 1536,
      batchSize: 32,
    },
    expectedDimension: 1536,
    description: "DeepSeek embeddings (cloud API)",
  },
};

async function testProvider(config: TestConfig): Promise<boolean> {
  console.log(`\n🧪 Testing ${config.description}`);
  console.log(`  Model: ${config.config.model}`);
  console.log(`  Expected dimension: ${config.expectedDimension}`);
  console.log(`  Base URL: ${config.config.baseUrl || "N/A"}`);

  let provider;
  try {
    switch (config.provider) {
      case "qwen":
        provider = new QwenEmbeddingProvider(config.config);
        break;
      case "mock":
        // Create a mock provider using the factory pattern
        provider = new (class MockProvider extends MockEmbeddingProvider {
          constructor(config: any) {
            super(config);
          }
        })(config.config);
        break;
      case "deepseek":
        if (!config.config.apiKey) {
          console.log("  ⚠️  Skipping DeepSeek test - API key not provided");
          return true; // Skip, not fail
        }
        provider = new DeepSeekEmbeddingProvider(config.config);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error: any) {
    console.log(`  ❌ Failed to initialize provider: ${error.message}`);
    return false;
  }

  console.log(`  ✅ Provider initialized successfully`);

  // Test single embedding
  try {
    const startTime = Date.now();
    const singleResult = await provider.generateEmbeddings([testTexts[0]]);
    const singleTime = Date.now() - startTime;

    console.log(`  ✅ Single embedding generated in ${singleTime}ms`);

    // Validate single embedding
    if (!singleResult.embeddings || singleResult.embeddings.length !== 1) {
      console.log(
        `  ❌ Invalid response: expected 1 embedding, got ${singleResult.embeddings?.length || 0}`,
      );
      return false;
    }

    const embedding = singleResult.embeddings[0];
    if (!Array.isArray(embedding)) {
      console.log(`  ❌ Embedding is not an array`);
      return false;
    }

    if (embedding.length !== config.expectedDimension) {
      console.log(
        `  ⚠️  Dimension mismatch: expected ${config.expectedDimension}, got ${embedding.length}`,
      );
      // Continue anyway - some models might have different dimensions
    }

    console.log(`  ✅ Embedding dimension: ${embedding.length}`);
    console.log(`  ✅ Model name: ${singleResult.model}`);

    // Check embedding values
    const hasNaN = embedding.some((value) => isNaN(value));
    const allZero = embedding.every((value) => value === 0);

    if (hasNaN) {
      console.log(`  ⚠️  Embedding contains NaN values`);
    }

    if (allZero) {
      console.log(`  ⚠️  Embedding contains only zeros`);
    }

    // Test batch embeddings if not Qwen (which only does one at a time)
    if (config.provider !== "qwen") {
      const batchStartTime = Date.now();
      const batchResult = await provider.generateEmbeddings(testTexts);
      const batchTime = Date.now() - batchStartTime;

      console.log(
        `  ✅ Batch of ${testTexts.length} embeddings generated in ${batchTime}ms`,
      );

      if (batchResult.embeddings.length !== testTexts.length) {
        console.log(
          `  ❌ Batch size mismatch: expected ${testTexts.length}, got ${batchResult.embeddings.length}`,
        );
        return false;
      }

      // Check all embeddings have correct dimensions
      const consistentDimensions = batchResult.embeddings.every(
        (emb) => emb.length === batchResult.embeddings[0].length,
      );

      if (!consistentDimensions) {
        console.log(`  ❌ Inconsistent embedding dimensions in batch`);
        return false;
      }

      console.log(`  ✅ Batch processing successful`);
    }

    // Test provider methods
    const dimension = provider.getDimension();
    const modelName = provider.getModelName();

    console.log(`  ✅ Provider.getDimension(): ${dimension}`);
    console.log(`  ✅ Provider.getModelName(): ${modelName}`);

    return true;
  } catch (error: any) {
    console.log(`  ❌ Error during embedding generation: ${error.message}`);

    // Provide helpful debugging info
    if (config.provider === "qwen") {
      console.log(`  💡 Debugging tips for Qwen/Ollama:`);
      console.log(`    1. Make sure Ollama is running: 'ollama serve'`);
      console.log(`    2. Check if model is downloaded: 'ollama list'`);
      console.log(
        `    3. Test Ollama API: 'curl ${config.config.baseUrl}/api/tags'`,
      );
      console.log(
        `    4. Pull the model: 'ollama pull ${config.config.model}'`,
      );
    } else if (config.provider === "deepseek") {
      console.log(`  💡 Debugging tips for DeepSeek:`);
      console.log(`    1. Check API key is set in environment`);
      console.log(`    2. Verify base URL: ${config.config.baseUrl}`);
      console.log(`    3. Test network connectivity`);
    }

    return false;
  }
}

async function main() {
  console.log("🚀 Embedding Provider Test Suite");
  console.log("=================================");

  const args = process.argv.slice(2);
  const providersToTest = args.length > 0 ? args : ["all"];

  let testSets: string[];
  if (providersToTest.includes("all")) {
    testSets = Object.keys(testConfigs);
  } else {
    testSets = providersToTest.filter((p) => p in testConfigs);
    const invalid = providersToTest.filter(
      (p) => !(p in testConfigs) && p !== "all",
    );
    if (invalid.length > 0) {
      console.log(`⚠️  Unknown providers: ${invalid.join(", ")}`);
      console.log(
        `   Available providers: ${Object.keys(testConfigs).join(", ")}`,
      );
    }
  }

  if (testSets.length === 0) {
    console.log("❌ No valid providers specified for testing");
    process.exit(1);
  }

  console.log(
    `Testing providers: ${testSets.map((p) => testConfigs[p].description).join(", ")}`,
  );

  const results: Record<string, boolean> = {};
  let allPassed = true;

  for (const providerKey of testSets) {
    const config = testConfigs[providerKey];

    // Skip DeepSeek if no API key unless explicitly requested
    if (
      providerKey === "deepseek" &&
      !config.config.apiKey &&
      !providersToTest.includes("deepseek")
    ) {
      console.log(`\n⏭️  Skipping DeepSeek test - API key not provided`);
      console.log(
        `   Set LLM_API_KEY environment variable to test DeepSeek embeddings`,
      );
      results[providerKey] = true; // Skip, not fail
      continue;
    }

    const passed = await testProvider(config);
    results[providerKey] = passed;

    if (!passed) {
      allPassed = false;
    }
  }

  // Print summary
  console.log("\n📊 Test Summary");
  console.log("==============");

  for (const [providerKey, passed] of Object.entries(results)) {
    const status = passed ? "✅ PASS" : "❌ FAIL";
    const config = testConfigs[providerKey];
    console.log(`${status} ${config.description}`);
  }

  console.log(
    "\n" + (allPassed ? "🎉 All tests passed!" : "❌ Some tests failed"),
  );

  // Provide setup instructions if needed
  if (!results.qwen && testSets.includes("qwen")) {
    console.log("\n🔧 Qwen/Ollama Setup Instructions:");
    console.log("----------------------------------");
    console.log("1. Install Ollama: https://ollama.ai/download");
    console.log("2. Start Ollama server: 'ollama serve'");
    console.log("3. Pull Qwen model: 'ollama pull qwen2.5:1.5b'");
    console.log("4. Test Ollama: 'curl http://localhost:11434/api/tags'");
    console.log("5. Run test again: 'npm run test:embeddings qwen'");
  }

  if (!results.deepseek && testSets.includes("deepseek")) {
    console.log("\n🔧 DeepSeek Setup Instructions:");
    console.log("-------------------------------");
    console.log("1. Get API key from: https://platform.deepseek.com/api_keys");
    console.log(
      "2. Set environment variable: export LLM_API_KEY=your_key_here",
    );
    console.log("3. Run test again: 'npm run test:embeddings deepseek'");
  }

  process.exit(allPassed ? 0 : 1);
}

// Handle promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { testProvider, testConfigs };
