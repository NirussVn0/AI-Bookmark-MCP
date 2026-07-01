import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { ContentStore } from "../src/content-store.js";
import { indexBookmarksFromFile } from "../src/index-manager.js";
import { buildEvenPageOffsets } from "../src/pdf-parser.js";

const sample = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><H3>AI Protocols</H3>
    <DL><p>
      <DT><A HREF="https://example.com/mcp">Model Context Protocol overview</A>
      <DT><A HREF="https://example.com/sqlite">SQLite FTS5 notes</A>
    </DL><p>
  </DL><p>
</DL><p>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bookmark-mcp-content-"));
const sampleFile = path.join(tmp, "sample.html");
const dbPath = path.join(tmp, "content.db");
fs.writeFileSync(sampleFile, sample, "utf-8");

const result = await indexBookmarksFromFile(sampleFile, dbPath, { offlineOnly: true, limit: 10, force: true });
assert.equal(result.total, 2);
assert.equal(result.indexed, 2);
assert.equal(result.failed, 0);

const browserDbPath = path.join(tmp, "browser-missing.db");
const browserResult = await indexBookmarksFromFile(sampleFile, browserDbPath, { useBrowser: true, browserPort: 9, waitMs: 0, limit: 1, force: true });
assert.equal(browserResult.total, 1);
assert.equal(browserResult.indexed, 0);
assert.equal(browserResult.failed, 1);
assert.match(browserResult.errors[0]?.message ?? "", /Chrome DevTools Protocol is not available/);

assert.deepEqual(buildEvenPageOffsets("abcdefghij", 3), [
  { page: 1, start: 0, end: 3 },
  { page: 2, start: 3, end: 6 },
  { page: 3, start: 6, end: 10 },
]);

const store = new ContentStore(dbPath);
try {
  const matches = store.searchFullText("Model Context Protocol", { limit: 5 });
  assert.ok(matches.length >= 1, "full-text search should find offline indexed title text");
  assert.equal(matches[0].url, "https://example.com/mcp");

  const content = store.getContentByUrl("https://example.com/mcp");
  assert.ok(content, "content should be retrievable by URL");
  assert.match(content.content, /Model Context Protocol/);
  assert.equal(content.pageCount, 1);

  const range = store.getContentRange("https://example.com/mcp", 1, 1);
  assert.ok(range, "page range should be retrievable for offline one-page content");
  assert.match(range.content, /Model Context Protocol/);

  const status = store.getIndexStatus();
  assert.equal(status.bookmarkCount, 2);
  assert.equal(status.indexedCount, 2);
  assert.ok(status.domainCount >= 1);
} finally {
  store.close();
}

console.log(`content smoke ok: db=${dbPath}`);
