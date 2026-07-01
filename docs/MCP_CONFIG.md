# MCP Configuration Guide

This guide shows how to connect Bookmark MCP to MCP-capable clients.

## Build first

```bash
cd E:/bookmark/mcp-server
npm install
npm run build
```

Compiled entrypoint:

```text
E:/bookmark/mcp-server/dist/index.js
```

Development entrypoint:

```text
E:/bookmark/mcp-server/src/index.ts
```

---

## Generic MCP JSON

Production/compiled:

```json
{
  "mcpServers": {
    "bookmark-mcp": {
      "command": "node",
      "args": ["E:/bookmark/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Development/source:

```json
{
  "mcpServers": {
    "bookmark-mcp-dev": {
      "command": "npx",
      "args": ["tsx", "E:/bookmark/mcp-server/src/index.ts"],
      "env": {}
    }
  }
}
```

---

## Claude Desktop example

Add to Claude Desktop MCP config. The exact file path depends on OS and Claude version.

Windows-style example:

```json
{
  "mcpServers": {
    "bookmark-mcp": {
      "command": "node",
      "args": ["E:/bookmark/mcp-server/dist/index.js"]
    }
  }
}
```

After editing config:

1. Restart Claude Desktop.
2. Ask Claude: `Use bookmark-mcp stats on E:/bookmark/bookmarks_merged.html`.

---

## opencode example

Use your opencode MCP configuration location and add:

```json
{
  "mcpServers": {
    "bookmark-mcp": {
      "command": "node",
      "args": ["E:/bookmark/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Suggested first prompt:

```text
Use bookmark-mcp to read E:/bookmark/bookmarks_merged.html, then search for "mcp" and show the top 10 bookmarks.
```

---

## Chrome/CDP setup for browser tools

Browser tools require Chrome/Chromium remote debugging.

### Windows

Close existing Chrome windows if needed, then run one of:

```powershell
chrome.exe --remote-debugging-port=9222
```

or with a dedicated profile:

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="$env:TEMP\bookmark-mcp-chrome"
```

If `chrome.exe` is not on PATH, use the full path, for example:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### macOS

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### Linux

```bash
google-chrome --remote-debugging-port=9222
```

Verify with the MCP tool:

```json
{
  "host": "localhost",
  "port": 9222
}
```

using `check_browser_connection`.

---

## Recommended local paths

These paths are examples from the original local workspace. Replace them for your repo.

```text
Bookmark HTML: E:/bookmark/bookmarks_merged.html
SQLite index:  E:/bookmark/mcp-server/bookmarks-content.db
Server:        E:/bookmark/mcp-server/dist/index.js
```

---

## Common troubleshooting

### `Cannot find module ... dist/index.js`

Run:

```bash
npm run build
```

### `Chrome DevTools Protocol is not available at localhost:9222`

Start Chrome with:

```bash
chrome --remote-debugging-port=9222
```

Then call `check_browser_connection` again.

### SQLite native dependency issues

`better-sqlite3` uses native bindings. Try:

```bash
npm rebuild better-sqlite3
```

If publishing this repo, include CI for the Node versions and OSes you support.

### MCP client cannot access relative paths

Use absolute paths. MCP servers often run with a different working directory than your shell.
