import {
  AppConfig,
  EnvironmentVariables,
  ValidationResult,
  DeepPartial,
} from "./types";

/**
 * Default configuration for the Chesapeake City Agentic AI Chatbot
 */
export const defaultConfig: AppConfig = {
  llm: {
    provider: "deepseek" as const,
    model: "deepseek-chat",
    apiKey: process.env.LLM_API_KEY || "",
    baseUrl: process.env.LLM_BASE_URL || "https://api.deepseek.com",
    temperature: 0.7,
    maxTokens: 4000, // Increased for comprehensive responses with sources
    timeout: 30000,
  },
  embeddings: {
    provider: "qwen" as const,
    model: "qwen2.5:1.5b",
    apiKey: "", // No API key needed for local Ollama
    baseUrl: process.env.EMBEDDING_BASE_URL || "http://localhost:11434",
    dimension: 2048, // Qwen2.5-1.5B embeddings dimension
    batchSize: 1, // Ollama processes one at a time
  },
  vectorStore: {
    provider: "sqlite" as const, // Using SQLite for demo, can be upgraded to Supabase/Pinecone
    connectionString:
      process.env.DATABASE_URL || "sqlite://./data/vector_store.db",
    collectionName: "chesapeake_documents",
    tableName: "vectors",
    dimension: 2048, // Match Qwen2.5-1.5B dimension
  },
  scraper: {
    provider: "cheerio" as const,
    baseUrl: "https://www.cityofchesapeake.net",
    maxDepth: 2,
    maxPages: 20,
    delay: 1000,
    respectRobotsTxt: true,
    userAgent:
      "ChesapeakeCityAgenticAIChatbot/1.0 (+https://cityofchesapeake.net)",
  },
  rag: {
    chunkSize: 512,
    chunkOverlap: 50,
    topK: 5,
    scoreThreshold: 0.7,
    contextWindow: 5,
    systemPrompt: `# AGENTIC AI CHATBOT SYSTEM PROMPT
## Chesapeake City Government Assistant - Powered by Agentic AI

### CORE IDENTITY
You are the Chesapeake City Agentic AI Chatbot, an advanced AI assistant specifically designed to serve Chesapeake City residents, businesses, and visitors. You leverage Agentic AI capabilities to provide intelligent, proactive, and comprehensive assistance.

### PRIMARY MISSION
Provide accurate, timely, and helpful information about Chesapeake City government services, departments, programs, events, and regulations while demonstrating the power of Agentic AI technology.

### ABSOLUTE RULES - NO DEAD ENDS
1. **NEVER SAY "I DON'T KNOW"** - Instead, provide actionable alternatives:
   - "Based on the available Chesapeake City information, I recommend..."
   - "While I don't have specific details on that, here are related services..."
   - "For that specific inquiry, you should contact [Department] at [Contact Info]"

2. **ALWAYS PROVIDE NEXT STEPS** - Every response must include at least one actionable next step:
   - Suggest relevant forms, applications, or online services
   - Provide contact information for relevant departments
   - Recommend visiting specific website sections
   - Suggest related services or information

3. **CONTEXT-AWARE RESPONSES** - Use conversation history to provide continuity and personalized guidance.

### INFORMATION SOURCES POLICY
1. **PRIMARY SOURCE**: Chesapeake City official website (cityofchesapeake.net)
2. **CITATION REQUIRED**: Always reference specific sources when providing information
3. **ACCURACY FOCUS**: Prioritize accuracy over completeness - better to redirect than provide uncertain information

### RESPONSE STRUCTURE TEMPLATE
[MAIN ANSWER] - Clear, concise answer to the question

[DETAILED INFORMATION] - Additional context, requirements, or explanations

[ACTIONABLE STEPS] - Numbered or bulleted list of what to do next

[RELATED SERVICES] - Other city services that might be relevant

[CONTACT INFORMATION] - Specific department contacts with phone/email

[AGENTIC AI NOTE] - Brief mention of how Agentic AI enhances this service

### CHESAPEAKE-SPECIFIC GUIDANCE
1. **DEPARTMENT AWARENESS**: Know key departments (Police, Fire, Utilities, Public Works, Planning, etc.)
2. **SERVICE CATEGORIES**: Be familiar with permit applications, utility services, public safety, recreation, etc.
3. **LOCAL CONTEXT**: Understand Chesapeake's geographic location, population, and unique characteristics
4. **EMERGENCY PROCEDURES**: Know when to direct to emergency services vs regular departments

### AGENTIC AI CAPABILITIES DEMONSTRATION
1. **PROACTIVE SUGGESTIONS**: Anticipate follow-up questions and provide them
2. **MULTI-STEP GUIDANCE**: Break complex processes into manageable steps
3. **CONTEXT RETENTION**: Remember previous conversation points for continuity
4. **INTELLIGENT ROUTING**: Guide users to the most appropriate resources

### FORMATTING REQUIREMENTS
1. **CLARITY**: Use clear headings, bullet points, and numbered lists
2. **SCANNABILITY**: Important information should be easy to find quickly
3. **PROFESSIONAL TONE**: Government-appropriate language - helpful but formal
4. **ACCESSIBILITY**: Consider diverse user needs in response structure

### EXAMPLES OF EXCELLENT RESPONSES
Q: "How do I get a business license?"
A: [Clear process overview] → [Required documents] → [Online application link] → [Contact for questions] → [Related permits needed]

Q: "When is trash pickup?"
A: [Schedule information] → [Holiday exceptions] → [Bulk pickup details] → [Recycling guidelines] → [App download suggestion]

### FALLBACK STRATEGIES
1. **PARTIAL INFORMATION**: Provide what you know + how to get the rest
2. **REDIRECTION**: Guide to appropriate department or website section
3. **FOLLOW-UP OFFER**: Suggest specific questions to ask the department
4. **ALTERNATIVE CHANNELS**: Provide phone, email, and in-person options

### MARKETING ELEMENTS (SUBTLY INTEGRATED)
- Mention "Agentic AI" when explaining complex reasoning
- Highlight efficiency gains from AI assistance
- Note 24/7 availability compared to office hours
- Emphasize comprehensive information access

Remember: You are demonstrating the future of citizen-government interaction through Agentic AI technology. Every interaction should leave the user impressed with both the helpfulness and the technological sophistication.`,
    includeSources: true,
  },
  chat: {
    maxHistoryLength: 20,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    enableSuggestions: true,
    enableStreaming: true,
    defaultTemperature: 0.7,
  },
  deployment: {
    environment:
      (process.env.NODE_ENV as "development" | "production") || "development",
    apiUrl: process.env.API_URL || "http://localhost:3000",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    enableAnalytics: false,
    enableLogging: true,
    logLevel:
      (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  },
};

/**
 * Parse environment variables into configuration
 */
function parseEnvironmentVariables(): DeepPartial<AppConfig> {
  const env = process.env;

  const config: DeepPartial<AppConfig> = {};

  // LLM Configuration
  if (env.LLM_PROVIDER) {
    config.llm = config.llm || {};
    config.llm.provider = env.LLM_PROVIDER as any;
  }
  if (env.LLM_MODEL) {
    config.llm = config.llm || {};
    config.llm.model = env.LLM_MODEL;
  }
  if (env.LLM_API_KEY) {
    config.llm = config.llm || {};
    config.llm.apiKey = env.LLM_API_KEY;
  }
  if (env.LLM_BASE_URL) {
    config.llm = config.llm || {};
    config.llm.baseUrl = env.LLM_BASE_URL;
  }

  // Embeddings Configuration
  if (env.EMBEDDING_PROVIDER) {
    config.embeddings = config.embeddings || {};
    config.embeddings.provider = env.EMBEDDING_PROVIDER as any;
  }
  if (env.EMBEDDING_MODEL) {
    config.embeddings = config.embeddings || {};
    config.embeddings.model = env.EMBEDDING_MODEL;
  }
  if (env.EMBEDDING_API_KEY) {
    config.embeddings = config.embeddings || {};
    config.embeddings.apiKey = env.EMBEDDING_API_KEY;
  }
  if (env.EMBEDDING_BASE_URL) {
    config.embeddings = config.embeddings || {};
    config.embeddings.baseUrl = env.EMBEDDING_BASE_URL;
  }

  // Vector Store Configuration
  if (env.VECTOR_STORE_PROVIDER) {
    config.vectorStore = config.vectorStore || {};
    config.vectorStore.provider = env.VECTOR_STORE_PROVIDER as any;
  }
  if (env.SUPABASE_URL) {
    config.vectorStore = config.vectorStore || {};
    config.vectorStore.connectionString = env.SUPABASE_URL;
  }
  if (env.SUPABASE_KEY) {
    config.vectorStore = config.vectorStore || {};
    config.vectorStore.apiKey = env.SUPABASE_KEY;
  }
  if (env.PINECONE_API_KEY) {
    config.vectorStore = config.vectorStore || {};
    config.vectorStore.apiKey = env.PINECONE_API_KEY;
  }

  // Scraper Configuration
  if (env.SCRAPER_BASE_URL) {
    config.scraper = config.scraper || {};
    config.scraper.baseUrl = env.SCRAPER_BASE_URL;
  }
  if (env.SCRAPER_MAX_PAGES) {
    config.scraper = config.scraper || {};
    config.scraper.maxPages = parseInt(env.SCRAPER_MAX_PAGES, 10);
  }
  if (env.SCRAPER_DELAY) {
    config.scraper = config.scraper || {};
    config.scraper.delay = parseInt(env.SCRAPER_DELAY, 10);
  }

  // Deployment Configuration
  if (env.NODE_ENV) {
    config.deployment = config.deployment || {};
    config.deployment.environment = env.NODE_ENV as any;
  }
  if (env.API_URL) {
    config.deployment = config.deployment || {};
    config.deployment.apiUrl = env.API_URL;
  }
  if (env.FRONTEND_URL) {
    config.deployment = config.deployment || {};
    config.deployment.frontendUrl = env.FRONTEND_URL;
  }
  if (env.LOG_LEVEL) {
    config.deployment = config.deployment || {};
    config.deployment.logLevel = env.LOG_LEVEL as any;
  }

  return config;
}

/**
 * Merge configurations with deep merge
 */
function mergeConfig(
  base: AppConfig,
  override: DeepPartial<AppConfig>,
): AppConfig {
  const result = JSON.parse(JSON.stringify(base)) as AppConfig;

  function deepMerge(target: any, source: any) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
  }

  deepMerge(result, override);
  return result;
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): ValidationResult {
  const errors: string[] = [];

  // Validate LLM configuration
  if (
    config.llm.provider === "openai" ||
    config.llm.provider === "deepseek" ||
    config.llm.provider === "anthropic"
  ) {
    if (!config.llm.apiKey) {
      errors.push(`LLM provider ${config.llm.provider} requires an API key`);
    }
  }

  // Validate embeddings configuration
  if (
    config.embeddings.provider === "openai" ||
    config.embeddings.provider === "deepseek"
  ) {
    if (!config.embeddings.apiKey) {
      errors.push(
        `Embeddings provider ${config.embeddings.provider} requires an API key`,
      );
    }
  }

  // Validate vector store configuration
  if (config.vectorStore.provider === "supabase") {
    if (!config.vectorStore.connectionString && !config.vectorStore.apiKey) {
      errors.push(
        "Supabase vector store requires either connectionString or apiKey",
      );
    }
  }

  if (config.vectorStore.provider === "pinecone") {
    if (!config.vectorStore.apiKey) {
      errors.push("Pinecone vector store requires an API key");
    }
  }

  // Validate scraper configuration
  if (!config.scraper.baseUrl) {
    errors.push("Scraper base URL is required");
  }

  if (config.scraper.maxPages <= 0) {
    errors.push("Scraper maxPages must be greater than 0");
  }

  // Validate RAG configuration
  if (config.rag.chunkSize <= 0) {
    errors.push("RAG chunkSize must be greater than 0");
  }

  if (config.rag.chunkOverlap < 0) {
    errors.push("RAG chunkOverlap must be non-negative");
  }

  if (config.rag.chunkOverlap >= config.rag.chunkSize) {
    errors.push("RAG chunkOverlap must be less than chunkSize");
  }

  if (config.rag.topK <= 0) {
    errors.push("RAG topK must be greater than 0");
  }

  // Validate chat configuration
  if (config.chat.maxHistoryLength <= 0) {
    errors.push("Chat maxHistoryLength must be greater than 0");
  }

  if (config.chat.sessionTimeout <= 0) {
    errors.push("Chat sessionTimeout must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get application configuration
 */
export function getConfig(override?: DeepPartial<AppConfig>): AppConfig {
  // Start with default configuration
  let config = { ...defaultConfig };

  // Apply environment variables
  const envConfig = parseEnvironmentVariables();
  config = mergeConfig(config, envConfig);

  // Apply any manual overrides
  if (override) {
    config = mergeConfig(config, override);
  }

  // Validate the final configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn("Configuration validation warnings:", validation.errors);

    // For demo purposes, we'll allow some warnings but not critical errors
    const criticalErrors = validation.errors.filter(
      (error) =>
        error.includes("required") ||
        error.includes("must be greater than 0") ||
        error.includes("must be non-negative"),
    );

    if (criticalErrors.length > 0) {
      throw new Error(
        `Configuration validation failed: ${criticalErrors.join(", ")}`,
      );
    }
  }

  return config;
}

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(
  environment: "development" | "production",
): AppConfig {
  const baseConfig = getConfig();

  const environmentOverrides: Record<string, DeepPartial<AppConfig>> = {
    development: {
      deployment: {
        environment: "development",
        enableLogging: true,
        logLevel: "debug",
      },
      llm: {
        timeout: 60000, // Longer timeout for development
      },
    },
    production: {
      deployment: {
        environment: "production",
        enableLogging: true,
        logLevel: "warn",
        enableAnalytics: true,
      },
      llm: {
        temperature: 0.5, // More conservative in production
        maxTokens: 3000, // Slightly lower in production for cost control
      },
      rag: {
        scoreThreshold: 0.75, // Higher threshold for production
      },
    },
  };

  return mergeConfig(baseConfig, environmentOverrides[environment] || {});
}

/**
 * Configuration manager singleton
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = getConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public updateConfig(override: DeepPartial<AppConfig>): AppConfig {
    this.config = mergeConfig(this.config, override);
    return this.config;
  }

  public reloadConfig(): AppConfig {
    this.config = getConfig();
    return this.config;
  }
}

export const configManager = ConfigManager.getInstance();

// Export for convenience
export default configManager;
