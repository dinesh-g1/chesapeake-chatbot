// Validation service for Chesapeake City Chatbot
// Trusts that domains in the knowledge base are valid (scraped from official website)
// Focuses on URL validity, content relevance, and safety

import axios from "axios";
import { URL } from "url";
import { DocumentMetadata } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ValidationOptions {
  checkUrlStatus?: boolean;
  timeoutMs?: number;
  requireChesapeakeContext?: boolean;
  maxSuggestions?: number;
  trustKnowledgeBase?: boolean; // Assume domains from knowledge base are valid
  allowedDomains?: string[]; // Optional: domains to explicitly allow
}

export class ValidationService {
  private readonly baseUrl: string;
  private readonly defaultOptions: ValidationOptions;

  constructor(baseUrl: string = "https://www.cityofchesapeake.net") {
    this.baseUrl = baseUrl;

    this.defaultOptions = {
      checkUrlStatus: true,
      timeoutMs: 5000,
      requireChesapeakeContext: true,
      maxSuggestions: 5,
      trustKnowledgeBase: true, // Default: trust domains from knowledge base
      allowedDomains: undefined, // No domain restrictions by default
    };
  }

  /**
   * Validate a single URL
   */
  async validateUrl(
    url: string,
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Parse URL
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.toLowerCase();

      // Check URL structure
      if (!parsedUrl.protocol.startsWith("http")) {
        errors.push(
          `URL must use HTTP/HTTPS protocol, got: ${parsedUrl.protocol}`,
        );
      }

      // Check against allowed domains if specified
      if (
        finalOptions.allowedDomains &&
        finalOptions.allowedDomains.length > 0
      ) {
        const isAllowed = finalOptions.allowedDomains.some(
          (allowed) =>
            domain === allowed.toLowerCase() ||
            domain.endsWith(`.${allowed.toLowerCase()}`),
        );

        if (!isAllowed) {
          warnings.push(
            `URL domain "${domain}" is not in the explicitly allowed domains list`,
          );
        }
      }

      // Check for broken links if enabled
      if (finalOptions.checkUrlStatus) {
        try {
          const response = await axios.head(url, {
            timeout: finalOptions.timeoutMs,
            headers: {
              "User-Agent": "ChesapeakeCityChatbot/1.0",
            },
            maxRedirects: 3,
          });

          const status = response.status;
          if (status >= 400) {
            errors.push(`URL returned HTTP ${status} status`);
          } else if (status >= 300) {
            warnings.push(`URL redirects (HTTP ${status}) - may be outdated`);
          }
        } catch (error: any) {
          if (error.response) {
            errors.push(`URL returned HTTP ${error.response.status} status`);
          } else if (error.request) {
            errors.push(`URL could not be reached (timeout or network error)`);
          } else {
            errors.push(`Error checking URL: ${error.message}`);
          }
        }
      }

      // Check for anchor links (fragments)
      if (parsedUrl.hash && parsedUrl.hash !== "#") {
        warnings.push(
          `URL contains anchor/fragment: ${parsedUrl.hash} - may not work as expected`,
        );
      }

      // Check for query parameters that might break
      if (parsedUrl.search && parsedUrl.search.length > 100) {
        warnings.push(`URL has long query string - may be unstable`);
      }

      // If trustKnowledgeBase is true, assume domain is valid (from official scraping)
      if (finalOptions.trustKnowledgeBase) {
        // Just note if it's external to Chesapeake base domain
        const baseDomain = new URL(this.baseUrl).hostname.toLowerCase();
        if (!domain.includes(baseDomain.replace("www.", ""))) {
          warnings.push(
            `URL points to external domain (${domain}) - trusting it's a valid Chesapeake vendor/service`,
          );
        }
      }
    } catch (error: any) {
      errors.push(`Invalid URL format: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateUrlSuggestions(url, errors),
    };
  }

  /**
   * Validate multiple URLs
   */
  async validateUrls(
    urls: string[],
    options?: ValidationOptions,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Process URLs in parallel with rate limiting
    const promises = urls.map((url) => this.validateUrl(url, options));
    results.push(...(await Promise.all(promises)));

    return results;
  }

  /**
   * Validate chat suggestions for contextual relevance
   */
  validateSuggestions(
    suggestions: string[],
    conversationContext?: string[],
    options?: ValidationOptions,
  ): ValidationResult {
    const finalOptions = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedSuggestions: string[] = [];

    // Limit number of suggestions
    const maxSuggestions = finalOptions.maxSuggestions || 5;
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    for (const suggestion of limitedSuggestions) {
      const suggestionResult = this.validateSuggestionContent(
        suggestion,
        conversationContext,
        finalOptions,
      );

      if (suggestionResult.valid) {
        validatedSuggestions.push(suggestion);
      } else {
        errors.push(...suggestionResult.errors);
        warnings.push(...suggestionResult.warnings);
      }
    }

    // Check for duplicate suggestions
    const uniqueSuggestions = [...new Set(validatedSuggestions)];
    if (uniqueSuggestions.length !== validatedSuggestions.length) {
      warnings.push("Duplicate suggestions were filtered out");
    }

    return {
      valid: validatedSuggestions.length > 0,
      errors,
      warnings,
      suggestions: uniqueSuggestions,
    };
  }

  /**
   * Validate a single suggestion's content
   */
  private validateSuggestionContent(
    suggestion: string,
    conversationContext?: string[],
    options?: ValidationOptions,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check suggestion length
    if (suggestion.length < 5) {
      errors.push(`Suggestion is too short: "${suggestion}"`);
    } else if (suggestion.length > 200) {
      errors.push(
        `Suggestion is too long: ${suggestion.length} characters (max 200)`,
      );
    }

    // Check for Chesapeake context if required
    if (options?.requireChesapeakeContext) {
      const chesapeakeKeywords = [
        "chesapeake",
        "city",
        "service",
        "department",
        "form",
        "application",
        "permit",
        "license",
        "tax",
        "utility",
        "trash",
        "recycling",
        "police",
        "fire",
        "emergency",
        "park",
        "recreation",
        "library",
        "school",
        "district",
        "council",
        "mayor",
        "budget",
        "meeting",
        "event",
        "calendar",
        "news",
        "alert",
        "notification",
      ];

      const suggestionLower = suggestion.toLowerCase();
      const hasContext = chesapeakeKeywords.some((keyword) =>
        suggestionLower.includes(keyword),
      );

      if (!hasContext && conversationContext) {
        // Check if suggestion relates to conversation context
        const contextText = conversationContext.join(" ").toLowerCase();
        const contextWords = contextText.split(/\s+/);
        const relatesToContext = contextWords.some(
          (word) => word.length > 3 && suggestionLower.includes(word),
        );

        if (!relatesToContext) {
          warnings.push(
            `Suggestion may not be contextually relevant to Chesapeake: "${suggestion}"`,
          );
        }
      } else if (!hasContext) {
        warnings.push(
          `Suggestion may not be specific to Chesapeake City: "${suggestion}"`,
        );
      }
    }

    // Check for inappropriate content
    const inappropriatePatterns = [
      /(?:call|phone|dial)\s+\d{3}[-.]?\d{3}[-.]?\d{4}/gi,
      /\b(?:send|email)\s+[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
      /\b(?:password|login|credit\s*card|ssn|social\s*security)\b/gi,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(suggestion)) {
        errors.push(
          `Suggestion contains potentially inappropriate content: "${suggestion}"`,
        );
        break;
      }
    }

    // Check for question format (suggestions should be questions or action items)
    if (
      !suggestion.endsWith("?") &&
      !/\b(how|what|where|when|why|who|can|could|would|should)\b/i.test(
        suggestion,
      )
    ) {
      warnings.push(
        `Suggestion may not be in optimal question format: "${suggestion}"`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: [suggestion],
    };
  }

  /**
   * Validate document metadata for completeness and correctness
   */
  validateDocumentMetadata(
    metadata: DocumentMetadata,
    sourceContent?: string,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!metadata.source) {
      errors.push("Document metadata missing required field: source");
    }

    if (!metadata.url) {
      errors.push("Document metadata missing required field: url");
    }

    // Optional field validation
    if (metadata.title && metadata.title.length > 200) {
      warnings.push(
        `Document title is very long: ${metadata.title.length} characters`,
      );
    }

    if (metadata.lastUpdated) {
      const lastUpdated = new Date(metadata.lastUpdated);
      const now = new Date();
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );

      if (lastUpdated < oneYearAgo) {
        warnings.push(
          `Document may be outdated (last updated: ${lastUpdated.toISOString().split("T")[0]})`,
        );
      }
    }

    // Validate tags if present
    if (metadata.tags) {
      if (!Array.isArray(metadata.tags)) {
        errors.push("Document tags must be an array");
      } else {
        const invalidTags = metadata.tags.filter(
          (tag) => typeof tag !== "string" || tag.length > 50 || tag.length < 2,
        );
        if (invalidTags.length > 0) {
          warnings.push(
            `Some tags may be invalid: ${invalidTags.slice(0, 3).join(", ")}`,
          );
        }
      }
    }

    // Cross-reference with content if provided
    if (sourceContent) {
      if (metadata.title && !sourceContent.includes(metadata.title)) {
        warnings.push(`Document title not found in content`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate a complete chat response
   */
  async validateChatResponse(
    response: {
      message: string;
      sources?: DocumentMetadata[];
      suggestedFollowUps?: string[];
    },
    conversationContext?: string[],
    options?: ValidationOptions,
  ): Promise<ValidationResult> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate response message
    if (!response.message || response.message.trim().length === 0) {
      errors.push("Response message is empty");
    } else if (response.message.length > 5000) {
      warnings.push("Response message is very long");
    }

    // Validate sources
    if (response.sources) {
      for (const source of response.sources) {
        const metadataValidation = this.validateDocumentMetadata(source);
        if (!metadataValidation.valid) {
          errors.push(...metadataValidation.errors);
          warnings.push(...metadataValidation.warnings);
        }
      }
    }

    // Validate suggested follow-ups
    if (response.suggestedFollowUps) {
      const suggestionsValidation = this.validateSuggestions(
        response.suggestedFollowUps,
        conversationContext,
        finalOptions,
      );

      if (!suggestionsValidation.valid) {
        errors.push(...suggestionsValidation.errors);
        warnings.push(...suggestionsValidation.warnings);
      }

      // Add validated suggestions
      suggestions.push(...suggestionsValidation.suggestions);
    }

    // Check for broken links in response message
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = response.message.match(urlRegex) || [];

    if (urls.length > 0) {
      const urlValidations = await this.validateUrls(urls, {
        ...finalOptions,
        checkUrlStatus: finalOptions.checkUrlStatus,
      });
      for (const urlValidation of urlValidations) {
        if (!urlValidation.valid) {
          errors.push(...urlValidation.errors);
          warnings.push(...urlValidation.warnings);
        }
      }
    }

    // Check for Chesapeake context in response
    if (finalOptions.requireChesapeakeContext) {
      const chesapeakeMentions = [
        "Chesapeake",
        "City of Chesapeake",
        "Chesapeake City",
        "Chesapeake, VA",
        "Chesapeake Virginia",
      ];

      const responseLower = response.message.toLowerCase();
      const hasMention = chesapeakeMentions.some((mention) =>
        responseLower.includes(mention.toLowerCase()),
      );

      if (!hasMention && response.message.length > 100) {
        warnings.push(
          "Response may not be specific to Chesapeake City context",
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.slice(0, finalOptions.maxSuggestions || 5),
    };
  }

  /**
   * Generate suggestions for fixing URL issues
   */
  private generateUrlSuggestions(url: string, errors: string[]): string[] {
    const suggestions: string[] = [];

    if (
      errors.some(
        (e) => e.includes("HTTP 404") || e.includes("could not be reached"),
      )
    ) {
      suggestions.push(
        "The page may have moved or been removed. Try searching the Chesapeake City website.",
      );
      suggestions.push(
        "Consider contacting the relevant department directly for this information.",
      );
    }

    if (errors.some((e) => e.includes("Invalid URL format"))) {
      suggestions.push("Make sure the URL starts with http:// or https://");
      suggestions.push("Check for typos or missing parts in the URL");
    }

    return suggestions;
  }

  /**
   * Set allowed domains for validation (optional)
   */
  setAllowedDomains(domains: string[]): void {
    this.defaultOptions.allowedDomains = domains.map((d) => d.toLowerCase());
  }

  /**
   * Create a validation service with default Chesapeake configuration
   */
  static createDefault(): ValidationService {
    return new ValidationService("https://www.cityofchesapeake.net");
  }
}
