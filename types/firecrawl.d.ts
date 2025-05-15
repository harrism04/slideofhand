declare module '@mendable/firecrawl-js' {
  interface FirecrawlAppOptions {
    apiKey?: string;
    apiUrl?: string;
  }

  interface ScrapeOptions {
    formats?: ('markdown' | 'html' | 'rawHtml' | 'screenshot' | 'links' | 'screenshot@fullPage' | 'extract')[];
    onlyMainContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
    timeout?: number;
    actions?: any[]; // Define more specifically if needed
    extract?: any; // Define more specifically if needed
    mobile?: boolean;
    skipTlsVerification?: boolean;
    removeBase64Images?: boolean;
    location?: any; // Define more specifically if needed
  }

  interface CrawlerOptions {
    limit?: number;
    maxDepth?: number;
    excludes?: string[];
    includes?: string[];
    generateTags?: string[];
    allowBackwardLinks?: boolean;
    allowExternalLinks?: boolean;
    returnOnlyUrls?: boolean;
    // Add other crawler options if needed
  }
  
  interface PageOptions {
    onlyMainContent?: boolean;
    // Add other page options if needed
  }

  interface CrawlParams {
    crawlerOptions?: CrawlerOptions;
    pageOptions?: PageOptions;
    scrapeOptions?: ScrapeOptions; // From docs, scrapeOptions can be part of crawlUrl
    limit?: number; // Also a top-level param for crawlUrl
    // Add other crawl params if needed
  }

  interface FirecrawlResponse {
    success: boolean;
    data?: any; // Define more specifically based on expected data structure
    markdown?: string;
    html?: string;
    // Add other response properties
    id?: string; // For async crawl
    error?: string;
  }

  export default class FirecrawlApp {
    constructor(options: FirecrawlAppOptions);
    scrapeUrl(url: string, params?: ScrapeOptions): Promise<FirecrawlResponse>;
    crawlUrl(url: string, params?: CrawlParams, waitForCompletion?: boolean, pollInterval?: number): Promise<FirecrawlResponse>;
    asyncCrawlUrl(url: string, params?: CrawlParams): Promise<FirecrawlResponse>; // Returns job ID
    checkCrawlStatus(id: string): Promise<FirecrawlResponse>; // Returns crawl status/data
    cancelCrawl(id: string): Promise<FirecrawlResponse>;
    mapUrl(url: string, params?: any): Promise<FirecrawlResponse>;
    crawlUrlAndWatch(url: string, params?: CrawlParams): Promise<any>; // Returns an EventTarget-like object
  }

  export { CrawlParams, FirecrawlResponse as CrawlStatusResponse }; // Exporting for usage if needed
}
