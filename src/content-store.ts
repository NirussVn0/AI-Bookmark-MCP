import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

import { domainOf, normalizeUrl } from "./classifier.js";
import type { Bookmark } from "./parser.js";
import type { BookmarkContent, ExtractedContent, IndexStatus, PageOffset, SearchOptions, SearchResult } from "./types.js";

type SqliteDatabase = Database.Database;

export class ContentStore {
  private readonly db: SqliteDatabase;

  constructor(dbPath: string) {
    const parent = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(parent, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  upsertBookmarkMetadata(bookmark: Bookmark): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO bookmarks (url, normalized, title, folder_path, domain, updated_at)
      VALUES (@url, @normalized, @title, @folderPath, @domain, @updatedAt)
      ON CONFLICT(url) DO UPDATE SET
        normalized = excluded.normalized,
        title = excluded.title,
        folder_path = excluded.folder_path,
        domain = excluded.domain,
        updated_at = excluded.updated_at
    `).run({
      url: bookmark.url,
      normalized: normalizeUrl(bookmark.url),
      title: bookmark.title,
      folderPath: bookmark.folderPath,
      domain: domainOf(bookmark.url),
      updatedAt: now,
    });
  }

  indexBookmarkContent(extracted: ExtractedContent): void {
    const now = new Date().toISOString();
    const bookmark = extracted.bookmark;
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO bookmarks (
          url, normalized, title, folder_path, domain, date_indexed, content_type,
          page_count, page_offsets, http_status, is_dead, updated_at
        ) VALUES (
          @url, @normalized, @title, @folderPath, @domain, @dateIndexed, @contentType,
          @pageCount, @pageOffsets, @httpStatus, @isDead, @updatedAt
        )
        ON CONFLICT(url) DO UPDATE SET
          normalized = excluded.normalized,
          title = excluded.title,
          folder_path = excluded.folder_path,
          domain = excluded.domain,
          date_indexed = excluded.date_indexed,
          content_type = excluded.content_type,
          page_count = excluded.page_count,
          page_offsets = excluded.page_offsets,
          http_status = excluded.http_status,
          is_dead = excluded.is_dead,
          updated_at = excluded.updated_at
      `).run({
        url: bookmark.url,
        normalized: normalizeUrl(bookmark.url),
        title: bookmark.title,
        folderPath: bookmark.folderPath,
        domain: domainOf(bookmark.url),
        dateIndexed: now,
        contentType: extracted.contentType,
        pageCount: extracted.pageCount,
        pageOffsets: JSON.stringify(extracted.pageOffsets),
        httpStatus: extracted.httpStatus ?? null,
        isDead: extracted.isDead ? 1 : 0,
        updatedAt: now,
      });

      this.db.prepare("DELETE FROM content_fts WHERE url = ?").run(bookmark.url);
      this.db.prepare("INSERT INTO content_fts (url, title, content, folder_path, domain) VALUES (?, ?, ?, ?, ?)")
        .run(bookmark.url, bookmark.title, extracted.content, bookmark.folderPath, domainOf(bookmark.url));
    });
    tx();
  }

  searchFullText(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const where: string[] = ["content_fts MATCH @query"];
    const params: Record<string, string | number> = { query: makeFtsQuery(query), limit };
    if (options.folder) {
      where.push("folder_path LIKE @folder");
      params.folder = `%${options.folder}%`;
    }
    if (options.domain) {
      where.push("domain = @domain");
      params.domain = options.domain.toLowerCase();
    }
    const snippetExpr = options.contentOnly
      ? "snippet(content_fts, 2, '<mark>', '</mark>', '…', 32)"
      : "snippet(content_fts, -1, '<mark>', '</mark>', '…', 32)";
    const sql = `
      SELECT url, title, folder_path AS folderPath, domain, ${snippetExpr} AS snippet, bm25(content_fts) AS score
      FROM content_fts
      WHERE ${where.join(" AND ")}
      ORDER BY rank
      LIMIT @limit
    `;
    return this.db.prepare(sql).all(params) as SearchResult[];
  }

  getContentByUrl(url: string): BookmarkContent | undefined {
    const row = this.db.prepare(`
      SELECT b.url, b.normalized AS normalizedUrl, b.title, b.folder_path AS folderPath, b.domain,
             f.content, b.content_type AS contentType, b.page_count AS pageCount,
             b.page_offsets AS pageOffsets, b.http_status AS httpStatus, b.is_dead AS isDead,
             b.date_indexed AS dateIndexed
      FROM bookmarks b
      JOIN content_fts f ON f.url = b.url
      WHERE b.url = ? OR b.normalized = ?
      LIMIT 1
    `).get(url, normalizeUrl(url));
    return row ? mapContentRow(row as ContentRow) : undefined;
  }

  getContentRange(url: string, startPage: number, endPage: number): { content: string; offsets: PageOffset[] } | undefined {
    const item = this.getContentByUrl(url);
    if (!item) return undefined;
    const offsets = item.pageOffsets.filter((offset) => offset.page >= startPage && offset.page <= endPage);
    if (offsets.length === 0) return { content: "", offsets: [] };
    const start = Math.min(...offsets.map((offset) => offset.start));
    const end = Math.max(...offsets.map((offset) => offset.end));
    return { content: item.content.slice(start, end), offsets };
  }

  getIndexStatus(): IndexStatus {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) AS bookmarkCount,
        SUM(CASE WHEN date_indexed IS NOT NULL THEN 1 ELSE 0 END) AS indexedCount,
        SUM(CASE WHEN is_dead = 1 THEN 1 ELSE 0 END) AS deadCount,
        COUNT(DISTINCT domain) AS domainCount,
        MAX(date_indexed) AS latestIndexed
      FROM bookmarks
    `).get() as IndexStatusRow;
    return {
      bookmarkCount: Number(row.bookmarkCount ?? 0),
      indexedCount: Number(row.indexedCount ?? 0),
      deadCount: Number(row.deadCount ?? 0),
      domainCount: Number(row.domainCount ?? 0),
      latestIndexed: row.latestIndexed ?? undefined,
    };
  }

  close(): void {
    this.db.close();
  }
}

function makeFtsQuery(query: string): string {
  const terms = query.match(/[\p{L}\p{N}_-]+/gu) ?? [];
  if (terms.length === 0) throw new Error("Full-text search query must contain at least one word or number.");
  return terms.map((term) => `"${term.replace(/"/g, '""')}"`).join(" AND ");
}

function mapContentRow(row: ContentRow): BookmarkContent {
  return {
    ...row,
    pageOffsets: parsePageOffsets(row.pageOffsets),
    pageCount: Number(row.pageCount ?? 0),
    httpStatus: row.httpStatus == null ? undefined : Number(row.httpStatus),
    isDead: Boolean(row.isDead),
  };
}

function parsePageOffsets(value: string | null): PageOffset[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is PageOffset => typeof item === "object" && item !== null && typeof (item as PageOffset).page === "number" && typeof (item as PageOffset).start === "number" && typeof (item as PageOffset).end === "number");
}

interface ContentRow extends Omit<BookmarkContent, "pageOffsets" | "isDead" | "httpStatus"> {
  pageOffsets: string | null;
  isDead: number;
  httpStatus: number | null;
}

interface IndexStatusRow {
  bookmarkCount: number;
  indexedCount: number | null;
  deadCount: number | null;
  domainCount: number;
  latestIndexed: string | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookmarks (
  url TEXT PRIMARY KEY,
  normalized TEXT NOT NULL,
  title TEXT NOT NULL,
  folder_path TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  date_indexed TEXT,
  content_type TEXT,
  page_count INTEGER NOT NULL DEFAULT 0,
  page_offsets TEXT,
  http_status INTEGER,
  is_dead INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_normalized ON bookmarks(normalized);
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_path ON bookmarks(folder_path);

CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
  url UNINDEXED,
  title,
  content,
  folder_path,
  domain UNINDEXED
);
`;
