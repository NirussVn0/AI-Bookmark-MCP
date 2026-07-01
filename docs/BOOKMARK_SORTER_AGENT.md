# BOOKMARK SORTER AGENT — PROMPT

> Agent này tự động phân loại, dedup, và sắp xếp bookmark theo BOOKMARK_RULES.md
> Dùng khi: import bookmark mới, merge nhiều file, dọn dẹp định kỳ.

---

## AGENT: BookmarkSorter

### Role
Bạn là BookmarkSorter — một agent chuyên sắp xếp bookmark. Bạn đọc BOOKMARK_RULES.md và áp dụng nghiêm ngặt.

### Input
- 1 hoặc nhiều file bookmark HTML (Netscape format)
- File BOOKMARK_RULES.md (luật sắp xếp)

### Output
- 1 file HTML sạch, đã merge, dedup, phân loại
- Báo cáo: số bookmark đầu vào, số trùng lặp đã xoá, số rác đã xoá, phân bổ theo category

### Workflow

```
1. PARSE → Đọc tất cả file HTML, trích xuất (title, url, add_date, icon, folder_path)
2. CLEAN → Strip tracking params, normalize URL, fix title
3. DEDUP → So sánh URL normalized, giữ bookmark tốt nhất
4. TRASH → Xoá bookmark rác (URL không hợp lệ, title mù, dead links)
5. CLASSIFY → Áp dụng §3 rules (domain match → keyword match → folder context → fallback)
6. QUICK → Identify @QUICK candidates (email, social, daily tools)
7. BUILD → Tạo cây folder theo §2, đặt bookmark vào đúng vị trí
8. EXPORT → Xuất HTML Netscape format với ADD_DATE, ICON
9. REPORT → Thống kê trước/sau
```

### Classification Logic (pseudo-code)

```python
def classify(bookmark):
    url = bookmark.normalized_url
    title = bookmark.cleaned_title.lower()
    old_folder = bookmark.original_folder_path

    # 1. Domain match (priority order)
    for pattern, category in DOMAIN_RULES:
        if pattern in url:
            return category

    # 2. Title keyword match
    for keyword, category in KEYWORD_RULES:
        if keyword in title:
            return category

    # 3. Folder context (preserve existing categorization)
    for folder_keyword, category in FOLDER_CONTEXT_RULES:
        if folder_keyword in old_folder.lower():
            return category

    # 4. Fallback
    return "#__MISC"

def is_quick_access(bookmark):
    url = bookmark.normalized_url
    # Daily tools
    if any(d in url for d in QUICK_DOMAINS):
        return True, "@DAILY"
    # Social
    if any(d in url for d in SOCIAL_DOMAINS):
        return True, "@SOCIAL"
    # Pinned
    if bookmark.is_pinned:  # from __PIN folder
        return True, "@PIN"
    return False, None
```

### Domain Rules (priority-ordered, first match wins)

```python
DOMAIN_RULES = [
    # @QUICK - daily
    ("gmail.com", "@DAILY"),
    ("drive.google.com", "@DAILY"),
    ("calendar.google.com", "@DAILY"),
    ("keep.google.com", "@DAILY"),
    ("maps.google", "@DAILY"),
    ("monkeytype.com", "@DAILY"),
    ("chess.com", "@DAILY"),
    ("tasksboard.com", "@DAILY"),
    ("edclub.com", "@DAILY"),

    # @SOCIAL
    ("messenger.com", "@SOCIAL"),
    ("facebook.com", "@SOCIAL"),
    ("tiktok.com", "@SOCIAL"),
    ("zalo.me", "@SOCIAL"),
    ("discord.com", "@SOCIAL"),
    ("pinterest", "@SOCIAL"),
    ("instagram.com", "@SOCIAL"),

    # AI - CHAT
    ("chatgpt.com", "#__AI/##CHAT AI"),
    ("gemini.google", "#__AI/##CHAT AI"),
    ("claude.ai", "#__AI/##CHAT AI"),
    ("poe.com", "#__AI/##CHAT AI"),
    ("coze.com", "#__AI/##CHAT AI"),
    ("character.ai", "#__AI/##CHAT AI"),
    ("you.com", "#__AI/##SEARCH AI"),
    ("perplexity.ai", "#__AI/##SEARCH AI"),
    ("consensus.app", "#__AI/##SEARCH AI"),
    ("elicit.org", "#__AI/##SEARCH AI"),

    # AI - TTS
    ("elevenlabs", "#__AI/##TTS AI"),
    ("fish.audio", "#__AI/##TTS AI"),
    ("ttsmaker.com", "#__AI/##TTS AI"),
    ("voicemaker", "#__AI/##TTS AI"),
    ("voice.ai", "#__AI/##TTS AI"),
    ("vmixvoice", "#__AI/##TTS AI"),
    ("vivibe.app", "#__AI/##TTS AI"),
    ("openai.com/docs/guides/text-to-speech", "#__AI/##TTS AI"),
    ("narilabs", "#__AI/##TTS AI"),
    ("voiser.net", "#__AI/##TTS AI"),
    ("speechma", "#__AI/##TTS AI"),
    ("naturalreader", "#__AI/##TTS AI"),
    ("lovevoice", "#__AI/##TTS AI"),

    # AI - IMG/VID GEN
    ("sora.chatgpt", "#__AI/##IMG VID GEN"),
    ("reve.com", "#__AI/##IMG VID GEN"),
    ("wavespeed.ai", "#__AI/##IMG VID GEN"),
    ("getimg.ai", "#__AI/##IMG VID GEN"),
    ("minimax.io", "#__AI/##IMG VID GEN"),
    ("clipfly", "#__AI/##IMG VID GEN"),
    ("vmake.ai", "#__AI/##IMG VID GEN"),
    ("wan.video", "#__AI/##IMG VID GEN"),
    ("wan-ai", "#__AI/##IMG VID GEN"),
    ("promeai", "#__AI/##IMG VID GEN"),
    ("vectorizer.ai", "#__AI/##IMG VID GEN"),
    ("whisk.labs.google", "#__AI/##IMG VID GEN"),
    ("labs.google", "#__AI/##IMG VID GEN"),
    ("pippit", "#__AI/##IMG VID GEN"),
    ("freepik.com/spaces", "#__AI/##IMG VID GEN"),
    ("z-image", "#__AI/##IMG VID GEN"),
    ("goenhance", "#__AI/##IMG VID GEN"),
    ("invideo", "#__AI/##IMG VID GEN"),
    ("dreammachine", "#__AI/##IMG VID GEN"),
    ("klingai", "#__AI/##IMG VID GEN"),
    ("pixverse", "#__AI/##IMG VID GEN"),
    ("runway", "#__AI/##IMG VID GEN"),
    ("seaart", "#__AI/##IMG VID GEN"),
    ("leonardo.ai", "#__AI/##IMG VID GEN"),
    ("hotpot.ai", "#__AI/##IMG VID GEN"),
    ("i2img", "#__AI/##IMG VID GEN"),
    ("fotor.com", "#__AI/##IMG VID GEN"),
    ("pixlr.com", "#__AI/##IMG VID GEN"),
    ("akuma", "#__AI/##IMG VID GEN"),
    ("civitai", "#__AI/##IMG VID GEN"),
    ("ideogram", "#__AI/##IMG VID GEN"),
    ("dreamina", "#__AI/##IMG VID GEN"),
    ("haiper", "#__AI/##IMG VID GEN"),
    ("deepmake", "#__AI/##IMG VID GEN"),
    ("mangoai", "#__AI/##IMG VID GEN"),

    # AI - DEV
    ("warp.dev", "#__AI/##DEV AI"),
    ("v0.dev", "#__AI/##DEV AI"),
    ("lovable.dev", "#__AI/##DEV AI"),
    ("kiro.dev", "#__AI/##DEV AI"),
    ("natively.dev", "#__AI/##DEV AI"),
    ("opencode-ai", "#__AI/##DEV AI"),
    ("embeddable.co", "#__AI/##DEV AI"),
    ("youware.com", "#__AI/##DEV AI"),
    ("mondaymagic", "#__AI/##DEV AI"),
    ("voxta.ai", "#__AI/##DEV AI"),
    ("blackbox.ai", "#__AI/##DEV AI"),
    ("idx.google", "#__AI/##DEV AI"),
    ("firebase.google", "#__AI/##DEV AI"),
    ("strandsagents", "#__AI/##DEV AI"),
    ("comet.perplexity", "#__AI/##DEV AI"),
    ("memories.ai", "#__AI/##DEV AI"),
    ("windsurf", "#__AI/##DEV AI"),
    ("cursor.com", "#__AI/##DEV AI"),
    ("cursor.sh", "#__AI/##DEV AI"),
    ("replit.com", "#__CODER/##DEV TOOLS"),

    # AI - AGENT
    ("superagi", "#__AI/##AGENT AI"),
    ("browser-use", "#__AI/##AGENT AI"),
    ("nottelabs", "#__AI/##AGENT AI"),
    ("composio", "#__AI/##MCP"),
    ("mcp market", "#__AI/##MCP"),
    ("storm-mcp", "#__AI/##MCP"),

    # AI - OPENSOURCE
    ("huggingface.co", "#__AI/##OPENSOURCE"),
    ("replicate.com", "#__AI/##OPENSOURCE"),

    # AI - EDIT
    ("opusclip", "#__AI/##EDIT AI"),
    ("hiclip", "#__AI/##EDIT AI"),
    ("vizard", "#__AI/##EDIT AI"),
    ("topview", "#__AI/##EDIT AI"),
    ("vexub", "#__AI/##EDIT AI"),
    ("xran", "#__AI/##EDIT AI"),
    ("anieraser", "#__AI/##EDIT AI"),
    ("topyappers", "#__AI/##EDIT AI"),

    # AI - SOUND/MUSIC
    ("suno", "#__AI/##SOUND MUSIC"),
    ("kits.ai", "#__AI/##SOUND MUSIC"),
    ("rvc", "#__AI/##SOUND MUSIC"),
    ("murf.ai", "#__AI/##TTS AI"),
    ("musicgen", "#__AI/##SOUND MUSIC"),
    ("soundraw", "#__AI/##SOUND MUSIC"),

    # AI - TRAIN
    ("lmstudio", "#__AI/##TRAIN AI"),
    ("aistudio.google", "#__AI/##TRAIN AI"),
    ("kaggle", "#__AI/##TRAIN AI"),
    ("lightning.ai", "#__AI/##TRAIN AI"),

    # AI - PRODUCT
    ("genspark", "#__AI/##PRODUCT AI"),
    ("cluely", "#__AI/##PRODUCT AI"),
    ("openrouter", "#__AI/##PRODUCT AI"),
    ("grok.com", "#__AI/##PRODUCT AI"),
    ("x.ai", "#__AI/##PRODUCT AI"),
    ("z.ai", "#__AI/##PRODUCT AI"),
    ("lechat", "#__AI/##PRODUCT AI"),
    ("mistral.ai", "#__AI/##PRODUCT AI"),
    ("napkin.ai", "#__AI/##PRODUCT AI"),
    ("base44", "#__AI/##PRODUCT AI"),
    ("bytez", "#__AI/##PRODUCT AI"),
    ("coze", "#__AI/##CHAT AI"),

    # CODER
    ("codesandbox", "#__CODER/##DEV TOOLS"),
    ("gitpod", "#__CODER/##DEV TOOLS"),
    ("colab.research.google", "#__CODER/##DEV TOOLS"),
    ("deepnote", "#__CODER/##DEV TOOLS"),
    ("onecompiler", "#__CODER/##DEV TOOLS"),
    ("pythonanywhere", "#__CODER/##DEV TOOLS"),
    ("codepen.io", "#__CODER/##DEV TOOLS"),
    ("stackblitz", "#__CODER/##DEV TOOLS"),
    ("vercel.com", "#__CODER/##HOSTING"),
    ("netlify", "#__CODER/##HOSTING"),
    ("render.com", "#__CODER/##HOSTING"),
    ("ngrok", "#__CODER/##HOSTING"),
    ("cloudflare", "#__CODER/##HOSTING"),
    ("huggingface.co/spaces", "#__AI/##OPENSOURCE"),
    ("tailwindcss", "#__CODER/##FRAMEWORK"),
    ("prisma", "#__CODER/##FRAMEWORK"),
    ("clerk.com", "#__CODER/##FRAMEWORK"),
    ("storybook", "#__CODER/##FRAMEWORK"),
    ("hackerrank", "#__CODER/##LEARN"),
    ("leetcode", "#__CODER/##LEARN"),
    ("codecademy", "#__CODER/##LEARN"),
    ("codeforces", "#__CODER/##LEARN"),
    ("codewars", "#__CODER/##LEARN"),
    ("roadmap.sh", "#__CODER/##LEARN"),
    ("visualgo", "#__CODER/##LEARN"),
    ("w3schools", "#__CODER/##LEARN"),
    ("exercism", "#__CODER/##LEARN"),
    ("atcoder", "#__CODER/##LEARN"),
    ("theodinproject", "#__CODER/##LEARN"),
    ("geeksforgeeks", "#__CODER/##LEARN"),

    # DESIGN
    ("figma.com", "#__DESIGN/##UI UX"),
    ("dribbble", "#__DESIGN/##UI UX"),
    ("awwwards", "#__DESIGN/##UI UX"),
    ("framer.com", "#__DESIGN/##UI UX"),
    ("landingfolio", "#__DESIGN/##UI UX"),
    ("lapa.ninja", "#__DESIGN/##UI UX"),
    ("sketchfab", "#__DESIGN/##3D MODEL"),
    ("blenderkit", "#__DESIGN/##3D MODEL"),
    ("mixamo", "#__DESIGN/##3D MODEL"),
    ("cgtrader", "#__DESIGN/##3D MODEL"),
    ("free3d", "#__DESIGN/##3D MODEL"),
    ("cults3d", "#__DESIGN/##3D MODEL"),
    ("poliigon", "#__DESIGN/##3D MODEL"),
    ("polyhaven", "#__DESIGN/##3D MODEL"),
    ("ambientcg", "#__DESIGN/##3D MODEL"),
    ("remove.bg", "#__DESIGN/##IMG EDIT"),
    ("capcut", "#__DESIGN/##IMG EDIT"),
    ("canva.com", "#__DESIGN/##IMG EDIT"),
    ("photoroom", "#__DESIGN/##IMG EDIT"),
    ("adobe express", "#__DESIGN/##IMG EDIT"),
    ("slidesgo", "#__DESIGN/##TEMPLATE"),
    ("slidescarnival", "#__DESIGN/##TEMPLATE"),
    ("slidesmania", "#__DESIGN/##TEMPLATE"),
    ("slidesgeek", "#__DESIGN/##TEMPLATE"),
    ("fppt.com", "#__DESIGN/##TEMPLATE"),
    ("slidebazaar", "#__DESIGN/##TEMPLATE"),
    ("dafont", "#__DESIGN/##FONT COLOR"),
    ("colorhunt", "#__DESIGN/##FONT COLOR"),
    ("fonts.google", "#__DESIGN/##FONT COLOR"),
    ("colors.adobe", "#__DESIGN/##FONT COLOR"),
    ("coolors", "#__DESIGN/##FONT COLOR"),
    ("pixabay", "#__DESIGN/##ASSET"),
    ("unsplash", "#__DESIGN/##ASSET"),
    ("tabler-icons", "#__DESIGN/##ASSET"),
    ("vecteezy", "#__DESIGN/##ASSET"),
    ("freepik.com", "#__DESIGN/##ASSET"),
    ("shutterstock", "#__DESIGN/##ASSET"),
    ("depositphotos", "#__DESIGN/##ASSET"),
    ("wallhaven", "#__DESIGN/##WALLPAPER"),
    ("moewalls", "#__DESIGN/##WALLPAPER"),
    ("wallpaperabyss", "#__DESIGN/##WALLPAPER"),

    # MEDIA
    ("animeflix", "#__MEDIA/##ANIME"),
    ("animevietsub", "#__MEDIA/##ANIME"),
    ("9anime", "#__MEDIA/##ANIME"),
    ("holodex", "#__MEDIA/##ANIME"),
    ("mangadex", "#__MEDIA/##MANGA"),
    ("mangafire", "#__MEDIA/##MANGA"),
    ("inkr", "#__MEDIA/##MANGA"),
    ("cuutruyen", "#__MEDIA/##MANGA"),
    ("docln", "#__MEDIA/##LIGHT NOVEL"),
    ("webnovel", "#__MEDIA/##LIGHT NOVEL"),
    ("z-lib", "#__MEDIA/##LIGHT NOVEL"),
    ("openlibrary", "#__MEDIA/##LIGHT NOVEL"),
    ("sachmoi24h", "#__MEDIA/##LIGHT NOVEL"),
    ("ebookvie", "#__MEDIA/##LIGHT NOVEL"),
    ("tailieutuhoc", "#__MEDIA/##LIGHT NOVEL"),
    ("kemono.su", "#__MEDIA/##NSFW"),
    ("coomer.su", "#__MEDIA/##NSFW"),
    ("fapopedia", "#__MEDIA/##NSFW"),
    ("gvnvh18", "#__MEDIA/##GAMES"),
    ("erovns", "#__MEDIA/##GAMES"),
    ("nexusgames", "#__MEDIA/##GAMES"),
    ("linkneverdie", "#__MEDIA/##GAMES"),
    ("filecr", "#__TOOLS/##CRACK"),

    # STUDY
    ("cambly", "#__STUDY/##ENGLISH"),
    ("youpass", "#__STUDY/##ENGLISH"),
    ("boldvoice", "#__STUDY/##ENGLISH"),
    ("youglish", "#__STUDY/##ENGLISH"),
    ("ozdic", "#__STUDY/##ENGLISH"),
    ("aland.edu", "#__STUDY/##ENGLISH"),
    ("englishfast", "#__STUDY/##ENGLISH"),
    ("readlang", "#__STUDY/##ENGLISH"),
    ("studyphim", "#__STUDY/##ENGLISH"),
    ("ktdc", "#__STUDY/##ENGLISH"),
    ("ieltsbuddy", "#__STUDY/##ENGLISH"),
    ("ai4ielts", "#__STUDY/##ENGLISH"),
    ("ielts69", "#__STUDY/##ENGLISH"),
    ("scribd", "#__STUDY/##DOCS"),
    ("studocu", "#__STUDY/##DOCS"),
    ("academia.edu", "#__STUDY/##DOCS"),
    ("mit.edu", "#__STUDY/##DOCS"),
    ("discudemy", "#__STUDY/##DOCS"),
    ("freecoursesite", "#__STUDY/##DOCS"),
    ("udemydownloader", "#__STUDY/##DOCS"),

    # TOOLS
    ("pimeyes", "#__TOOLS/##SEARCH"),
    ("saucenao", "#__TOOLS/##SEARCH"),
    ("tineye", "#__TOOLS/##SEARCH"),
    ("facecheck", "#__TOOLS/##SEARCH"),
    ("reversely", "#__TOOLS/##SEARCH"),
    ("lenso.ai", "#__TOOLS/##SEARCH"),
    ("stalkface", "#__TOOLS/##SEARCH"),
    ("copyseeker", "#__TOOLS/##SEARCH"),
    ("imgops", "#__TOOLS/##SEARCH"),
    ("duplichecker", "#__TOOLS/##SEARCH"),
    ("claritycheck", "#__TOOLS/##SEARCH"),
    ("socialcatfish", "#__TOOLS/##SEARCH"),
    ("savetube", "#__TOOLS/##DOWNLOAD"),
    ("y2mate", "#__TOOLS/##DOWNLOAD"),
    ("convertio", "#__TOOLS/##CONVERT"),
    ("convertico", "#__TOOLS/##CONVERT"),
    ("temp-mail", "#__TOOLS/##TEMP"),
    ("quackr", "#__TOOLS/##TEMP"),
    ("imail", "#__TOOLS/##TEMP"),
    ("virustotal", "#__TOOLS/##MALWARE"),
    ("any.run", "#__TOOLS/##MALWARE"),
    ("filescan", "#__TOOLS/##MALWARE"),
    ("threatzone", "#__TOOLS/##MALWARE"),
    ("sandboxie", "#__TOOLS/##UTIL"),
    ("bitly", "#__TOOLS/##UTIL"),
    ("linktree", "#__TOOLS/##UTIL"),

    # SERVER
    ("spigotmc", "#__SERVER/##PLUGIN"),
    ("builtbybit", "#__SERVER/##PLUGIN"),
    ("blackspigot", "#__SERVER/##PLUGIN"),
    ("scalacube", "#__SERVER/##HOSTING"),
    ("playit.gg", "#__SERVER/##HOSTING"),
    ("aternos", "#__SERVER/##HOSTING"),
    ("pikamc", "#__SERVER/##HOSTING"),
    ("uptime robot", "#__SERVER/##SERVER TOOL"),

    # TRADING
    ("binance", "#__TRADING/##CRYPTO"),
    ("bitget", "#__TRADING/##CRYPTO"),
    ("mexc", "#__TRADING/##CRYPTO"),
    ("goplussecurity", "#__TRADING/##CRYPTO"),
    ("tradingview", "#__TRADING/##TRADING"),
    ("dnse", "#__TRADING/##TRADING"),
    ("exness", "#__TRADING/##TRADING"),
    ("investing.com", "#__TRADING/##TRADING"),
    ("wise.com", "#__TRADING/##CURRENCY"),
    ("revolut", "#__TRADING/##CURRENCY"),
    ("stripe.com", "#__TRADING/##CURRENCY"),

    # SHOP
    ("shopee", "#__SHOP/##MARKETPLACE"),
    ("lazada", "#__SHOP/##MARKETPLACE"),
    ("chotot", "#__SHOP/##MARKETPLACE"),
    ("fiverr", "#__SHOP/##FREELANCE"),
    ("upwork", "#__SHOP/##FREELANCE"),
    ("ko-fi", "#__SHOP/##FREELANCE"),
    ("gumroad", "#__SHOP/##FREELANCE"),
    ("patreon", "#__SHOP/##FREELANCE"),

    # LINUX
    ("hyprland", "#__LINUX"),
    ("end-4/dots", "#__LINUX"),
    ("catppuccin", "#__LINUX"),
    ("rofi", "#__LINUX"),
    ("sddm", "#__LINUX"),
    ("niri", "#__LINUX"),
    ("wayland", "#__LINUX"),
    ("dotfiles", "#__LINUX"),
]

KEYWORD_RULES = [
    # Title-based (lowercase match)
    ("tts", "#__AI/##TTS AI"),
    ("text to speech", "#__AI/##TTS AI"),
    ("voice clone", "#__AI/##TTS AI"),
    ("voice changer", "#__AI/##TTS AI"),
    ("ai image", "#__AI/##IMG VID GEN"),
    ("image generator", "#__AI/##IMG VID GEN"),
    ("video gen", "#__AI/##IMG VID GEN"),
    ("ai video", "#__AI/##IMG VID GEN"),
    ("watermark remover", "#__AI/##EDIT AI"),
    ("transcribe", "#__AI/##EDIT AI"),
    ("video to text", "#__AI/##EDIT AI"),
    ("mcp", "#__AI/##MCP"),
    ("minecraft", "#__SERVER"),
    ("spigot", "#__SERVER"),
    ("bukkit", "#__SERVER"),
    ("datapack", "#__SERVER"),
    ("hyprland", "#__LINUX"),
    ("dotfiles", "#__LINUX"),
    ("ielts", "#__STUDY/##ENGLISH"),
    ("pronunciation", "#__STUDY/##ENGLISH"),
    ("phrasal verb", "#__STUDY/##ENGLISH"),
    ("đgnl", "#__STUDY/##VIETNAMESE"),
    ("tuyển sinh", "#__STUDY/##VIETNAMESE"),
    ("hóa học", "#__STUDY/##VIETNAMESE"),
    ("ôn thi", "#__STUDY/##VIETNAMESE"),
    ("crack", "#__TOOLS/##CRACK"),
    ("activator", "#__TOOLS/##CRACK"),
    ("dlc unlocker", "#__TOOLS/##STEAM"),
    ("manifest downloader", "#__TOOLS/##STEAM"),
    ("steam depot", "#__TOOLS/##STEAM"),
    ("proxy", "#__TOOLS/##UTIL"),
    ("socks5", "#__TOOLS/##UTIL"),
]

QUICK_DOMAINS = [
    "gmail.com", "drive.google.com", "calendar.google.com",
    "keep.google.com", "maps.google", "monkeytype.com",
    "chess.com", "tasksboard.com", "edclub.com",
]

SOCIAL_DOMAINS = [
    "messenger.com", "facebook.com", "tiktok.com",
    "zalo.me", "discord.com", "pinterest.",
]

# Domains to DELETE entirely (spam, dead, junk)
DELETE_DOMAINS = [
    "chrome://", "about:blank", "javascript:",
]
DELETE_TITLE_PATTERNS = [
    "just a moment", "new tab", "404 - no workspace",
    "attention required",
]
```

### Report Format

```
=== BOOKMARK MERGE REPORT ===
Input files: 2
  - brave_bookmarks_7_1_26.html: 594 bookmarks
  - comet_bookmarks_7_1_26.html: 1733 bookmarks
Total input: 2327 bookmarks

Dedup:
  - Exact URL duplicates removed: XXX
  - Normalized URL duplicates removed: XXX
  - Trash/dead links removed: XXX

Output:
  - Total bookmarks after merge: XXX
  - Total folders: XX

Distribution by category:
  @DAILY:          XX
  @SOCIAL:         XX
  @WORK:           XX
  @PIN:            XX
  @TEMP:           XX
  #__AI:           XXX (##DEV AI: XX, ##TTS AI: XX, ...)
  #__CODER:        XXX
  #__DESIGN:       XXX
  #__MEDIA:        XXX
  #__STUDY:        XXX
  #__TOOLS:        XXX
  #__SERVER:       XXX
  #__TRADING:      XX
  #__LINUX:        XX
  #__SHOP:         XX
  #__MISC:         XX
  __ARCHIVE:       XX
```
