import { classifyBookmark, domainOf, normalizeUrl } from "./classifier.js";
import type { Bookmark } from "./parser.js";
import type { ExtractedContent, ExtractOptions, PageOffset } from "./types.js";

const DEFAULT_TIMEOUT_MS = 10_000;

export async function extractFromBookmark(bookmark: Bookmark, options: ExtractOptions = {}): Promise<ExtractedContent> {
  if (options.fetchPublic && !options.offlineOnly && typeof fetch === "function") {
    return fetchAndExtract(bookmark, options);
  }
  return offlineExtract(bookmark);
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
    const body = await response.text();
    const text = contentType.includes("html") ? stripHtml(body) : body;
    const content = [bookmark.title, bookmark.url, text].filter(Boolean).join("\n\n").trim();
    const pageOffsets: PageOffset[] = [{ page: 1, start: 0, end: content.length }];
    return {
      bookmark,
      content,
      contentType,
      pageOffsets,
      pageCount: 1,
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
