import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import {
  ContentScraper,
  ScrapedContent,
  ContentSection,
  ScrapeOptions,
} from "../../types";

export class CheerioContentScraper implements ContentScraper {
  private readonly baseUrl: string;
  private readonly maxDepth: number;
  private readonly maxPages: number;
  private readonly delay: number;
  private readonly respectRobotsTxt: boolean;
  private readonly userAgent: string;
  private visitedUrls: Set<string> = new Set();
  private scrapedPages: ScrapedContent[] = [];

  constructor(config: any) {
    this.baseUrl = config.baseUrl || "https://www.cityofchesapeake.net";
    this.maxDepth = config.maxDepth || 2;
    this.maxPages = config.maxPages || 20;
    this.delay = config.delay || 1000;
    this.respectRobotsTxt = config.respectRobotsTxt || true;
    this.userAgent =
      config.userAgent ||
      "ChesapeakeCityChatbot/1.0 (+https://cityofchesapeake.net)";
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedContent> {
    const depth = options?.depth || 0;
    const includeLinks = options?.includeLinks ?? true;

    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);

    // Check if already visited
    if (this.visitedUrls.has(normalizedUrl)) {
      throw new Error(`URL already visited: ${normalizedUrl}`);
    }

    // Check depth limit
    if (depth > this.maxDepth) {
      throw new Error(`Maximum depth ${this.maxDepth} exceeded`);
    }

    // Check page limit
    if (this.visitedUrls.size >= this.maxPages) {
      throw new Error(`Maximum pages ${this.maxPages} exceeded`);
    }

    // Add delay if not first request
    if (this.visitedUrls.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    try {
      // Fetch the page
      const response = await axios.get(normalizedUrl, {
        headers: {
          "User-Agent": this.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      this.visitedUrls.add(normalizedUrl);

      // Parse HTML with Cheerio
      const $ = cheerio.load(response.data);

      // Extract metadata
      const title = this.extractTitle($);
      const description = this.extractDescription($);
      const keywords = this.extractKeywords($);
      const lastModified = this.extractLastModified(response.headers);

      // Extract main content
      const mainContent = this.extractMainContent($, normalizedUrl);
      const sections = this.extractSections($, normalizedUrl);

      // Extract links if requested
      let links: string[] = [];
      if (includeLinks) {
        links = this.extractLinks($, normalizedUrl);
      }

      const scrapedContent: ScrapedContent = {
        url: normalizedUrl,
        title,
        content: mainContent,
        html: response.data,
        metadata: {
          description,
          keywords,
          lastModified,
          contentType: String(response.headers["content-type"] || "text/html"),
        },
        sections,
        links,
      };

      this.scrapedPages.push(scrapedContent);
      return scrapedContent;
    } catch (error: any) {
      throw new Error(`Failed to scrape ${normalizedUrl}: ${error.message}`);
    }
  }

  async scrapeMultiple(
    urls: string[],
    options?: ScrapeOptions,
  ): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    const depth = options?.depth || 0;

    for (const url of urls) {
      if (this.visitedUrls.size >= this.maxPages) {
        console.warn(`Page limit ${this.maxPages} reached, stopping scrape`);
        break;
      }

      try {
        const result = await this.scrape(url, { ...options, depth });
        results.push(result);
      } catch (error: any) {
        console.warn(`Failed to scrape ${url}: ${error.message}`);
        // Continue with next URL
      }
    }

    return results;
  }

  async extractSitemapUrls(baseUrl: string): Promise<string[]> {
    const urls: string[] = [];
    const normalizedBaseUrl = this.normalizeUrl(baseUrl);

    try {
      // Try to fetch robots.txt
      const robotsUrl = new URL("/robots.txt", normalizedBaseUrl).toString();
      const robotsResponse = await axios.get(robotsUrl, {
        headers: { "User-Agent": this.userAgent },
        timeout: 10000,
      });

      const robotsContent = robotsResponse.data;
      const sitemapMatch = robotsContent.match(
        /Sitemap:\s*(https?:\/\/[^\s]+)/gi,
      );

      if (sitemapMatch) {
        for (const sitemapLine of sitemapMatch) {
          const sitemapUrl = sitemapLine.split(":")[1]?.trim();
          if (sitemapUrl) {
            try {
              const sitemapUrls = await this.parseSitemap(sitemapUrl);
              urls.push(...sitemapUrls);
            } catch (error) {
              console.warn(`Failed to parse sitemap ${sitemapUrl}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not fetch robots.txt or sitemap: ${error}`);
    }

    // If no sitemap found or parsing failed, use common paths
    if (urls.length === 0) {
      urls.push(
        normalizedBaseUrl,
        new URL("/government", normalizedBaseUrl).toString(),
        new URL("/departments", normalizedBaseUrl).toString(),
        new URL("/services", normalizedBaseUrl).toString(),
        new URL("/contact", normalizedBaseUrl).toString(),
        new URL("/news", normalizedBaseUrl).toString(),
        new URL("/events", normalizedBaseUrl).toString(),
        new URL("/forms", normalizedBaseUrl).toString(),
        new URL("/faq", normalizedBaseUrl).toString(),
        new URL("/help", normalizedBaseUrl).toString(),
      );
    }

    // Filter to unique URLs within the same domain
    const uniqueUrls = Array.from(
      new Set(urls.filter((url) => url.startsWith(normalizedBaseUrl))),
    );

    return uniqueUrls.slice(0, this.maxPages);
  }

  private async parseSitemap(sitemapUrl: string): Promise<string[]> {
    const response = await axios.get(sitemapUrl, {
      headers: { "User-Agent": this.userAgent },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const urls: string[] = [];

    // Handle XML sitemaps
    $("url > loc").each((_, element) => {
      const url = $(element).text().trim();
      if (url) {
        urls.push(url);
      }
    });

    // Handle sitemap index files
    $("sitemap > loc").each((_, element) => {
      const nestedSitemapUrl = $(element).text().trim();
      if (nestedSitemapUrl) {
        // Recursively parse nested sitemaps (with depth limit)
        if (urls.length < this.maxPages * 2) {
          // Prevent infinite recursion
          try {
            const nestedUrls = this.parseSitemap(nestedSitemapUrl);
            // Note: This would need async handling - simplified for now
          } catch (error) {
            console.warn(`Failed to parse nested sitemap ${nestedSitemapUrl}`);
          }
        }
      }
    });

    return urls;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Ensure consistent trailing slash for root paths
      if (urlObj.pathname === "" || urlObj.pathname === "/") {
        urlObj.pathname = "/";
      }
      return urlObj.toString();
    } catch (error) {
      // If URL is relative, prepend baseUrl
      if (!url.startsWith("http")) {
        return new URL(url, this.baseUrl).toString();
      }
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    const title =
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("h1").first().text().trim();

    return title || "Untitled Page";
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    return (
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content")
    );
  }

  private extractKeywords($: cheerio.CheerioAPI): string[] | undefined {
    const keywords = $('meta[name="keywords"]').attr("content");
    if (keywords) {
      return keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }
    return undefined;
  }

  private extractLastModified(headers: any): Date | undefined {
    const lastModified = headers["last-modified"];
    if (lastModified) {
      return new Date(lastModified);
    }
    return undefined;
  }

  private extractMainContent($: cheerio.CheerioAPI, url: string): string {
    // Try to find main content areas
    const selectors = [
      "main",
      'article[role="main"]',
      "#main-content",
      "#content",
      ".content",
      ".main-content",
      ".article-content",
      "section",
      "div.container",
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        return this.cleanText(element.text());
      }
    }

    // Fallback: remove navigation, headers, footers
    $("nav, header, footer, aside, .sidebar, .navigation").remove();
    $("script, style, noscript").remove();

    // Get body text
    const bodyText = $("body").text();
    return this.cleanText(bodyText);
  }

  private extractSections(
    $: cheerio.CheerioAPI,
    url: string,
  ): ContentSection[] {
    const sections: ContentSection[] = [];

    // Extract headings and their content
    const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6"];

    headingSelectors.forEach((selector, index) => {
      $(selector).each((_, element) => {
        const heading = $(element).text().trim();
        const level = index + 1; // h1 = 1, h2 = 2, etc.

        // Get content after heading until next heading
        let content = "";
        let nextElement = $(element).next();
        while (
          nextElement.length &&
          !headingSelectors.some((h) => nextElement.is(h))
        ) {
          content += " " + this.cleanText(nextElement.text());
          nextElement = nextElement.next();
        }

        if (content.trim()) {
          sections.push({
            heading,
            level,
            content: content.trim(),
            html: $(element).prop("outerHTML") || undefined,
          });
        }
      });
    });

    // If no sections found with headings, create a single section with all content
    if (sections.length === 0) {
      const mainContent = this.extractMainContent($, url);
      if (mainContent.trim()) {
        sections.push({
          heading: "Content",
          level: 1,
          content: mainContent,
        });
      }
    }

    return sections;
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();

          // Only include links from the same domain
          const linkUrlObj = new URL(absoluteUrl);
          if (
            linkUrlObj.hostname === baseUrlObj.hostname &&
            !absoluteUrl.includes("#") && // Skip anchor links
            !absoluteUrl.includes("mailto:") && // Skip email links
            !absoluteUrl.includes("tel:") // Skip phone links
          ) {
            links.push(absoluteUrl);
          }
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });

    // Return unique links
    return Array.from(new Set(links));
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
      .replace(/[\t\r]+/g, " ") // Replace tabs and carriage returns with spaces
      .trim();
  }

  // Utility methods
  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }

  getScrapedPages(): ScrapedContent[] {
    return [...this.scrapedPages];
  }

  reset(): void {
    this.visitedUrls.clear();
    this.scrapedPages = [];
  }
}
