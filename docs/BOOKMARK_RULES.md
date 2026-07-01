# Bookmark Rules Summary

Source: `E:/bookmark/BOOKMARK_RULES.md` copied/summarized for the MCP package.

- Maintain one canonical bookmark file: merge, clean, deduplicate, then export one source of truth.
- Browser-native root layout is required: `Bookmarks bar/` for fast access and `Other Bookmarks/` for archive categories.
- Quick access lives under `Bookmarks bar/__QUICK/` with focused `@PIN`, `@DAILY`, `@AI_FAST`, and `@WORK` subfolders.
- Archive folders live under `Other Bookmarks/#__CATEGORY/##SUBCATEGORY/###LEAF_OR_DOMAIN`.
- Deduplicate by normalized URL and strip tracking parameters where possible.
- Remove empty/invalid bookmarks and obvious trash such as blank titles, internal browser pages, or placeholder titles.
- Titles should be meaningful enough for search and AI classification.
- Keep folder depth shallow and predictable; avoid unprefixed ad-hoc category names.
