import { cleanTitle, dedupBookmarks, normalizeUrl } from "./classifier.js";
import { ContentStore } from "./content-store.js";
import { extractFromBookmark } from "./content-extractor.js";
import * as fs from "node:fs";
import { flattenBookmarks, parseBookmarkHtml, type Bookmark } from "./parser.js";
import type { IndexBookmarksOptions, IndexBookmarksResult } from "./types.js";

export async function indexBookmarksFromFile(filePath: string, dbPath: string, options: IndexBookmarksOptions = {}): Promise<IndexBookmarksResult> {
  const started = Date.now();
  const bookmarks = flattenBookmarks(parseBookmarkHtml(fs.readFileSync(filePath, "utf-8"))).filter((bookmark) => bookmark.url);
  const candidates = prepareBookmarks(bookmarks, options);
  const store = new ContentStore(dbPath);
  const result: IndexBookmarksResult = { total: candidates.length, indexed: 0, skipped: 0, failed: 0, errors: [], durationMs: 0 };

  try {
    for (const bookmark of candidates) {
      try {
        store.upsertBookmarkMetadata(bookmark);
        if (!options.force && store.getContentByUrl(bookmark.url)) {
          result.skipped += 1;
          continue;
        }
        const extracted = await extractFromBookmark(bookmark, {
          offlineOnly: options.offlineOnly ?? !options.useBrowser,
          fetchPublic: options.fetchPublic,
          useBrowser: options.useBrowser,
          browserHost: options.browserHost,
          browserPort: options.browserPort,
          waitMs: options.waitMs,
          timeoutMs: options.timeoutMs,
        });
        store.indexBookmarkContent(extracted);
        result.indexed += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({ url: bookmark.url, message: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    result.durationMs = Date.now() - started;
    store.close();
  }
  return result;
}

function prepareBookmarks(bookmarks: Bookmark[], options: IndexBookmarksOptions): Bookmark[] {
  let cleaned = bookmarks
    .map((bookmark) => ({ ...bookmark, title: cleanTitle(bookmark.title) }))
    .filter((bookmark) => normalizeUrl(bookmark.url));
  const deduped = dedupBookmarks(cleaned).unique;
  cleaned = options.folder ? deduped.filter((bookmark) => bookmark.folderPath.toLowerCase().includes(options.folder!.toLowerCase())) : deduped;
  return typeof options.limit === "number" ? cleaned.slice(0, Math.max(0, options.limit)) : cleaned;
}
