#!/usr/bin/env node
/** MCP server for local browser bookmark management. */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as z from "zod";

import { BrowserBridge } from "./browser-bridge.js";
import { checkBrowserHarness } from "./browser-harness-adapter.js";
import { detectBrowserBookmarkPaths, parseChromiumBookmarksJson } from "./browser-importers.js";
import { cleanTitle, classifyBookmark, dedupBookmarks, domainOf, isTrash, normalizeUrl } from "./classifier.js";
import { ContentStore } from "./content-store.js";
import { indexBookmarksFromFile } from "./index-manager.js";
import { countTree, flattenBookmarks, parseBookmarkHtml, type Bookmark, type BookmarkFolder, type BookmarkNode } from "./parser.js";
import { addBookmark, createTree, groupByDomain, renderHtml, sortTree, type TreeNode } from "./renderer.js";

type ToolTextResult = { content: Array<{ type: "text"; text: string }> };
type ExportFormat = "html" | "json" | "csv" | "markdown";

const textResult = (text: string): ToolTextResult => ({ content: [{ type: "text", text }] });
const DEFAULT_DB_PATH = "bookmarks-content.db";

export interface MergeResult {
  outputFile: string;
  totalInput: number;
  trashRemoved: number;
  invalidRemoved: number;
  duplicatesRemoved: number;
  finalCount: number;
  fileStats: string[];
}

export function readBookmarkFile(filePath: string): { tree: BookmarkFolder; bookmarks: Bookmark[]; links: number; folders: number } {
  const html = fs.readFileSync(filePath, "utf-8");
  const tree = parseBookmarkHtml(html);
  const bookmarks = flattenBookmarks(tree).filter((bm) => bm.url);
  const { links, folders } = countTree(tree);
  return { tree, bookmarks, links, folders };
}

function cleanValidDedup(bookmarks: Bookmark[]): { unique: Bookmark[]; trashRemoved: number; invalidRemoved: number; duplicatesRemoved: number } {
  let cleaned = bookmarks.map((bm) => ({ ...bm, title: cleanTitle(bm.title) }));

  const beforeTrash = cleaned.length;
  cleaned = cleaned.filter((bm) => !isTrash({ title: bm.title, url: bm.url }));
  const trashRemoved = beforeTrash - cleaned.length;

  const beforeInvalid = cleaned.length;
  cleaned = cleaned.filter((bm) => normalizeUrl(bm.url));
  const invalidRemoved = beforeInvalid - cleaned.length;

  const { unique, duplicates } = dedupBookmarks(cleaned);
  return { unique, trashRemoved, invalidRemoved, duplicatesRemoved: duplicates };
}

export function buildClassifiedTree(bookmarks: Bookmark[], shouldGroupByDomain = true): TreeNode {
  const root = createTree();
  root.children.set("Bookmarks bar", { title: "Bookmarks bar", children: new Map(), links: [] });
  root.children.set("Other Bookmarks", { title: "Other Bookmarks", children: new Map(), links: [] });

  for (const bm of makeIconShortcuts(bookmarks)) {
    addBookmark(root, "Bookmarks bar", bm, "");
  }

  for (const bm of bookmarks) {
    const quick = quickPath(bm);
    if (quick) addBookmark(root, `Bookmarks bar/${quick}`, bm);
  }

  for (const bm of bookmarks) {
    addBookmark(root, `Other Bookmarks/${classifyBookmark(bm)}`, bm);
  }
  if (shouldGroupByDomain) {
    const otherBookmarks = root.children.get("Other Bookmarks");
    if (otherBookmarks) groupByDomain(otherBookmarks);
  }
  sortTree(root);
  return root;
}

const ICON_SHORTCUTS: Array<[string, string]> = [
  ["mail.google.com/mail/u/0", "Gmail 0"],
  ["mail.google.com/mail/u/1", "Gmail 1"],
  ["drive.google.com/drive/u/0/my-drive", "Drive"],
  ["keep.google.com", "Keep"],
  ["translate.google", "Translate"],
  ["maps.google", "Maps"],
  ["messenger.com", "Messenger"],
  ["discord", "Discord"],
  ["facebook.com", "Facebook"],
  ["tiktok", "TikTok"],
  ["zalo", "Zalo"],
  ["chatgpt.com", "ChatGPT"],
  ["gemini.google", "Gemini"],
  ["claude.ai", "Claude"],
  ["perplexity.ai", "Perplexity"],
  ["youtube.com", "YouTube"],
];

function bookmarkHaystack(bm: Bookmark): string {
  return `${normalizeUrl(bm.url)} ${bm.url} ${bm.title} ${bm.folderPath}`.toLowerCase();
}

function makeIconShortcuts(bookmarks: Bookmark[]): Bookmark[] {
  const items: Bookmark[] = [];
  const seen = new Set<string>();
  for (const [pattern] of ICON_SHORTCUTS) {
    const bm = bookmarks.find((candidate) => bookmarkHaystack(candidate).includes(pattern.toLowerCase()));
    if (!bm) continue;
    const normalized = normalizeUrl(bm.url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(bm);
  }
  return items;
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function quickPath(bm: Bookmark): string | undefined {
  const title = bm.title || "";
  const url = normalizeUrl(bm.url);
  const folder = (bm.folderPath || "").toLowerCase();
  const t = title.toLowerCase();
  const text = `${t} ${url} ${folder}`;

  if (folder.includes("__pin") || folder.includes("pin")) {
    if (containsAny(text, ["youtube", "free 2", "dev 01", "postcast", "playlist"])) return "__QUICK/@PIN/@PIN_YOUTUBE_SAVE";
    if (containsAny(text, ["chatgpt", "gemini", "claude", "perplexity", "ai studio", "grok", "coze"])) return "__QUICK/@PIN/@PIN_AI_CHAT";
    if (containsAny(text, ["ai", "mixboard", "wescan", "openviking", "locofy", "agent", "opal", "reve"])) return "__QUICK/@PIN/@PIN_AI_GEMS";
    if (containsAny(text, ["store", "shop", "key", "mmo", "divine", "kingmmo", "ritokey", "hyperkey", "cursor pro", "claude pro"])) return "__QUICK/@PIN/@PIN_STORE_ACCOUNT";
    if (containsAny(text, ["minecraft", "server", "pikamc", "vane", "datapack", "map"])) return "__QUICK/@PIN/@PIN_SERVER_MC";
    if (containsAny(text, ["work", "sonar", "harness", "docs", "project", "túi kịch bản"])) return "__QUICK/@PIN/@PIN_WORK_PROJECT";
    return "__QUICK/@PIN/@PIN_INBOX_REVIEW";
  }

  if (containsAny(url, ["mail.google.com", "drive.google.com/drive/u/0/my-drive", "keep.google", "maps.google", "translate.google", "photos.google", "earth.google", "tasksboard", "monkeytype", "keybr", "chess.com", "edclub"])) {
    if (containsAny(url, ["mail.google", "drive.google.com/drive/u/0/my-drive", "keep.google", "maps.google", "translate.google", "photos.google", "earth.google"])) return "__QUICK/@DAILY/@DAILY_GOOGLE";
    if (containsAny(url, ["monkeytype", "keybr", "chess", "edclub"])) return "__QUICK/@DAILY/@DAILY_PRACTICE";
    return "__QUICK/@DAILY/@DAILY_TASKS";
  }

  if (containsAny(url, ["chatgpt", "gemini.google", "claude.ai", "perplexity.ai", "poe.com", "coze.com", "aistudio.google"])) return "__QUICK/@AI_FAST/@AI_CHAT";
  if (containsAny(text, ["v0 by vercel", "lovable", "cursor", "opencode", "kiro", "firebase studio", "jules"])) return "__QUICK/@AI_FAST/@AI_DEV";
  if (url.includes("sora.chatgpt") || text.includes("mixboard") || t.trim() === "reve" || url.startsWith("reve.com")) return "__QUICK/@AI_FAST/@AI_CREATIVE";

  if (containsAny(text, ["sonarcloud", "harness", "túi kịch bản", "sabi svm", "panel.gamehosting", "app.asana.com", "sites.google.com/view/tui-kich-ban"])) {
    if (containsAny(text, ["sabi", "server", "minecraft", "panel"])) return "__QUICK/@WORK/@WORK_SERVER";
    return "__QUICK/@WORK/@WORK_DASHBOARD";
  }
  return undefined;
}

export function mergeBookmarkFiles(inputFiles: string[], outputFile: string, shouldGroupByDomain = true): MergeResult {
  let allBookmarks: Bookmark[] = [];
  const fileStats: string[] = [];

  for (const inputFile of inputFiles) {
    const { bookmarks } = readBookmarkFile(inputFile);
    fileStats.push(`${path.basename(inputFile)}: ${bookmarks.length} bookmarks`);
    allBookmarks = allBookmarks.concat(bookmarks);
  }

  const totalInput = allBookmarks.length;
  const { unique, trashRemoved, invalidRemoved, duplicatesRemoved } = cleanValidDedup(allBookmarks);
  const html = renderHtml(buildClassifiedTree(unique, shouldGroupByDomain));
  fs.writeFileSync(outputFile, html, "utf-8");

  return { outputFile, totalInput, trashRemoved, invalidRemoved, duplicatesRemoved, finalCount: unique.length, fileStats };
}

export function exportBookmarks(inputFile: string, outputFile: string, format: ExportFormat, shouldGroupByDomain = true): number {
  const { bookmarks } = readBookmarkFile(inputFile);
  const { unique } = cleanValidDedup(bookmarks);

  switch (format) {
    case "html":
      fs.writeFileSync(outputFile, renderHtml(buildClassifiedTree(unique, shouldGroupByDomain)), "utf-8");
      break;
    case "json":
      fs.writeFileSync(outputFile, JSON.stringify(unique, null, 2), "utf-8");
      break;
    case "csv":
      fs.writeFileSync(outputFile, toCsv(unique), "utf-8");
      break;
    case "markdown":
      fs.writeFileSync(outputFile, toMarkdown(unique), "utf-8");
      break;
    default:
      throw new Error(`Unsupported export format: ${String(format)}`);
  }

  return unique.length;
}

function toCsv(bookmarks: Bookmark[]): string {
  const rows = [["title", "url", "folderPath", "domain", "classification"]];
  for (const bm of bookmarks) rows.push([bm.title, bm.url, bm.folderPath, domainOf(bm.url), classifyBookmark(bm)]);
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function csvEscape(value: string): string {
  return `"${(value || "").replace(/"/g, '""')}"`;
}

function toMarkdown(bookmarks: Bookmark[]): string {
  const byClass = new Map<string, Bookmark[]>();
  for (const bm of bookmarks) {
    const category = classifyBookmark(bm);
    if (!byClass.has(category)) byClass.set(category, []);
    byClass.get(category)!.push(bm);
  }

  const lines = ["# Bookmarks", ""];
  for (const [category, items] of [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${category}`, "");
    for (const bm of items.sort((a, b) => a.title.localeCompare(b.title))) {
      lines.push(`- [${bm.title.replace(/]/g, "\\]")}](${bm.url})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderTreeText(node: BookmarkFolder | BookmarkNode, depth: number, maxDepth: number, out: string[]): void {
  if (depth > maxDepth || node.type !== "folder") return;
  const prefix = "  ".repeat(depth);
  for (const child of node.children) {
    if (child.type !== "folder") continue;
    const { links, folders } = countTree(child);
    out.push(`${prefix}📂 ${child.title}  [${links} links, ${folders} sub]`);
    renderTreeText(child, depth + 1, maxDepth, out);
  }
}

function formatMergeResult(result: MergeResult): string {
  return [
    "=== MERGE COMPLETE ===",
    ...result.fileStats.map((s) => `  ${s}`),
    `Total input: ${result.totalInput}`,
    `Trash removed: ${result.trashRemoved}`,
    `Invalid URL removed: ${result.invalidRemoved}`,
    `Duplicates removed: ${result.duplicatesRemoved}`,
    `Final output: ${result.finalCount} bookmarks`,
    `Output file: ${result.outputFile} (${fs.statSync(result.outputFile).size.toLocaleString()} bytes)`,
  ].join("\n");
}

function resolveDbPath(dbPath?: string): string {
  return dbPath || path.resolve(process.cwd(), DEFAULT_DB_PATH);
}

function withContentStore<T>(dbPath: string | undefined, fn: (store: ContentStore) => T): T {
  const store = new ContentStore(resolveDbPath(dbPath));
  try {
    return fn(store);
  } finally {
    store.close();
  }
}

function estimatedReadTime(content: string): number {
  const words = content.match(/[\p{L}\p{N}_-]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 220));
}

function keywordReason(text: string, topic: string): string {
  const terms = topic.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [];
  const matched = terms.filter((term) => text.toLowerCase().includes(term)).slice(0, 8);
  return matched.length ? `Matched indexed terms: ${matched.join(", ")}` : "Used title/url/folder/domain classifier fallback.";
}

export function createBookmarkMcpServer(): McpServer {
  const server = new McpServer({ name: "bookmark-mcp", version: "1.0.0" });

  server.registerTool("read", {
    description: "Parse a Netscape bookmark HTML file and return a concise summary of bookmarks and folders.",
    inputSchema: { filePath: z.string().describe("Absolute or relative path to bookmark HTML") },
  }, async ({ filePath }) => {
    const { bookmarks, folders } = readBookmarkFile(filePath);
    const summary = `Parsed ${bookmarks.length} bookmarks in ${folders} folders.\n\nFirst 20:\n` + bookmarks.slice(0, 20).map((b, i) => `${i + 1}. [${b.folderPath}] ${b.title.slice(0, 60)}\n   ${b.url.slice(0, 100)}`).join("\n");
    return textResult(summary);
  });

  server.registerTool("search", {
    description: "Search bookmarks by title, URL, domain, or folder path.",
    inputSchema: {
      filePath: z.string(),
      query: z.string(),
      limit: z.number().int().positive().max(500).optional().default(50),
    },
  }, async ({ filePath, query, limit }) => {
    const { bookmarks } = readBookmarkFile(filePath);
    const q = query.toLowerCase();
    const matches = bookmarks.filter((b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.folderPath.toLowerCase().includes(q) || domainOf(b.url).includes(q)).slice(0, limit);
    if (matches.length === 0) return textResult(`No bookmarks found matching "${query}"`);
    return textResult(`Found ${matches.length} bookmark(s) matching "${query}":\n\n` + matches.map((b, i) => `${i + 1}. ${b.title}\n   URL: ${b.url}\n   Folder: ${b.folderPath}`).join("\n\n"));
  });

  server.registerTool("classify", {
    description: "Classify a URL/title into the bookmark taxonomy.",
    inputSchema: { url: z.string().url(), title: z.string().optional().default("") },
  }, async ({ url, title }) => {
    const bm = { title: title || url, url, folderPath: "" };
    const text = `URL: ${url}\nTitle: ${title}\nDomain: ${domainOf(url)}\nNormalized: ${normalizeUrl(url)}\nClassification: ${classifyBookmark(bm)}\nIs trash: ${isTrash({ title: bm.title, url })}`;
    return textResult(text);
  });

  server.registerTool("merge", {
    description: "Merge multiple bookmark HTML files. Deduplicates, classifies, renders folder SVG icons, and groups leaf folders by domain.",
    inputSchema: {
      inputFiles: z.array(z.string()).min(1),
      outputFile: z.string(),
      groupByDomain: z.boolean().optional().default(true),
    },
  }, async ({ inputFiles, outputFile, groupByDomain: shouldGroupByDomain }) => textResult(formatMergeResult(mergeBookmarkFiles(inputFiles, outputFile, shouldGroupByDomain))));

  server.registerTool("export", {
    description: "Export a bookmark file as classified HTML, JSON, CSV, or Markdown.",
    inputSchema: {
      inputFile: z.string(),
      outputFile: z.string(),
      format: z.enum(["html", "json", "csv", "markdown"]).default("html"),
      groupByDomain: z.boolean().optional().default(true),
    },
  }, async ({ inputFile, outputFile, format, groupByDomain: shouldGroupByDomain }) => {
    const count = exportBookmarks(inputFile, outputFile, format, shouldGroupByDomain);
    return textResult(`Exported ${count} bookmarks to ${outputFile} as ${format}.`);
  });

  server.registerTool("stats", {
    description: "Get bookmark count, folder count, and top-level distribution for a bookmark file.",
    inputSchema: { filePath: z.string() },
  }, async ({ filePath }) => {
    const { tree, links, folders } = readBookmarkFile(filePath);
    const byCategory = new Map<string, number>();
    for (const child of tree.children) if (child.type === "folder") byCategory.set(child.title, countTree(child).links);
    const lines = [`Total bookmarks: ${links.toLocaleString()}`, `Total folders: ${folders}`, `File size: ${fs.statSync(filePath).size.toLocaleString()} bytes`, "", "Top-level distribution:"];
    for (const [name, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- ${name}: ${count}`);
    return textResult(lines.join("\n"));
  });

  server.registerTool("index_bookmarks", {
    description: "Index bookmark metadata/content into a local SQLite FTS5 database. Offline mode is deterministic and network-free by default.",
    inputSchema: {
      filePath: z.string(),
      dbPath: z.string().optional(),
      folder: z.string().optional(),
      limit: z.number().int().positive().max(10000).optional(),
      force: z.boolean().optional().default(false),
      fetchPublic: z.boolean().optional().default(false),
      offlineOnly: z.boolean().optional().default(true),
      useBrowser: z.boolean().optional().default(false),
      browserHost: z.string().optional().default("localhost"),
      browserPort: z.number().int().positive().max(65535).optional().default(9222),
      waitMs: z.number().int().min(0).max(60000).optional().default(3000),
    },
  }, async ({ filePath, dbPath, folder, limit, force, fetchPublic, offlineOnly, useBrowser, browserHost, browserPort, waitMs }) => {
    const result = await indexBookmarksFromFile(filePath, resolveDbPath(dbPath), { folder, limit, force, fetchPublic, offlineOnly, useBrowser, browserHost, browserPort, waitMs });
    return textResult(JSON.stringify({ dbPath: resolveDbPath(dbPath), ...result }, null, 2));
  });

  server.registerTool("get_index_status", {
    description: "Return content index status for the SQLite bookmark database.",
    inputSchema: { dbPath: z.string().optional() },
  }, async ({ dbPath }) => withContentStore(dbPath, (store) => textResult(JSON.stringify(store.getIndexStatus(), null, 2))));

  server.registerTool("search_bookmarks_fulltext", {
    description: "Search indexed bookmark page content using SQLite FTS5, with optional folder/domain filters.",
    inputSchema: {
      dbPath: z.string().optional(),
      query: z.string(),
      folder: z.string().optional(),
      domain: z.string().optional(),
      limit: z.number().int().positive().max(100).optional().default(20),
      content_only: z.boolean().optional().default(false),
    },
  }, async ({ dbPath, query, folder, domain, limit, content_only }) => withContentStore(dbPath, (store) => {
    const results = store.searchFullText(query, { folder, domain, limit, contentOnly: content_only });
    return textResult(JSON.stringify(results, null, 2));
  }));

  server.registerTool("get_bookmark_content", {
    description: "Return indexed content for a bookmark URL.",
    inputSchema: { dbPath: z.string().optional(), url: z.string(), maxChars: z.number().int().positive().max(1_000_000).optional().default(100000) },
  }, async ({ dbPath, url, maxChars }) => withContentStore(dbPath, (store) => {
    const item = store.getContentByUrl(url);
    if (!item) return textResult(`No indexed content found for URL: ${url}`);
    return textResult(JSON.stringify({ ...item, content: item.content.slice(0, maxChars), truncated: item.content.length > maxChars }, null, 2));
  }));

  server.registerTool("get_bookmark_content_range", {
    description: "Return indexed content for a page range. Useful for PDF/page-aware sources when page offsets are available.",
    inputSchema: { dbPath: z.string().optional(), url: z.string(), start_page: z.number().int().positive(), end_page: z.number().int().positive() },
  }, async ({ dbPath, url, start_page, end_page }) => withContentStore(dbPath, (store) => {
    if (end_page < start_page) return textResult("Invalid page range: end_page must be >= start_page.");
    const item = store.getContentByUrl(url);
    if (!item) return textResult(`No indexed content found for URL: ${url}`);
    if (item.pageOffsets.length === 0) return textResult(`No page offsets are available for URL: ${url}`);
    const range = store.getContentRange(url, start_page, end_page);
    if (!range || range.offsets.length === 0) return textResult(`No content offsets found for pages ${start_page}-${end_page}. Available pages: ${item.pageOffsets.map((offset) => offset.page).join(", ")}`);
    return textResult(JSON.stringify({ url: item.url, start_page, end_page, offsets: range.offsets, content: range.content }, null, 2));
  }));

  server.registerTool("summarize_bookmarks", {
    description: "Return indexed bookmark contents for a caller/model to summarize. Does not call an LLM.",
    inputSchema: { dbPath: z.string().optional(), urls: z.array(z.string()).min(1), maxChars: z.number().int().positive().max(1_000_000).optional().default(20000) },
  }, async ({ dbPath, urls, maxChars }) => withContentStore(dbPath, (store) => {
    const items = store.getContentsByUrls(urls).map((item) => ({ url: item.url, title: item.title, folderPath: item.folderPath, domain: item.domain, content: item.content.slice(0, maxChars), truncated: item.content.length > maxChars }));
    return textResult(JSON.stringify({ count: items.length, items }, null, 2));
  }));

  server.registerTool("find_related", {
    description: "Find indexed bookmarks related to a topic using FTS plus folder/domain scoring.",
    inputSchema: { topic: z.string(), dbPath: z.string().optional(), limit: z.number().int().positive().max(100).optional().default(20), include_content: z.boolean().optional().default(false) },
  }, async ({ topic, dbPath, limit, include_content }) => withContentStore(dbPath, (store) => {
    const fts = store.searchFullText(topic, { limit: Math.min(limit * 3, 100) });
    const items = fts.map((result) => {
      const item = store.getContentByUrl(result.url);
      const haystack = `${result.title} ${result.folderPath} ${result.domain} ${item?.content ?? ""}`;
      const domainBoost = topic.toLowerCase().includes(result.domain) ? 2 : 0;
      const folderBoost = keywordReason(result.folderPath, topic).startsWith("Matched") ? 1 : 0;
      return { ...result, related_score: Math.abs(result.score ?? 0) + domainBoost + folderBoost, ...(include_content && item ? { content: item.content.slice(0, 5000) } : {}) };
    }).sort((a, b) => b.related_score - a.related_score).slice(0, limit);
    return textResult(JSON.stringify({ topic, count: items.length, items }, null, 2));
  }));

  server.registerTool("classify_with_content", {
    description: "Suggest a folder for an indexed URL using title/content keywords plus the deterministic classifier.",
    inputSchema: { dbPath: z.string().optional(), url: z.string() },
  }, async ({ dbPath, url }) => withContentStore(dbPath, (store) => {
    const item = store.getContentByUrl(url);
    if (!item) return textResult(`No indexed content found for URL: ${url}`);
    const bookmark = { title: item.title, url: item.url, folderPath: item.folderPath };
    const folder = classifyBookmark(bookmark);
    const reason = keywordReason(`${item.title} ${item.url} ${item.folderPath} ${item.content.slice(0, 10000)}`, `${item.title} ${item.domain}`);
    return textResult(JSON.stringify({ url: item.url, suggested_folder: folder, confidence: reason.startsWith("Matched") ? 0.75 : 0.55, reason }, null, 2));
  }));

  server.registerTool("get_reading_list", {
    description: "Return top indexed content results for a topic with estimated reading time. unread_only is accepted but not implemented.",
    inputSchema: { dbPath: z.string().optional(), topic: z.string(), limit: z.number().int().positive().max(100).optional().default(20), unread_only: z.boolean().optional().default(false) },
  }, async ({ dbPath, topic, limit, unread_only }) => withContentStore(dbPath, (store) => {
    const results = store.searchFullText(topic, { limit }).map((result) => {
      const item = store.getContentByUrl(result.url);
      return { ...result, estimated_read_time: estimatedReadTime(item?.content ?? ""), contentType: item?.contentType };
    });
    return textResult(JSON.stringify({ topic, note: unread_only ? "unread_only requested but reading status is not implemented; returning all matches." : undefined, count: results.length, items: results }, null, 2));
  }));

  server.registerTool("check_browser_connection", {
    description: "Check whether Chrome/Chromium is available through the Chrome DevTools Protocol remote debugging port.",
    inputSchema: {
      host: z.string().optional().default("localhost"),
      port: z.number().int().positive().max(65535).optional().default(9222),
    },
  }, async ({ host, port }) => {
    const bridge = new BrowserBridge({ host, port });
    return textResult(JSON.stringify(await bridge.checkConnection(), null, 2));
  });

  server.registerTool("check_browser_harness", {
    description: "Check whether an optional browser-harness CLI is available. It is not required for Bookmark MCP.",
    inputSchema: {},
  }, async () => textResult(JSON.stringify(checkBrowserHarness(), null, 2)));

  server.registerTool("import_chromium_json", {
    description: "Parse a Chrome/Brave/Edge Bookmarks JSON file and return normalized bookmark records.",
    inputSchema: { filePath: z.string(), limit: z.number().int().positive().max(100000).optional() },
  }, async ({ filePath, limit }) => {
    const bookmarks = parseChromiumBookmarksJson(fs.readFileSync(filePath, "utf-8"));
    return textResult(JSON.stringify({ count: bookmarks.length, bookmarks: typeof limit === "number" ? bookmarks.slice(0, limit) : bookmarks }, null, 2));
  });

  server.registerTool("detect_browser_bookmark_paths", {
    description: "Return likely Chrome/Brave/Edge native bookmark JSON paths and whether they exist. Does not read them.",
    inputSchema: {},
  }, async () => textResult(JSON.stringify(detectBrowserBookmarkPaths(), null, 2)));

  server.registerTool("open_in_browser", {
    description: "Open a URL in Chrome via CDP, optionally extract visible DOM text and/or capture a screenshot. Tabs close by default.",
    inputSchema: {
      url: z.string().url(),
      host: z.string().optional().default("localhost"),
      port: z.number().int().positive().max(65535).optional().default(9222),
      extract_content: z.boolean().optional().default(false),
      screenshot: z.boolean().optional().default(false),
      keep_open: z.boolean().optional().default(false),
      wait_ms: z.number().int().min(0).max(60000).optional().default(3000),
    },
  }, async ({ url, host, port, extract_content, screenshot, keep_open, wait_ms }) => {
    const bridge = new BrowserBridge({ host, port, waitMs: wait_ms });
    const result = await bridge.openBookmark(url, { extractContent: extract_content, screenshot, keepOpen: keep_open, waitMs: wait_ms });
    return textResult(JSON.stringify(result, null, 2));
  });

  server.registerTool("extract_content", {
    description: "Open a URL in Chrome via CDP, extract visible page text and basic page counts, then close the tab.",
    inputSchema: {
      url: z.string().url(),
      host: z.string().optional().default("localhost"),
      port: z.number().int().positive().max(65535).optional().default(9222),
      wait_ms: z.number().int().min(0).max(60000).optional().default(3000),
    },
  }, async ({ url, host, port, wait_ms }) => {
    const bridge = new BrowserBridge({ host, port, waitMs: wait_ms });
    return textResult(JSON.stringify(await bridge.extractContentFromUrl(url, { waitMs: wait_ms }), null, 2));
  });

  server.registerTool("navigate_and_read", {
    description: "Alias for extract_content: navigate to a URL, extract visible page text, and close the tab.",
    inputSchema: {
      url: z.string().url(),
      host: z.string().optional().default("localhost"),
      port: z.number().int().positive().max(65535).optional().default(9222),
      wait_ms: z.number().int().min(0).max(60000).optional().default(3000),
    },
  }, async ({ url, host, port, wait_ms }) => {
    const bridge = new BrowserBridge({ host, port, waitMs: wait_ms });
    return textResult(JSON.stringify(await bridge.extractContentFromUrl(url, { waitMs: wait_ms }), null, 2));
  });

  // Backward-compatible aliases for tools that existed in the initial partial port.
  server.registerTool("read_bookmarks", { description: "Alias for read.", inputSchema: { filePath: z.string() } }, async ({ filePath }) => {
    const { bookmarks, folders } = readBookmarkFile(filePath);
    return textResult(`Parsed ${bookmarks.length} bookmarks in ${folders} folders.`);
  });
  server.registerTool("search_bookmarks", { description: "Alias for search.", inputSchema: { filePath: z.string(), query: z.string(), limit: z.number().optional().default(50) } }, async ({ filePath, query, limit }) => {
    const { bookmarks } = readBookmarkFile(filePath);
    const q = query.toLowerCase();
    const matches = bookmarks.filter((b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.folderPath.toLowerCase().includes(q)).slice(0, limit);
    return textResult(JSON.stringify(matches, null, 2));
  });
  server.registerTool("get_tree", { description: "Return the folder tree structure.", inputSchema: { filePath: z.string(), maxDepth: z.number().optional().default(3) } }, async ({ filePath, maxDepth }) => {
    const { tree, links, folders } = readBookmarkFile(filePath);
    const lines = [`📊 ${links} bookmarks in ${folders} folders`, ""];
    renderTreeText(tree, 0, maxDepth, lines);
    return textResult(lines.join("\n"));
  });
  server.registerTool("get_stats", { description: "Alias for stats.", inputSchema: { filePath: z.string() } }, async ({ filePath }) => {
    const { links, folders } = readBookmarkFile(filePath);
    return textResult(`Total bookmarks: ${links}\nTotal folders: ${folders}`);
  });
  server.registerTool("export_bookmarks", { description: "Alias for export.", inputSchema: { inputFile: z.string(), outputFile: z.string(), format: z.enum(["html", "json", "csv", "markdown"]).default("html"), groupByDomain: z.boolean().optional().default(true) } }, async ({ inputFile, outputFile, format, groupByDomain: shouldGroupByDomain }) => {
    const count = exportBookmarks(inputFile, outputFile, format, shouldGroupByDomain);
    return textResult(`Exported ${count} bookmarks to ${outputFile} as ${format}.`);
  });

  return server;
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await createBookmarkMcpServer().connect(transport);
  console.error("Bookmark MCP Server running on stdio");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
