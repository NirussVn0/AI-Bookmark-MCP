import assert from "node:assert/strict";
import { parseChromiumBookmarksJson } from "../src/browser-importers.js";

const sample = {
  roots: {
    bookmark_bar: {
      type: "folder",
      name: "Bookmarks bar",
      children: [
        { type: "url", name: "Example", url: "https://example.com", date_added: "13300000000000000" },
        { type: "folder", name: "Dev", children: [{ type: "url", name: "MCP", url: "https://modelcontextprotocol.io" }] },
      ],
    },
    other: { type: "folder", name: "Other Bookmarks", children: [{ type: "url", name: "Docs", url: "https://docs.example.com" }] },
  },
};

const bookmarks = parseChromiumBookmarksJson(sample);
assert.equal(bookmarks.length, 3);
assert.equal(bookmarks[0].folderPath, "Bookmarks bar");
assert.equal(bookmarks[1].folderPath, "Bookmarks bar/Dev");
assert.equal(bookmarks[2].folderPath, "Other Bookmarks");
console.log("browser importers smoke ok");
