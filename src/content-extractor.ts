import { classifyBookmark, domainOf, normalizeUrl } from "./classifier.js";
import { BrowserBridge } from "./browser-bridge.js";
import type { Bookmark } from "./parser.js";
import type { ExtractedContent, ExtractOptions, PageOffset } from "./types.js";
import { parsePdfBuffer } from "./pdf-parser.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export async function extractFromBookmark(bookmark: Bookmark, options: ExtractOptions = {}): Promise<ExtractedContent> {
  if (options.useBrowser) {
    return extractWithBrowser(bookmark, options);
  }
  if (options.fetchPublic && !options.offlineOnly && typeof fetch === "function") {
    return fetchAndExtract(bookmark, options);
  }
  return offlineExtract(bookmark);
}

async function extractWithBrowser(bookmark: Bookmark, options: ExtractOptions): Promise<ExtractedContent> {
  const bridge = new BrowserBridge({ host: options.browserHost, port: options.browserPort, waitMs: options.waitMs });
  const extracted = await bridge.extractContentFromUrl(bookmark.url, { waitMs: options.waitMs });
  const content = [bookmark.title, bookmark.url, extracted.title, extracted.description, extracted.content].filter(Boolean).join("\n\n").trim();
  return {
    bookmark,
    content,
    contentType: "text/html; mode=browser-cdp",
    pageOffsets: [{ page: 1, start: 0, end: content.length }],
    pageCount: 1,
    isDead: false,
  };
}

function offlineExtract(bookmark: Bookmark): ExtractedContent {
  const normalized = normalizeUrl(bookmark.url);
  const domain = domainOf(bookmark.url);
  const content = [
    bookmark.title,
    bookmark.url,
    normalized,
    `Folder: ${bookmark.folderPath}`,
    `Domain: ${domain}`,
    `Classification: ${classifyBookmark(bookmark)}`,
  ].filter(Boolean).join("\n");
  const pageOffsets: PageOffset[] = [{ page: 1, start: 0, end: content.length }];
  return {
    bookmark,
    content,
    contentType: "text/plain; mode=offline-bookmark-metadata",
    pageOffsets,
    pageCount: 1,
    isDead: false,
  };
}

async function fetchAndExtract(bookmark: Bookmark, options: ExtractOptions): Promise<ExtractedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(bookmark.url, {
      signal: controller.signal,
      headers: { "user-agent": "bookmark-mcp/1.0 content-indexer" },
    });
    const contentType = response.headers.get("content-type") ?? "text/plain";
    const isPdf = contentType.toLowerCase().includes("pdf") || new URL(bookmark.url).pathname.toLowerCase().endsWith(".pdf");
    let text: string;
    let pageOffsets: PageOffset[];
    let pageCount = 1;
    if (isPdf) {
      const parsed = await parsePdfBuffer(Buffer.from(await response.arrayBuffer()));
      text = parsed.text;
      pageOffsets = parsed.pageOffsets;
      pageCount = parsed.pageCount;
    } else {
      const body = await response.text();
      text = contentType.includes("html") ? stripHtml(body) : body;
      pageOffsets = [];
    }
    const content = [bookmark.title, bookmark.url, text].filter(Boolean).join("\n\n").trim();
    if (!isPdf) pageOffsets = [{ page: 1, start: 0, end: content.length }];
    else {
      const prefixLength = [bookmark.title, bookmark.url].filter(Boolean).join("\n\n").length + 2;
      pageOffsets = pageOffsets.map((offset) => ({ ...offset, start: Math.min(content.length, offset.start + prefixLength), end: Math.min(content.length, offset.end + prefixLength) }));
    }
    return {
      bookmark,
      content,
      contentType,
      pageOffsets,
      pageCount,
      httpStatus: response.status,
      isDead: response.status >= 400,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
