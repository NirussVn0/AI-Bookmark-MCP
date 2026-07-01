import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { Bookmark } from "./parser.js";

interface ChromiumNode { type?: string; name?: string; url?: string; children?: ChromiumNode[]; date_added?: string; }
interface ChromiumBookmarksJson { roots?: Record<string, ChromiumNode>; }

export function parseChromiumBookmarksJson(json: string | ChromiumBookmarksJson): Bookmark[] {
  const parsed: ChromiumBookmarksJson = typeof json === "string" ? JSON.parse(json) : json;
  const roots = parsed.roots ?? {};
  const bookmarks: Bookmark[] = [];
  for (const [rootName, root] of Object.entries(roots)) {
    walkChromiumNode(root, humanRootName(rootName, root.name), bookmarks);
  }
  return bookmarks;
}

function walkChromiumNode(node: ChromiumNode, folderPath: string, out: Bookmark[]): void {
  if (node.type === "url" && node.url) {
    out.push({ title: node.name || node.url, url: node.url, folderPath, addDate: chromiumTimeToUnix(node.date_added) });
    return;
  }
  const nextFolder = node.name && node.name !== folderPath.split("/").at(-1) ? joinFolder(folderPath, node.name) : folderPath;
  for (const child of node.children ?? []) walkChromiumNode(child, nextFolder, out);
}

function humanRootName(key: string, name?: string): string {
  if (name) return name;
  if (key === "bookmark_bar") return "Bookmarks bar";
  if (key === "other") return "Other Bookmarks";
  if (key === "synced") return "Mobile Bookmarks";
  return key;
}

function joinFolder(a: string, b: string): string { return a ? `${a}/${b}` : b; }

function chromiumTimeToUnix(value?: string): string | undefined {
  if (!value) return undefined;
  const micros = Number(value);
  if (!Number.isFinite(micros)) return undefined;
  return String(Math.floor((micros / 1_000_000) - 11644473600));
}

export function detectBrowserBookmarkPaths(): Array<{ browser: string; profile: string; path: string; exists: boolean }> {
  const home = os.homedir();
  const local = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const config = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  const bases = process.platform === "win32" ? [
    ["Chrome", path.join(local, "Google", "Chrome", "User Data")],
    ["Edge", path.join(local, "Microsoft", "Edge", "User Data")],
    ["Brave", path.join(local, "BraveSoftware", "Brave-Browser", "User Data")],
  ] : [
    ["Chrome", path.join(config, "google-chrome")],
    ["Chromium", path.join(config, "chromium")],
    ["Brave", path.join(config, "BraveSoftware", "Brave-Browser")],
  ];
  const profiles = ["Default", "Profile 1", "Profile 2", "Profile 3"];
  return bases.flatMap(([browser, base]) => profiles.map((profile) => {
    const p = path.join(base, profile, "Bookmarks");
    return { browser, profile, path: p, exists: fs.existsSync(p) };
  }));
}
