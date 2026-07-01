import type { Bookmark } from "./parser.js";

export interface BookmarkContent {
  url: string;
  normalizedUrl: string;
  title: string;
  folderPath: string;
  domain: string;
  content: string;
  contentType: string;
  pageCount: number;
  pageOffsets: PageOffset[];
  httpStatus?: number;
  isDead: boolean;
  dateIndexed: string;
}

export interface PageOffset {
  page: number;
  start: number;
  end: number;
}

export interface ExtractOptions {
  offlineOnly?: boolean;
  fetchPublic?: boolean;
  useBrowser?: boolean;
  browserHost?: string;
  browserPort?: number;
  waitMs?: number;
  timeoutMs?: number;
}

export interface ExtractedContent {
  bookmark: Bookmark;
  content: string;
  contentType: string;
  pageOffsets: PageOffset[];
  pageCount: number;
  httpStatus?: number;
  isDead: boolean;
}

export interface SearchResult {
  url: string;
  title: string;
  folderPath: string;
  domain: string;
  snippet?: string;
  score?: number;
}

export interface SearchOptions {
  folder?: string;
  domain?: string;
  limit?: number;
  contentOnly?: boolean;
}

export interface IndexStatus {
  bookmarkCount: number;
  indexedCount: number;
  deadCount: number;
  domainCount: number;
  latestIndexed?: string;
}

export interface IndexBookmarksOptions extends ExtractOptions {
  folder?: string;
  limit?: number;
  force?: boolean;
}

export interface IndexBookmarksResult {
  total: number;
  indexed: number;
  skipped: number;
  failed: number;
  errors: Array<{ url: string; message: string }>;
  durationMs: number;
}
