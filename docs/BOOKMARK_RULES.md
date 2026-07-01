# BOOKMARK RULES — HỆ THỐNG LUẬT SẮP XẾP BOOKMARK

> Version: 1.0 | Áp dụng cho mọi file bookmark import/export (Brave, Chrome, Comet, Edge, Firefox)
> Mục tiêu: 1 file duy nhất, không trùng lặp, tìm được trong ≤3 cú click.

---

## 0. NGUYÊN TẮC CỐT LÕI

1. **MỘT file, MỘT nguồn sự thật.** Không bao giờ giữ 2 file bookmark song song. Merge → dedup → 1 file.
2. **Hai lớp:** `@QUICK` (truy cập nhanh, ≤50 item) và `#__TỦ` (all bookmarks, archive).
3. **Marker prefix là KHÔNG thay thế.** Folder prefix xác định lớp và loại — không được tự đặt tên folder không có prefix.
4. **Mỗi bookmark chỉ xuất hiện MỘT lần.** Dedup theo normalized URL (xem §4). Nếu cần xuất hiện ở nhiều nơi → đặt ở `#__TỦ` và tham chiếu bằng `@QUICK`.
5. **Không bookmark rỗng.** Bookmark không title HOẶC không URL hợp lệ → xoá.
6. **URL luôn sạch.** Strip tracking params (utm_*, fbclid, gclid, ref, _ga, etc.) trước khi lưu.
7. **Title phải có nghĩa.** Nếu title là "New Tab", "Just a moment...", "(1) Messenger", URL rút gọn mù → đổi title thành dạng mô tả.
8. **Folder sâu tối đa 3 cấp.** `#__TỦ / #__AI / ##DEV AI` = 3 cấp. Không sâu hơn.

---

## 1. HỆ THỐNG PREFIX (MARKER)

| Prefix | Ý nghĩa | Vị trí | Ví dụ |
|--------|---------|--------|-------|
| `@` | **QUICK ACCESS** — truy cập thường xuyên, pinned, daily driver | Luôn ở top, ngay dưới bookmarks bar | `@DAILY`, `@SOCIAL`, `@WORK`, `@TEMP` |
| `#` | **CATEGORY ARCHIVE** — tất cả bookmark thuộc lĩnh vực đó | Sau `@`, nhóm theo domain | `#__AI`, `#__CODER`, `#__DESIGN` |
| `##` | **SUBCATEGORY** — phân loại con trong `#` | Bên trong `#` folder | `##DEV AI`, `##TTS AI`, `##HOSTING` |
| `__` | **SYSTEM/META** — folder hệ thống, không chứa bookmark thường | Cuối file hoặc ẩn | `__PIN`, `__ARCHIVE`, `__TRASH` |

### Quy tắc prefix:
- `@` folder: **tối đa 50 bookmark tổng**, chỉ chứa cái mở ≥1 lần/tuần. Nếu ít hơn → gộp. Nếu nhiều hơn → tách sub.
- `#` folder: không giới hạn, là kho lưu trữ. Mỗi `#` phải có ít nhất 5 bookmark, nếu không → gộp vào `#__MISC`.
- `##` sub: tối thiểu 3 bookmark. Ít hơn → đẩy lên làm bookmark trực tiếp của `#` cha.
- `__` folder: chỉ cho `__PIN` (bookmark ghim từ `@`), `__ARCHIVE` (bookmark cũ >6 tháng không mở), `__TRASH` (chờ xoá).

---

## 2. CẤU TRÚC FOLDER CHUẨN

### 2.0. Browser-native top level (BẮT BUỘC từ v2)

Top-level trong file import phải đúng mental model browser:

```
Bookmarks bar/
├── [icon-only shortcuts]       ← link title rỗng, chỉ hiện favicon, bấm 1 phát vào luôn
└── __QUICK/                    ← truy cập nhanh có phân cấp nhỏ

Other Bookmarks/                ← toàn bộ archive, phân tầng 3–4 lớp
└── #__CATEGORY/##SUB/###DOMAIN/
```

Không đặt toàn bộ `#__AI`, `#__CODER` trực tiếp ngoài root nữa. Tất cả archive phải nằm trong `Other Bookmarks`.

### 2.1. Bookmarks bar rules

`Bookmarks bar` gồm 2 phần:

1. **Icon-only direct shortcuts**: Gmail, Drive, Keep, Maps, Messenger, Discord, ChatGPT, Gemini, Claude, Perplexity, YouTube. Title rỗng để tiết kiệm chiều ngang.
2. **`__QUICK`**: folder truy cập nhanh có phân cấp:

```
__QUICK/
├── @PIN/
│   ├── @PIN_AI_CHAT/
│   ├── @PIN_AI_GEMS/
│   ├── @PIN_YOUTUBE_SAVE/
│   ├── @PIN_STORE_ACCOUNT/
│   ├── @PIN_SERVER_MC/
│   ├── @PIN_WORK_PROJECT/
│   └── @PIN_INBOX_REVIEW/
├── @DAILY/
│   ├── @DAILY_GOOGLE/
│   ├── @DAILY_TASKS/
│   └── @DAILY_PRACTICE/
├── @AI_FAST/
│   ├── @AI_CHAT/
│   ├── @AI_DEV/
│   └── @AI_CREATIVE/
└── @WORK/
    ├── @WORK_DASHBOARD/
    └── @WORK_SERVER/
```

`@PIN` không được là một thùng gom chung. Mọi pin phải đi vào đúng folder nhỏ.

### 2.2. Other Bookmarks deep archive rules

Archive phải cho phép 3–4 tầng:

```
Other Bookmarks/#__CODER/##GITHUB_REPOS/###AI_AGENT_LLM/
Other Bookmarks/#__AI/##CREATIVE/###IMAGE_GEN/
Other Bookmarks/#__TOOLS/##PRIVACY_TEMP/###PROXY_BROWSER/
```

GitHub repos phải ưu tiên phân theo mảng:

```
##GITHUB_REPOS/
├── ###AI_AGENT_LLM/
├── ###MINECRAFT/
├── ###SECURITY_RE/
├── ###CRACK_ACTIVATION/
├── ###SYSTEM_OS_UTILS/
├── ###WEB_APP_API/
├── ###GAME_DEV_STEAM/
├── ###MEDIA_DESIGN_TOOLS/
├── ###DATA_DEVOPS/
└── ###LEARNING/
```

```
Bookmarks bar/
├── @DAILY/              ← Email, Drive, Calendar, Keep, Typing, Chess — mở mỗi ngày
├── @SOCIAL/             ← Messenger, Facebook, TikTok, Zalo, Discord, Pinterest
├── @WORK/               ← Project dashboards, SonarQube, Harness, design docs
├── @PIN/                ← Ghim nhanh: LLMGate, Mixboard, OpenViking, WeScan, v.v.
├── @TEMP/               ← Lưu tạm, review hàng tuần, xoá nếu không cần
│
├── #__AI/               ← TẤT CẢ AI tools
│   ├── ##DEV AI/        ← AI coding agents, IDE (Warp, Cursor, Lovable, v0, Kiro)
│   ├── ##TTS AI/        ← Text-to-speech, voice clone (ElevenLabs, Whisper, Fish Audio)
│   ├── ##IMG VID GEN/   ← Image/video generation (Sora, Reve, MiniMax, WaveSpeed)
│   ├── ##AGENT AI/      ← Agent platforms (SuperAGI, Composio, MCP, browser-use)
│   ├── ##PRODUCT AI/    ← AI productivity (Genspark, Cluely, OpenRouter, Grok)
│   ├── ##OPENSOURCE/    ← GitHub AI repos (airi, whisper, TTS, Dia, Zonos)
│   ├── ##EDIT AI/       ← AI video/image editing (OpusClip, watermark remover, Vexub)
│   ├── ##CHAT AI/       ← Chatbots (ChatGPT, Gemini, Claude, Coze, Poe)
│   ├── ##SEARCH AI/     ← AI search (Perplexity, Felo, Consensus, You.com)
│   ├── ##SOUND MUSIC/   ← AI music/voice models (Suno, RVC, Kits AI, Beatrice)
│   ├── ##TRAIN AI/      ← Model training (LM Studio, Google AI Studio, Replicate)
│   └── ##MCP/           ← MCP servers (Storm MCP, Composio, MCP Market)
│
├── #__CODER/            ← Development & coding
│   ├── ##DEV TOOLS/     ← IDE, repl, platforms (Replit, CodeSandbox, Gitpod, Colab)
│   ├── ##HOSTING/       ← VPS, domain, deploy (Vercel, Render, Netlify, ngrok)
│   ├── ##FRAMEWORK/     ← Libraries, frameworks (Tailwind, Prisma, Clerk, Storybook)
│   ├── ##TUTORIALS/     ← Tutorials, courses (W3Schools, roadmap.sh, Scrimba, OSSU)
│   ├── ##COMPETITIVE/   ← Coding challenges (HackerRank, LeetCode, Codeforces, VNOJ)
│   ├── ##SOURCE CODE/   ← GitHub repos & projects (massgravel, SuperAGI, opencode)
│   ├── ##GITHUB PROFILE/← GitHub user profiles
│   ├── ##API REF/       ← API documentation (OpenAI, Pinecone, Material UI, jsDelivr)
│   └── ##HACK CODE/     ← Security, pentesting, reverse engineering repos
│
├── #__DESIGN/           ← Design & graphics
│   ├── ##UI UX/         ← UI design (Figma, Framer, Dribbble, Awwwards, landing pages)
│   ├── ##3D MODEL/      ← 3D models, textures (Sketchfab, BlenderKit, Mixamo, Meshy)
│   ├── ##IMG EDIT/      ← Image editors (remove.bg, CapCut, Pixlr, Canva, Photoroom)
│   ├── ##VIDEO EDIT/    ← Video editors (VEED, Runway, CapCut, musicvid)
│   ├── ##TEMPLATE/      ← Slides, PPT templates (Slidesgo, SlidesCarnival, FPPT)
│   ├── ##FONT COLOR/    ← Fonts, color palettes (DaFont, Color Hunt, Google Fonts)
│   ├── ##ASSET/         ← Stock images, icons, vectors (Pixabay, Unsplash, Tabler Icons)
│   ├── ##WALLPAPER/     ← Wallpapers (Wallhaven, MoeWalls, Wallpaper Abyss)
│   └── ##LEAK ASSET/    ← Leaked/premium assets (Dev Asset Collection, Freedom Club)
│
├── #__MEDIA/            ← Entertainment & media
│   ├── ##ANIME/         ← Anime streaming (Animeflix, AnimeVietSub, 9anime)
│   ├── ##MANGA/         ← Manga reading (MangaDex, mangafire, INKR, Cứu Truyện)
│   ├── ##LIGHT NOVEL/   ← Light novels (docln, WebNovel, Open Library, Z-Library)
│   ├── ##GAMES/         ← Games & game downloads (GVNVH18, EroVNS, NexusGames)
│   ├── ##MUSIC/         ← Music & instruments (Virtual Piano, Kalimba, SoundCloud)
│   ├── ##STREAM/        ← Streaming & YouTube channels (Holodex, YouTube)
│   └── ##NSFW/          ← Adult content (Kemono, Coomer, Fapopedia) — kept private
│
├── #__STUDY/            ← Education & learning
│   ├── ##VIETNAMESE/    ← Vietnamese school materials (ĐGNL, Hóa, Toán, tuyển sinh)
│   ├── ##ENGLISH/       ← English & IELTS (Cambly, YouPass, BoldVoice, Youglish)
│   ├── ##DOCS/          ← Documents, ebooks, courses (Scribd, Studocu, MIT OCW, Udemy)
│   └── ##CODING COURSE/ ← Programming courses (28tech, CodeCrafters, OSSU)
│
├── #__TOOLS/            ← Utilities & toolkits
│   ├── ##SEARCH/        ← Reverse image, face search (PimEyes, SauceNAO, TinEye, FaceCheck)
│   ├── ##DOWNLOAD/      ← Video/file download (SaveTube, Y2mate, Convertio)
│   ├── ##CONVERT/       ← File converters (ConvertICO, Video to GIF, PNG to SVG)
│   ├── ##TEMP/          ← Temp mail, SMS (Temp Mail, quackr, Imail)
│   ├── ##PROXY/         ← Proxy & VPN (Webshare, Proxy6, FreeProxy, spys.one)
│   ├── ##CRACK/         ← Software crack/activation (IDM, JetBrains, cursor-free-vip)
│   ├── ##STEAM/         ← Steam tools (SmokeAPI, Koalageddon, DepotDownloader)
│   ├── ##MALWARE/       ← Malware analysis (VirusTotal, ANY.RUN, Filescan)
│   ├── ##CUSTOMIZE/     ← OS themes, Rainmeter, zebar (MTZ, Versus Themes, gnome-look)
│   ├── ##SOCIAL UTIL/   ← Telegram tools, social utilities (TGStat, Nicegram, dsc.gg)
│   ├── ##PRODUCTIVITY/  ← Task managers, automation (Trello, Asana, n8n, Zapier, Akiflow)
│   └── ##UTIL/          ← General utilities (Sandboxie, Bitly, Linktree, Imgur)
│
├── #__SERVER/           ← Minecraft server & hosting
│   ├── ##HOSTING/       ← Server hosting (PIKAMC, ScalaCube, playit, Aternos)
│   ├── ##PLUGIN/        ← Minecraft plugins (SpigotMC, LuckPerms, EssentialsX)
│   ├── ##WIKI/          ← Minecraft wiki & docs (Bedrock Wiki, Slimefun, MythicMobs)
│   ├── ##RESOURCE PACK/ ← Resource packs, converters (MCRPX, Chunker, ResourcePackConverter)
│   └── ##SERVER TOOL/   ← Server tools (Cloudflare, UptimeRobot, ngrok, DuckHost)
│
├── #__TRADING/          ← Crypto, finance, trading
│   ├── ##CRYPTO/        ← Crypto exchanges (Binance, Bitget, MEXC, GoPlus)
│   ├── ##TRADING/       ← Stock trading (TradingView, DNSE, Exness, XTB)
│   └── ##CURRENCY/      ← Currency conversion (Wise, Revolut, Stripe)
│
├── #__LINUX/            ← Linux ricing & dotfiles
│   (flat — không sub-folder, tất cả dotfiles/themes)
│
├── #__SHOP/             ← Shopping & accounts
│   ├── ##STORE/         ← Mua acc bản quyền (APP GIÁ RẺ, RitoKey, Divine Shop, HyperKey)
│   ├── ##MARKETPLACE/   ← Shopee, Lazada, Chợ Tốt
│   └── ##FREELANCE/     ← Fiverr, Upwork, Ko-fi, Gumroad, Patreon
│
└── __ARCHIVE/           ← Bookmark cũ, ít dùng, chờ review
```

---

## 3. LUẬT PHÂN LOẠI (CATEGORIZATION RULES)

### 3.1. Thứ tự ưu tiên (đánh từ trên xuống, match đầu tiên thắng)

1. **URL domain match** — nếu domain khớp pattern → vào category
2. **Title keyword match** — nếu title chứa keyword → vào category
3. **Path context** — nếu bookmark nằm trong folder `#__AI/##TTS AI/` → giữ category TTS AI
4. **Fallback** → `#__MISC`

### 3.2. Bảng phân loại theo domain

| Domain pattern | → Category |
|----------------|------------|
| `chatgpt.com`, `gemini.google.com`, `claude.ai`, `poe.com`, `coze.com` | `#__AI/##CHAT AI` |
| `elevenlabs.io`, `fish.audio`, `ttsmaker.com`, `voicemaker.in`, `whisper` (github), `voice.ai` | `#__AI/##TTS AI` |
| `sora.chatgpt.com`, `reve.com`, `wavespeed.ai`, `getimg.ai`, `minimax.io/audio` | `#__AI/##IMG VID GEN` |
| `github.com` + title chứa `agent`/`AI`/`TTS`/`voice` | `#__AI/##OPENSOURCE` |
| `warp.dev`, `v0.dev`, `lovable.dev`, `kiro.dev`, `cursor`, `opencode` | `#__AI/##DEV AI` |
| `midjourney`, `stability.ai`, `huggingface.co`, `replicate.com` | `#__AI/##TRAIN AI` |
| `mcp` trong URL/title | `#__AI/##MCP` |
| `replit.com`, `codesandbox.io`, `gitpod.io`, `colab.research.google.com` | `#__CODER/##DEV TOOLS` |
| `vercel.com`, `netlify.app`, `render.com`, `ngrok.io`, `cloudflare.com` | `#__CODER/##HOSTING` |
| `github.com` + title chứa `dotfiles`/`hyprland`/`rofi`/`sddm` | `#__LINUX` |
| `github.com` (profile, `/users/`, repos khác) | `#__CODER/##SOURCE CODE` |
| `figma.com`, `dribbble.com`, `awwwards.com`, `framer.com` | `#__DESIGN/##UI UX` |
| `sketchfab.com`, `blenderkit.com`, `mixamo.com`, `cgtrader.com` | `#__DESIGN/##3D MODEL` |
| `remove.bg`, `capcut.com`, `pixlr.com`, `canva.com`, `photoroom.com` | `#__DESIGN/##IMG EDIT` |
| `slidesgo`, `slidescarnival`, `fppt.com`, `slidesmania` | `#__DESIGN/##TEMPLATE` |
| `dafont.com`, `colorhunt.co`, `fonts.google.com` | `#__DESIGN/##FONT COLOR` |
| `pixabay`, `unsplash`, `tabler-icons`, `vecteezy`, `freepik` | `#__DESIGN/##ASSET` |
| `wallhaven.cc`, `moewalls`, `wallpaperabyss` | `#__DESIGN/##WALLPAPER` |
| `animeflix`, `animevietsub`, `9anime`, `holodex` | `#__MEDIA/##ANIME` |
| `mangadex`, `mangafire`, `inkr`, `cuutruyen` | `#__MEDIA/##MANGA` |
| `docln.net`, `webnovel`, `z-lib`, `openlibrary`, `sachmoi24h` | `#__MEDIA/##LIGHT NOVEL` |
| `kemono.su`, `coomer.su`, `fapopedia` | `#__MEDIA/##NSFW` |
| `shopee`, `lazada`, `chotot` | `#__SHOP/##MARKETPLACE` |
| `fiverr`, `upwork`, `ko-fi`, `gumroad`, `patreon` | `#__SHOP/##FREELANCE` |
| `binance`, `bitget`, `mexc`, `goplussecurity` | `#__TRADING/##CRYPTO` |
| `tradingview`, `dnse`, `exness`, `investing.com` | `#__TRADING/##TRADING` |
| `wise.com`, `revolut`, `stripe.com` | `#__TRADING/##CURRENCY` |
| `spigotmc.org`, `builtbybit`, `blackspigot`, `scalacube`, `playit.gg` | `#__SERVER/##PLUGIN` or `##HOSTING` |
| `pimeyes`, `saucenao`, `tineye`, `facecheck`, `reversely` | `#__TOOLS/##SEARCH` |
| `savetube`, `y2mate`, `convertio`, `savefrom` | `#__TOOLS/##DOWNLOAD` |
| `temp-mail`, `quackr`, `imail` | `#__TOOLS/##TEMP` |
| `virustotal`, `any.run`, `filescan`, `threatzone` | `#__TOOLS/##MALWARE` |
| `gmail.com`, `drive.google.com`, `calendar.google.com`, `keep.google.com` | `@DAILY` |
| `messenger.com`, `facebook.com`, `tiktok.com`, `zalo` | `@SOCIAL` |

### 3.3. Bảng phân loại theo title keyword (khi URL không match)

| Keyword in title | → Category |
|------------------|------------|
| `TTS`, `text to speech`, `voice clone`, `voice changer` | `#__AI/##TTS AI` |
| `AI image`, `image generator`, `video gen`, `AI video` | `#__AI/##IMG VID GEN` |
| `watermark remover`, `video edit`, `OpusClip`, `transcribe` | `#__AI/##EDIT AI` |
| `MCP`, `model context protocol` | `#__AI/##MCP` |
| `minecraft`, `spigot`, `bukkit`, `datapack`, `server status` | `#__SERVER/...` |
| `dotfiles`, `hyprland`, `niri`, `rofi`, `sddm`, `wayland` | `#__LINUX` |
| `IELTS`, `english`, `pronunciation`, `phrasal verb` | `#__STUDY/##ENGLISH` |
| `ĐGNL`, `tuyển sinh`, `hóa học`, `toán`, `ôn thi` | `#__STUDY/##VIETNAMESE` |
| `crack`, `patch`, `activator`, `license` | `#__TOOLS/##CRACK` |
| `steam`, `DLC unlocker`, `manifest` | `#__TOOLS/##STEAM` |
| `proxy`, `socks5`, `VPN` | `#__TOOLS/##UTIL` |

---

## 4. LUẬT DEDUP (XOÁ TRÙNG)

### 4.1. URL Normalization

Trước khi so sánh, chuẩn hoá URL:
1. Lowercase domain
2. Strip scheme (`http://` / `https://`) — giữ `https://` làm default
3. Strip tracking params: `utm_*`, `fbclid`, `gclid`, `ref`, `ref_src`, `_ga`, `_gl`, `mc_*`, `cmpid`, `source`, `dclid`, `msclkid`, `oicd`, `entry`, `linkId`, `trk`, `si`, `igshid`, `feature`, `src`, `spm`, `scm`, `pvid`, `ab_channel`, `ab_test`, `variant`, `ver`, `app`, `fwd`, `tt_content`, `tt_param`, `mibextid`, `soc_*`, `fb_ref`, `fb_source`
4. Strip trailing slash
5. Strip fragment (`#...`) — trừ khi fragment là route (SPA)
6. Strip `www.` prefix
7. Decode URL-encoded characters
8. Cho GitHub: normalize `github.com/user/repo` — giữ owner+repo, strip path sâu (blob/tree/issues/...)

### 4.2. Quy tắc giữ lại khi trùng URL

Khi 2 bookmark cùng URL normalized:
- **Giữ** bookmark có title mô tả tốt hơn (dài hơn, có nghĩa hơn)
- **Giữ** bookmark có `ADD_DATE` mới hơn (timestamp lớn hơn)
- **Gộp** icon: giữ icon base64 nếu có
- Nếu URL là `javascript:`, `chrome://`, `about:` → xoá luôn

### 4.3. Xoá bookmark rác

Xoá bookmark nếu:
- Title rỗng VÀ URL không hợp lệ
- URL là `chrome://newtab`, `about:blank`, `javascript:void(0)`
- Title là "New Tab", "Just a moment...", "404 - No workspace here"
- URL trỏ về trang chủ không cụ thể (vd: `github.com` không có user)

---

## 5. LUẬT @QUICK (QUICK ACCESS)

### 5.1. Tiêu chí vào @QUICK

Bookmark vào `@` khi **thỏa ÍT NHẤT 1**:
1. Mở ≥1 lần/tuần (email, drive, calendar, social)
2. Dashboard/tool đang dùng active (LLMGate, Mixboard, project boards)
3. Ghim trên tab bar hiện tại
4. Lưu tạm cần truy cập nhanh trong ≤7 ngày (`@TEMP`)

### 5.2. @QUICK sub-folders cố định

| Folder | Nội dung | Giới hạn |
|--------|----------|----------|
| `@DAILY` | Email, Drive, Calendar, Keep, Maps, Typing test, Chess | ≤15 |
| `@SOCIAL` | Messenger, Facebook, TikTok, Zalo, Discord, Pinterest | ≤10 |
| `@WORK` | Project dashboards, design docs, SonarQube, Harness | ≤10 |
| `@PIN` | Ghim nhanh cá nhân (LLMGate, WeScan, OpenViking, etc.) | ≤15 |
| `@TEMP` | Lưu tạm, review hàng tuần, xoá nếu không cần | ≤20 |

### 5.3. Quy tắc pull từ `#__TỦ` ra `@`

- Mỗi bookmark trong `@` PHẢI cũng tồn tại trong `#__TỦ` (nguyên tắc single source)
- Ngoại lệ: bookmark tạm (`@TEMP`) có thể chỉ tồn tại ở `@TEMP`
- Nếu bookmark trong `@` không còn dùng → xoá khỏi `@`, giữ trong `#__TỦ`

---

## 6. LUẬT ĐẶT TÊN (NAMING)

### 6.1. Folder naming

- Prefix BẮT BUỘC: `@`, `#`, `##`, `__`
- Tên folder: **UPPERCASE** hoặc **Title Case**, không dấu nếu có thể
- Không dùng tên mù như "New folder", "fdggfdfgdfgdfg", "fsdfsdsdff", "temp"
- Không dùng emoji trong tên folder (gây encoding issue khi import)
- Sub-folder dùng `##` thay vì lồng sâu

### 6.2. Bookmark naming

- Title phải mô tả nội dung, không phải tên site mù
- ✅ `Gmail - kumiiacc2.clouds@gmail.com`
- ❌ `Hộp thư đến (30) - kumiiacc2.clouds@gmail.com - Gmail` (quá dài, số thay đổi)
- ✅ `Google Drive - My Drive`
- ❌ `Drive của tôi - Google Drive` (tiếng Việt + tiếng Anh lẫn lộn → chọn 1)
- ✅ `GitHub - opencode-ai/opencode: AI coding agent for terminal`
- ❌ `opencode-ai/opencode` (thiếu context)
- Title tối đa 80 ký tự. Cắt bằng `…` nếu dài hơn.

### 6.3. Ngôn ngữ

- Ưu tiên tiếng Anh cho title (browser default)
- Giữ tiếng Việt nếu là site Việt Nam (Shopee VN, Tài Liệu Ôn Thi, etc.)
- Không dịch title — chỉ cleanup

---

## 7. LUẬT TAB GROUP (KHÔNG LIÊN QUAN BOOKMARK)

Tab group trong browser (Chrome/Brave/Comet) cũng cần rules:

### 7.1. Tab group naming convention

| Prefix | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `🎯` | Active work/project | `🎯 SABI`, `🎯 LLMGate` |
| `🤖` | AI tools đang dùng | `🤖 AI Chat`, `🤖 TTS` |
| `🔧` | Dev tools | `🔧 Debug`, `🔧 Deploy` |
| `📚` | Research/reading | `📚 MCP Study`, `📚 Linux Rice` |
| `🎮` | Entertainment | `🎮 MC Server`, `🎮 Anime` |
| `💡` | Reference/docs | `💡 API Docs`, `💡 Rules` |
| `⏳` | Temporary (review trong session) | `⏳ Read Later`, `⏳ To Sort` |

### 7.2. Tab group lifecycle

- `⏳` groups: review cuối ngày, convert thành bookmark hoặc đóng
- `🎯` groups: giữ open trong work session, bookmark khi đóng project
- Mỗi tab group nên có ≤10 tabs. Nhiều hơn → tách hoặc bookmark bớt

### 7.3. Auto-save tab group → bookmark

Khi đóng tab group:
1. Nếu group là `🎯`/`🔧`/`🤖` → auto-bookmark vào `#__TỦ` category tương ứng
2. Nếu group là `⏳` → auto-bookmark vào `@TEMP`
3. Nếu group là `🎮`/`📚` → hỏi user trước khi bookmark

---

## 8. LUẬT BẢO TRÌ (MAINTENANCE)

### 8.1. Review định kỳ

| Tần suất | Hành động |
|-----------|-----------|
| Hàng tuần | Review `@TEMP` → bookmark vào `#__TỦ` hoặc xoá |
| Hàng tháng | Review `@QUICK` → demote item ít dùng về `#__TỦ` |
| Hàng quý | Review `#__TỦ` toàn bộ → gộp folder <5 item, tách folder >50 item |
| Hàng năm | Review `__ARCHIVE` → xoá bookmark không còn hợp lệ (404, dead site) |

### 8.2. Import mới

Khi import bookmark mới (từ browser khác, export file):
1. Chạy qua dedup (§4)
2. Phân loại tự động theo §3
3. Review manual cho `@QUICK` candidates
4. Bookmark không match rule → vào `#__MISC` chờ sort

### 8.3. Export

- Export định dạng: **Netscape Bookmark HTML** (compatible mọi browser)
- File name: `bookmarks_merged_YYYY_M_D.html`
- Giữ `ADD_DATE`, `ICON` (favicon base64) cho mọi bookmark
- Không giữ `LAST_MODIFIED` (gây conflict khi re-import)

---

## 9. MA TRẬN QUYẾT ĐỊNH (DECISION MATRIX)

```
Bookmark mới vào →
  ├─ URL hợp lệ? → KHÔNG → Xoá
  ├─ Title mô tả? → KHÔNG → Đổi title hoặc xoá
  ├─ URL đã tồn tại? → CÓ → Dedup (giữ title tốt hơn)
  ├─ URL tracking params? → CÓ → Strip params
  ├─ Domain match §3.2? → CÓ → Category tương ứng
  ├─ Title keyword match §3.3? → CÓ → Category tương ứng
  ├─ Folder context match? → CÓ → Giữ category cũ
  ├─ Fallback → #__MISC
  └─ Có trong @QUICK criteria §5.1? → CÓ → Thêm vào @ tương ứng
```

---

## 10. CHANGELOG

| Ngày | Version | Thay đổi |
|------|---------|----------|
| 2026-07-01 | 1.0 | Khởi tạo rules từ phân tích brave + comet bookmarks (2327 items) |
| 2026-07-01 | 1.1 | Split ##LEARN → ##TUTORIALS + ##COMPETITIVE; Split ##UTIL → ##PROXY + ##SOCIAL UTIL + ##CUSTOMIZE + ##PRODUCTIVITY; Fix 38 MISC → 0; Thêm tree_viewer.py; Thêm README.md |
