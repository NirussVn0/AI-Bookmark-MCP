---
name: bookmark-mcp
description: Use when working with AI Bookmark MCP, browser bookmark HTML exports, BOOKMARK_RULES.md, bookmark_sorter_agent.md, local full-text bookmark indexing, or Chrome/CDP bookmark reading.
---

# Bookmark MCP

Use for browser bookmark exports, local content indexing/search, Chrome/CDP reading, and AI-assisted bookmark cleanup.

Prefer offline tools first: `read`, `stats`, `get_tree`, `merge`, `export`, `index_bookmarks`, `search_bookmarks_fulltext`.

AI preparation tools: `summarize_bookmarks`, `find_related`, `classify_with_content`, `get_reading_list`.

Never assume network, Chrome, or browser-harness is available. Check first with `check_browser_connection` or `check_browser_harness`.
