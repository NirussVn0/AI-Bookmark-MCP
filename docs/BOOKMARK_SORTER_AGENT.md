# Bookmark Sorter Agent Summary

Source: `E:/bookmark/bookmark_sorter_agent.md` copied/summarized for the MCP package.

Workflow: parse HTML exports, clean titles/URLs, deduplicate, remove trash, classify using domain/keyword/folder context, build `Bookmarks bar` quick access plus `Other Bookmarks` archive, export Netscape HTML, and report before/after counts.

MCP/CLI equivalents:

- `merge` / `ai-bookmark-mcp merge --out merged.html a.html b.html`
- `export` / `ai-bookmark-mcp export --format json --out bookmarks.json input.html`
- `stats` / `ai-bookmark-mcp stats input.html`
- `index_bookmarks` / `ai-bookmark-mcp index --db content.db input.html`
