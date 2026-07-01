/**
 * URL normalization, dedup, and classification.
 * Ported from Python merge_bookmarks.py
 */

import type { Bookmark } from "./parser.js";

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "utm_name", "utm_referrer", "fbclid", "gclid", "dclid", "msclkid",
  "yclid", "mc_eid", "mc_cid", "ref", "ref_src", "ref_url", "referrer",
  "_ga", "_gl", "igshid", "feature", "src", "spm", "scm", "pvid",
  "ab_channel", "ab_test", "variant", "ver", "app", "fwd",
  "tt_content", "tt_param", "mibextid", "soc_src", "soc_plt",
  "fb_ref", "fb_source", "cmpid", "source", "entry", "linkId", "trk", "si",
  "oicid", "share", "shared", "__c", "cache", "e", "u",
]);

const DELETE_URL_PATTERNS = ["chrome://", "about:blank", "javascript:", "chrome-extension://", "edge://", "brave://"];
const DELETE_TITLE_PATTERNS = ["just a moment", "new tab", "404 - no workspace", "attention required", "access denied"];

/** Normalize URL for dedup comparison. */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  for (const pat of DELETE_URL_PATTERNS) {
    if (trimmed.toLowerCase().includes(pat)) return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "";
  }

  let domain = parsed.hostname.toLowerCase();
  if (domain.startsWith("www.")) domain = domain.slice(4);

  const params = new URLSearchParams(parsed.search);
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) params.delete(key);
  }
  const newQuery = params.toString();

  let path = parsed.pathname.replace(/\/+$/, "");
  if (domain === "github.com") {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) path = `/${parts[0]}/${parts[1]}`;
  }

  let normalized = domain + path;
  if (newQuery) normalized += "?" + newQuery;
  return normalized.toLowerCase();
}

/** Check if bookmark is trash. */
export function isTrash(bm: { title: string; url: string }): boolean {
  const url = bm.url.toLowerCase();
  const title = bm.title.toLowerCase();
  if (!url || !title) return true;
  for (const pat of DELETE_URL_PATTERNS) if (url.includes(pat)) return true;
  for (const pat of DELETE_TITLE_PATTERNS) if (title.includes(pat)) return true;
  if (["-", "", ".", "...", "@", "#"].includes(title)) return true;
  return false;
}

/** Clean title. */
export function cleanTitle(title: string): string {
  if (!title) return "";
  let t = title
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^\(\d+\)\s*/, "");
  if (t.length > 120) t = t.slice(0, 117) + "...";
  return t;
}

/** Extract domain from URL. */
export function domainOf(url: string): string {
  try {
    const u = new URL(url);
    let d = u.hostname.toLowerCase();
    if (d.startsWith("www.")) d = d.slice(4);
    return d;
  } catch {
    return "";
  }
}

type Rule = [string, string];

// Domain rules (first match wins)
const DOMAIN_RULES: Rule[] = [
  // @QUICK
  ["mail.google.com", "@DAILY"],
  ["drive.google.com/drive/u", "@DAILY"],
  ["keep.google.com", "@DAILY"],
  ["maps.google", "@DAILY"],
  ["monkeytype.com", "@DAILY"],
  ["chess.com", "@DAILY"],
  ["tasksboard.com", "@DAILY"],
  ["edclub.com", "@DAILY"],
  ["messenger.com", "@SOCIAL"],
  ["facebook.com", "@SOCIAL"],
  ["tiktok.com", "@SOCIAL"],
  ["zalo", "@SOCIAL"],
  ["discord.com", "@SOCIAL"],
  ["pinterest", "@SOCIAL"],

  // AI
  ["chatgpt.com", "#__AI/##CHAT"],
  ["gemini.google", "#__AI/##CHAT"],
  ["claude.ai", "#__AI/##CHAT"],
  ["poe.com", "#__AI/##CHAT"],
  ["coze.com", "#__AI/##CHAT"],
  ["elevenlabs", "#__AI/##CREATIVE/###TTS_VOICE"],
  ["fish.audio", "#__AI/##CREATIVE/###TTS_VOICE"],
  ["sora.chatgpt", "#__AI/##CREATIVE/###VIDEO_GEN"],
  ["runway", "#__AI/##CREATIVE/###VIDEO_GEN"],
  ["klingai", "#__AI/##CREATIVE/###VIDEO_GEN"],
  ["getimg.ai", "#__AI/##CREATIVE/###IMAGE_GEN"],
  ["civitai", "#__AI/##CREATIVE/###IMAGE_GEN"],
  ["leonardo.ai", "#__AI/##CREATIVE/###IMAGE_GEN"],
  ["warp.dev", "#__AI/##DEV_AGENT/###AI_IDE_CODING"],
  ["v0.dev", "#__AI/##DEV_AGENT/###AI_IDE_CODING"],
  ["lovable.dev", "#__AI/##DEV_AGENT/###AI_IDE_CODING"],
  ["kiro.dev", "#__AI/##DEV_AGENT/###AI_IDE_CODING"],
  ["huggingface.co", "#__AI/##OPEN_SOURCE/###HUGGINGFACE"],
  ["replicate.com", "#__AI/##OPEN_SOURCE/###REPOS_MODELS"],
  ["perplexity.ai", "#__AI/##RESEARCH_SEARCH/###AI_SEARCH"],
  ["you.com", "#__AI/##RESEARCH_SEARCH/###AI_SEARCH"],
  ["lmstudio", "#__AI/##RESEARCH_SEARCH/###LEARN_TRAIN"],

  // CODER
  ["github.com/modelcontextprotocol", "#__AI/##DEV_AGENT/###MCP_SERVERS"],
  ["github.com", "#__CODER/##GITHUB_REPOS"],
  ["replit.com", "#__CODER/##DEV_WORKBENCH/###IDE_SANDBOX"],
  ["codesandbox", "#__CODER/##DEV_WORKBENCH/###IDE_SANDBOX"],
  ["gitpod", "#__CODER/##DEV_WORKBENCH/###IDE_SANDBOX"],
  ["vercel.com", "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY"],
  ["netlify", "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY"],
  ["render.com", "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY"],
  ["hackerrank", "#__CODER/##LEARNING/###COMPETITIVE"],
  ["leetcode", "#__CODER/##LEARNING/###COMPETITIVE"],
  ["codeforces", "#__CODER/##LEARNING/###COMPETITIVE"],
  ["w3schools", "#__CODER/##LEARNING/###TUTORIALS"],
  ["roadmap.sh", "#__CODER/##LEARNING/###TUTORIALS"],

  // DESIGN
  ["figma.com", "#__DESIGN/##UI_UX/###INSPIRATION_TOOLS"],
  ["dribbble", "#__DESIGN/##UI_UX/###INSPIRATION_TOOLS"],
  ["sketchfab", "#__DESIGN/##3D_GAME_ASSET/###MODELS_TEXTURES"],
  ["remove.bg", "#__DESIGN/##EDITING/###IMAGE_TOOLS"],
  ["canva.com", "#__DESIGN/##EDITING/###IMAGE_TOOLS"],
  ["slidesgo", "#__DESIGN/##TEMPLATES/###SLIDES_PRESENTATION"],
  ["dafont", "#__DESIGN/##STYLE_SYSTEM/###FONT_COLOR"],
  ["pixabay", "#__DESIGN/##3D_GAME_ASSET/###STOCK_ICONS"],
  ["unsplash", "#__DESIGN/##3D_GAME_ASSET/###STOCK_ICONS"],

  // TOOLS
  ["pimeyes", "#__TOOLS/##SEARCH_OSINT/###REVERSE_IMAGE_FACE"],
  ["saucenao", "#__TOOLS/##SEARCH_OSINT/###REVERSE_IMAGE_FACE"],
  ["tineye", "#__TOOLS/##SEARCH_OSINT/###REVERSE_IMAGE_FACE"],
  ["temp-mail", "#__TOOLS/##PRIVACY_TEMP/###TEMP_MAIL_SMS"],
  ["virustotal", "#__TOOLS/##SECURITY_ANALYSIS/###MALWARE_IP"],
  ["any.run", "#__TOOLS/##SECURITY_ANALYSIS/###MALWARE_IP"],

  // MEDIA
  ["animeflix", "#__MEDIA/##ANIME_MANGA/###ANIME_STREAM"],
  ["mangadex", "#__MEDIA/##ANIME_MANGA/###MANGA_READ"],
  ["docln", "#__MEDIA/##BOOK_NOVEL/###LIGHT_NOVEL_EBOOK"],
  ["z-lib", "#__MEDIA/##BOOK_NOVEL/###LIGHT_NOVEL_EBOOK"],

  // STUDY
  ["cambly", "#__STUDY/##ENGLISH/###IELTS_PRONUNCIATION"],
  ["scribd", "#__STUDY/##DOCS_LIBRARY/###GENERAL_DOCS"],
  ["studocu", "#__STUDY/##DOCS_LIBRARY/###GENERAL_DOCS"],

  // SERVER
  ["spigotmc", "#__SERVER/##MINECRAFT_SERVER/###PLUGIN_MARKET"],
  ["scalacube", "#__SERVER/##MINECRAFT_SERVER/###HOSTING_PANEL"],
  ["playit.gg", "#__SERVER/##MINECRAFT_SERVER/###HOSTING_PANEL"],

  // TRADING
  ["binance", "#__TRADING/##CRYPTO/###DEX_CEX_AIRDROP"],
  ["tradingview", "#__TRADING/##MARKET/###CHART_BROKER"],

  // SHOP
  ["shopee", "#__SHOP/##MARKETPLACE/###SHOPPING"],
  ["fiverr", "#__SHOP/##WORK_MARKET/###FREELANCE_CREATOR"],
];

const KEYWORD_RULES: Rule[] = [
  ["tts", "#__AI/##CREATIVE/###TTS_VOICE"],
  ["text to speech", "#__AI/##CREATIVE/###TTS_VOICE"],
  ["ai image", "#__AI/##CREATIVE/###IMAGE_GEN"],
  ["video gen", "#__AI/##CREATIVE/###VIDEO_GEN"],
  ["watermark remover", "#__AI/##CREATIVE/###EDITING"],
  ["minecraft", "#__SERVER/##MINECRAFT_SERVER/###PLUGIN_MARKET"],
  ["mcp", "#__AI/##DEV_AGENT/###MCP_SERVERS"],
  ["model context protocol", "#__AI/##DEV_AGENT/###MCP_SERVERS"],
  ["hyprland", "#__LINUX/##RICE_DOTFILES/###HYPRLAND_THEMES"],
  ["dotfiles", "#__LINUX/##RICE_DOTFILES/###HYPRLAND_THEMES"],
  ["ielts", "#__STUDY/##ENGLISH/###IELTS_PRONUNCIATION"],
  ["crack", "#__TOOLS/##CRACK_ACTIVATION/###SOFTWARE"],
  ["dlc unlocker", "#__TOOLS/##CRACK_ACTIVATION/###STEAM_GAME"],
];

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

type MultiRule = { needles: string[]; path: string };

function matchMultiRule(text: string, rules: MultiRule[]): string | undefined {
  for (const rule of rules) {
    if (containsAny(text, rule.needles)) return rule.path;
  }
  return undefined;
}

/**
 * Edge-era folder names are messy but carry useful intent. Keep this as data
 * so the TypeScript classifier remains the single source of truth while still
 * learning from the old browser structure (#ARCHIVE, #CODER/SOUSCE CODE, etc.).
 */
const EDGE_FOLDER_CONTEXT_RULES: MultiRule[] = [
  { needles: ["crack file", "cr4ck file"], path: "#__TOOLS/##CRACK_ACTIVATION/###SOFTWARE" },
  { needles: ["document", "docs learn"], path: "#__STUDY/##DOCS_LIBRARY/###GENERAL_DOCS" },
  { needles: ["ebook", "sách"], path: "#__MEDIA/##BOOK_NOVEL/###LIGHT_NOVEL_EBOOK" },
  { needles: ["sousce kho", "source kho", "khoá học"], path: "#__CODER/##LEARNING/###TUTORIALS" },
  { needles: ["developer sousce", "dowload sousce", "git code", "sousce code", "source code", "find code"], path: "#__CODER/##GITHUB_REPOS/###WEB_APP_API" },
  { needles: ["sousce tool", "source tool", "tool code", "dev tool", "toolkit"], path: "#__CODER/##DEV_WORKBENCH/###OTHER_DEV" },
  { needles: ["sousce learn", "source learn", "learn code", "code learning", "tutorial project", "tutorial code"], path: "#__CODER/##LEARNING/###TUTORIALS" },
  { needles: ["sousce mmo", "source mmo", "free download", "download doc"], path: "#__TOOLS/##DOWNLOAD_CONVERT/###MEDIA_FILE" },
  { needles: ["document/api", "api sousce", "api code", "wiki code"], path: "#__CODER/##DOCS_FRAMEWORKS/###API_LIBS" },
  { needles: ["hacked", "hack code", "hack tool"], path: "#__CODER/##SECURITY_DEV/###RESEARCH" },
  { needles: ["profile author"], path: "#__CODER/##GITHUB_PROFILES" },
  { needles: ["postcast", "podcast", "news", "post"], path: "#__MEDIA/##MUSIC_STREAM/###MUSIC_VIDEO" },
  { needles: ["workfolder", "work folder", "work manager"], path: "#__WORK/##PROJECTS/###DASHBOARDS_DOCS" },
  { needles: ["host", "domain", "vps", "deploy", "server dev", "sevrer dev"], path: "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY" },
  { needles: ["framework", "dev, framework"], path: "#__CODER/##DOCS_FRAMEWORKS/###API_LIBS" },
  { needles: ["test code", "exam code", "test case"], path: "#__CODER/##LEARNING/###COMPETITIVE" },
  { needles: ["python and php", "java and c#", "html code", "web code", "web project", "web edit", "web games"], path: "#__CODER/##GITHUB_REPOS/###WEB_APP_API" },
  { needles: ["game dev", "game in code", "code games", "unity", "shader"], path: "#__CODER/##GITHUB_REPOS/###GAME_DEV_STEAM" },
  { needles: ["automate"], path: "#__TOOLS/##PRODUCTIVITY_AUTOMATION/###TASK_AUTOMATION" },
  { needles: ["upfile", "up file", "upload", "covert", "convert"], path: "#__TOOLS/##DOWNLOAD_CONVERT/###MEDIA_FILE" },
  { needles: ["temp", "temporary"], path: "#__TOOLS/##PRIVACY_TEMP/###TEMP_MAIL_SMS" },
  { needles: ["customize", "custom linux", "custom themes"], path: "#__TOOLS/##SYSTEM_CUSTOMIZE/###THEMES_RICING" },
  { needles: ["searching tool", "find"], path: "#__TOOLS/##SEARCH_OSINT/###REVERSE_IMAGE_FACE" },
  { needles: ["crack tool", "cr steams", "crack games", "leak web"], path: "#__TOOLS/##CRACK_ACTIVATION/###STEAM_GAME" },
  { needles: ["ai tool", "chat ai"], path: "#__AI/##CHAT/###CORE_CHAT" },
  { needles: ["editor ai", "img ai", "vid ai", "voice edit", "sounds ai"], path: "#__AI/##CREATIVE/###EDITING" },
  { needles: ["search ai"], path: "#__AI/##RESEARCH_SEARCH/###AI_SEARCH" },
  { needles: ["dev,web ai", "code ai"], path: "#__AI/##DEV_AGENT/###AI_IDE_CODING" },
  { needles: ["custom more ai", "bot", "bot discord"], path: "#__AI/##DEV_AGENT/###AGENT_FRAMEWORKS" },
  { needles: ["train ai", "learn ai"], path: "#__AI/##RESEARCH_SEARCH/###LEARN_TRAIN" },
  { needles: ["image download", "img download", "svg download"], path: "#__DESIGN/##3D_GAME_ASSET/###STOCK_ICONS" },
  { needles: ["wallpaper"], path: "#__DESIGN/##STYLE_SYSTEM/###WALLPAPER" },
  { needles: ["font", "color"], path: "#__DESIGN/##STYLE_SYSTEM/###FONT_COLOR" },
  { needles: ["social editor"], path: "#__TOOLS/##SOCIAL_UTILS/###TELEGRAM_DISCORD" },
  { needles: ["chilling", "book, maga", "anime-manga", "anime", "manga"], path: "#__MEDIA/##ANIME_MANGA/###MANGA_READ" },
  { needles: ["referent idiea", "reference idea", "web xem xét", "web art", "web designer"], path: "#__DESIGN/##UI_UX/###INSPIRATION_TOOLS" },
  { needles: ["forum code", "forum learn"], path: "#__CODER/##LEARNING/###TUTORIALS" },
  { needles: ["flow marketing", "marketing", "job", "mmo web"], path: "#__SHOP/##WORK_MARKET/###FREELANCE_CREATOR" },
  { needles: ["11 class", "sách 10"], path: "#__STUDY/##SCHOOL_VN/###THPT_DGNL" },
  { needles: ["learn english", "practice eng"], path: "#__STUDY/##ENGLISH/###IELTS_PRONUNCIATION" },
  { needles: ["dev learn"], path: "#__CODER/##LEARNING/###TUTORIALS" },
];

const EDGE_DOMAIN_CATCHALL_RULES: MultiRule[] = [
  { needles: ["hvaonline.net", "infosecinstitute.com", "hybrid-analysis.com", "qualys.com", "recordedfuture.com"], path: "#__TOOLS/##SECURITY_ANALYSIS/###MALWARE_IP" },
  { needles: ["mikotech.vn", "vietnix.vn", "fileformat.info", "datastackhub.com", "docs.advntr.dev"], path: "#__CODER/##DOCS_FRAMEWORKS/###API_LIBS" },
  { needles: ["codepal.ai", "codeconvert.ai", "platform.openai.com/api-keys"], path: "#__AI/##DEV_AGENT/###AI_IDE_CODING" },
  { needles: ["jinkimh.github.io", "codelearn.io", "racket-lang.org", "homeworkify", "techtarget.com"], path: "#__CODER/##LEARNING/###TUTORIALS" },
  { needles: ["xyzcoder.github.io", "javadecompilers.com", "decompiler.com"], path: "#__CODER/##SECURITY_DEV/###RESEARCH" },
  { needles: ["docpose.com", "mega.nz", "drive.usercontent.google.com"], path: "#__TOOLS/##DOWNLOAD_CONVERT/###MEDIA_FILE" },
  { needles: ["greasyfork.org", "formatter.org", "regex101.com"], path: "#__CODER/##DEV_WORKBENCH/###OTHER_DEV" },
  { needles: ["openasar.dev", "iobit.com"], path: "#__CODER/##GITHUB_REPOS/###SYSTEM_OS_UTILS" },
  { needles: ["phong28zk.me", "stormx.works", "xuankhoatu.com", "vaaq.dev", "charat.me"], path: "#__DESIGN/##UI_UX/###INSPIRATION_TOOLS" },
  { needles: ["spectrecreations.com", "unity.com/roadmap"], path: "#__CODER/##GITHUB_REPOS/###GAME_DEV_STEAM" },
  { needles: ["cloud.stormx.space", "litespeedtech.com", "falixnodes", "falix"], path: "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY" },
  { needles: ["webintoapp.com", "bolt.new", "carrd.co"], path: "#__AI/##DEV_AGENT/###APP_BUILDER" },
  { needles: ["hunyuan.tencent.com", "godmodeai"], path: "#__AI/##CREATIVE/###IMAGE_GEN" },
  { needles: ["upstash.com"], path: "#__CODER/##GITHUB_REPOS/###DATA_DEVOPS" },
  { needles: ["streamerfreebies", "twitchoverlay", "discadia.com"], path: "#__DESIGN/##3D_GAME_ASSET/###STOCK_ICONS" },
  { needles: ["blinkist.com"], path: "#__MEDIA/##BOOK_NOVEL/###LIGHT_NOVEL_EBOOK" },
  { needles: ["clickup.com", "hubspot.com"], path: "#__TOOLS/##PRODUCTIVITY_AUTOMATION/###TASK_BOARD" },
  { needles: ["episoden.com", "gliglish.com", "languagereactor.com", "dautruonganhngu", "prepedu.com"], path: "#__STUDY/##ENGLISH/###IELTS_PRONUNCIATION" },
  { needles: ["reddit.com/r/piracy"], path: "#__TOOLS/##CRACK_ACTIVATION/###SOFTWARE" },
  { needles: ["nghiengacha.com", "pcmarket.vn"], path: "#__SHOP/##MARKETPLACE/###SHOPPING" },
  { needles: ["vietnamworks.com", "whop.com"], path: "#__SHOP/##WORK_MARKET/###FREELANCE_CREATOR" },
  { needles: ["screeps.com", "quangtrioj"], path: "#__CODER/##LEARNING/###COMPETITIVE" },
  { needles: ["yougame.biz"], path: "#__TOOLS/##CRACK_ACTIVATION/###STEAM_GAME" },
  { needles: ["vidyard.com"], path: "#__AI/##CREATIVE/###VIDEO_GEN" },
  { needles: ["bing.com/search", "google.com/search"], path: "#__TOOLS/##GENERAL_UTILS/###GENERAL" },
];

/**
 * Legacy/quick classifier approximating the original Python merge_bookmarks.py.
 * The v2 archive router below uses this as its fallback input, just like
 * merge_bookmarks_v2.py calls classify_bookmark(bm).
 */
function legacyClassifyBookmark(bm: Bookmark): string {
  const url = (bm.url || "").toLowerCase();
  const title = (bm.title || "").toLowerCase();

  for (const [pattern, category] of DOMAIN_RULES) {
    if (url.includes(pattern)) return category;
  }
  for (const [keyword, category] of KEYWORD_RULES) {
    if (title.includes(keyword)) return category;
  }
  return "#__TOOLS/##GENERAL_UTILS/###GENERAL";
}

export function routeGoogleDrive(title: string, url: string): string {
  const text = `${title} ${url}`.toLowerCase();
  if (containsAny(text, ["adobe", "photoshop", "after effect", "idm", "repack", "crack", "easeus", "intellijidea", "tdsupdate"])) return "#__TOOLS/##CRACK_ACTIVATION/###SOFTWARE";
  if (containsAny(text, ["stardew", "miside", "game", "bunny girl", "no game no life"])) return "#__MEDIA/##GAMES_NOVELS/###DRIVE_FILES";
  if (containsAny(text, ["ccna", "cisco", "forti", "system center", "udemy", "python", "django", "algorithm", "c++", "css", "unity", "course", "visio", "android hacking"])) return "#__STUDY/##CODING_COURSES/###DRIVE_COURSES";
  if (containsAny(text, ["powerpoint", "slide", "template"])) return "#__DESIGN/##TEMPLATES/###SLIDES_DRIVE";
  if (containsAny(text, ["ielts", "english", "destination", "langmaster"])) return "#__STUDY/##ENGLISH/###DRIVE_DOCS";
  return "#__STUDY/##DOCS_LIBRARY/###GOOGLE_DRIVE_DOCS";
}

export function routeGithub(title: string, url: string): string {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  const text = `${t} ${u}`;

  if (u.includes("docs.github.com")) return "#__CODER/##GITHUB_REPOS/###DATA_DEVOPS";
  if (containsAny(text, ["minecraft", "bedrock", "resourcepack", "resource-pack", "java2bedrock", "mcrpx", "geyser", "spigot", "bukkit", "server-unpacker", "texture", "lavamusic", "slimefun", "bossshop"])) return "#__CODER/##GITHUB_REPOS/###MINECRAFT";
  if (containsAny(text, ["rat", "stealer", "malware", "backdoor", "phishing", "pentest", "antidbg", "anti-debugging", "yara", "ioc", "fatrat", "browserdataextractor", "sms-bomber", "hacking", "discord-hack", "tgbot-verify"])) return "#__CODER/##GITHUB_REPOS/###SECURITY_RE";
  if (containsAny(text, ["activation", "activator", "cursor-vip", "cursor-free-vip", "free-augment", "jetbra", "idm", "dlc-unlocker", "manifestdownloader", "manifest-updater", "depot", "koalageddon", "smokeapi", "microsoft-activation", "steam"])) return "#__CODER/##GITHUB_REPOS/###CRACK_ACTIVATION";
  if (containsAny(text, ["agent", "llm", "openai", "ai-", "ai_", "suna", "superagi", "agentgpt", "browser-use", "stagehand", "mcp", "tts", "voice", "rvc", "whisper", "lancedb", "airi", "wan2", "hunyuan", "pixel-gpt", "zonos", "gpt-prompt", "sora-extend", "sora-2", "modelcontextprotocol", "pipeline", "hcm"])) return "#__CODER/##GITHUB_REPOS/###AI_AGENT_LLM";
  if (containsAny(text, ["dotfiles", "hypr", "rofi", "sddm", "catppuccin", "shell", "winutil", "casaos", "kernelos", "tab-manager", "braintool", "opentabletdriver", "kasmvnc", "zebar", "theme-manager", "uniextract", "theia"])) return "#__CODER/##GITHUB_REPOS/###SYSTEM_OS_UTILS";
  if (containsAny(text, ["react", "next", "tailwind", "prisma", "eslint", "ui", "website", "web", "django", "fastapi", "zalo", "api", "keygen"])) return "#__CODER/##GITHUB_REPOS/###WEB_APP_API";
  if (containsAny(text, ["unity", "game", "shader", "itch", "steam", "depot", "koalageddon", "smokeapi"])) return "#__CODER/##GITHUB_REPOS/###GAME_DEV_STEAM";
  if (containsAny(text, ["comic", "manga", "davinci", "ktoolbox", "kemono", "googlelens"])) return "#__CODER/##GITHUB_REPOS/###MEDIA_DESIGN_TOOLS";
  if (containsAny(text, ["provinces", "database", "workflow", "sched-ext", "free-devops", "github docs", "using workflows"])) return "#__CODER/##GITHUB_REPOS/###DATA_DEVOPS";
  if (containsAny(text, ["book", "course", "ossu", "computer-science", "learn", "tutorial", "algorithm", "trust-vn", "lý thuyết trò chơi"])) return "#__CODER/##GITHUB_REPOS/###LEARNING";
  if (u.replace(/\/+$/, "") === "https://github.com" || u.replace(/\/+$/, "") === "github.com" || /github\.com\/[^/]+\/?$/.test(u) || t.includes("repositories") || t.includes("profile")) return "#__CODER/##GITHUB_PROFILES";
  return "#__CODER/##GITHUB_REPOS/###UNCATEGORIZED_REPO";
}

export function routeAi(title: string, url: string, old: string): string {
  const text = `${title} ${url}`.toLowerCase();
  const oldUpper = old.toUpperCase();
  if (oldUpper.includes("##CHAT AI") || old.startsWith("#__AI/##CHAT")) {
    if (containsAny(text, ["detector", "humanize", "writehuman", "ai checker"])) return "#__AI/##CHAT/###DETECTOR_HUMANIZER";
    return "#__AI/##CHAT/###CORE_CHAT";
  }
  if (oldUpper.includes("##TTS AI") || old.includes("###TTS_VOICE")) return "#__AI/##CREATIVE/###TTS_VOICE";
  if (oldUpper.includes("##IMG VID GEN") || old.includes("###IMAGE_GEN") || old.includes("###VIDEO_GEN")) {
    if (containsAny(text, ["watermark", "transcribe", "clip", "editor"])) return "#__AI/##CREATIVE/###EDITING";
    if (containsAny(text, ["video", "sora", "runway", "kling", "pixverse", "wan", "invideo", "dream"])) return "#__AI/##CREATIVE/###VIDEO_GEN";
    return "#__AI/##CREATIVE/###IMAGE_GEN";
  }
  if (oldUpper.includes("##EDIT AI") || old.includes("###EDITING")) return "#__AI/##CREATIVE/###EDITING";
  if (oldUpper.includes("##SOUND MUSIC") || old.includes("###SOUND_MUSIC")) return "#__AI/##CREATIVE/###SOUND_MUSIC";
  if (oldUpper.includes("##DEV AI") || old.includes("###AI_IDE_CODING") || old.startsWith("#__AI/##DEV_AGENT")) {
    if (containsAny(text, ["v0", "lovable", "builder", "bubble", "firebase", "anima", "locofy"])) return "#__AI/##DEV_AGENT/###APP_BUILDER";
    if (old.includes("###MCP_SERVERS") || containsAny(text, ["mcp", "model context protocol"])) return "#__AI/##DEV_AGENT/###MCP_SERVERS";
    return "#__AI/##DEV_AGENT/###AI_IDE_CODING";
  }
  if (oldUpper.includes("##AGENT AI")) return "#__AI/##DEV_AGENT/###AGENT_FRAMEWORKS";
  if (oldUpper.includes("##MCP")) return "#__AI/##DEV_AGENT/###MCP_SERVERS";
  if (oldUpper.includes("##OPENSOURCE") || old.startsWith("#__AI/##OPEN_SOURCE")) return url.toLowerCase().includes("huggingface") ? "#__AI/##OPEN_SOURCE/###HUGGINGFACE" : "#__AI/##OPEN_SOURCE/###REPOS_MODELS";
  if (oldUpper.includes("##SEARCH AI") || old.includes("###AI_SEARCH")) return "#__AI/##RESEARCH_SEARCH/###AI_SEARCH";
  if (oldUpper.includes("##TRAIN AI") || old.includes("###LEARN_TRAIN")) return "#__AI/##RESEARCH_SEARCH/###LEARN_TRAIN";
  return "#__AI/##PRODUCTIVITY/###AI_TOOLS";
}

/** v2 archive router ported from merge_bookmarks_v2.py. */
export function routeArchiveBookmark(bm: Bookmark): string {
  const title = bm.title || "";
  const url = bm.url || "";
  const t = title.toLowerCase();
  const u = normalizeUrl(url).toLowerCase();
  const fp = (bm.folderPath || "").toLowerCase();
  const old = legacyClassifyBookmark(bm);

  if (containsAny(u, ["messenger.com", "facebook.com", "tiktok", "zalo", "pinterest", "douyin", "xiaohongshu", "bilibili", "instagram.com", "pixiv", "discord.com", "azarlive"])) return "#__SOCIAL/##SOCIAL_APPS/###CHAT_FEED";
  if (containsAny(u, ["mail.google", "keep.google", "maps.google", "google.com/maps", "translate.google", "photos.google", "onedrive.live", "earth.google"])) return "#__TOOLS/##PRODUCTIVITY_AUTOMATION/###GOOGLE_WORKSPACE";
  if (containsAny(u, ["tasksboard", "trello", "asana", "base.vn", "smodin", "akiflow", "huly", "notion", "monday", "miro", "draw.io", "diagrams.net", "lemonsqueezy", "buymeacoffee"])) return "#__TOOLS/##PRODUCTIVITY_AUTOMATION/###TASK_BOARD";
  if (containsAny(u, ["sonarcloud", "harness.io", "sites.google.com/view/tui-kich-ban", "pkoa.autoxi", "getdesign.md"])) return "#__WORK/##PROJECTS/###DASHBOARDS_DOCS";
  if (containsAny(u, ["llmgate", "opal.google", "agent.opus", "bagel.ai", "unikorn", "zyo.lol"])) return "#__AI/##PRODUCTIVITY/###AI_GEMS";
  if (containsAny(u, ["appgiare", "genzshop", "divineshop", "lucifertech", "toolrankseo", "shopaccsomi", "darkmihoyo", "douyiner", "asakacloud", "asaka", "kingmmo", "ritokey", "hyperkey"])) return "#__SHOP/##DIGITAL_STORE/###AI_ACCOUNT_GAME";
  if (containsAny(u, ["asakacloud", "pikamc", "minecraft-hosting", "gamehosting", "panel.gamehosting"])) return "#__SERVER/##MINECRAFT_SERVER/###HOSTING_PANEL";
  if (containsAny(u, ["meteora", "coinmap", "admob.google"])) return "#__TRADING/##CRYPTO/###DEX_CEX_AIRDROP";
  if (containsAny(u, ["moon.vn", "edclub", "topcv.vn"])) return "#__STUDY/##SCHOOL_VN/###THPT_DGNL";
  if (containsAny(u, ["monkeytype", "keybr", "chess.com", "wintrchess", "archess"])) return "#__MEDIA/##GAMES/###PRACTICE_GAMES";
  if (containsAny(u, ["soundcloud", "artlist"])) return "#__MEDIA/##MUSIC_STREAM/###MUSIC_VIDEO";
  if (containsAny(u, ["pinterestvideo", "receiveasmsonline", "nordaccount"])) return "#__TOOLS/##PRIVACY_TEMP/###TEMP_MAIL_SMS";
  if (containsAny(u, ["adobe.com/express", "coohom", "artlist"])) return "#__DESIGN/##EDITING/###IMAGE_TOOLS";
  if (u.includes("reddit.com") && t.includes("blockbench")) return "#__SERVER/##MINECRAFT_SERVER/###PLUGIN_MARKET";

  if (u.includes("github.com")) return routeGithub(title, url);
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return routeGoogleDrive(title, url);
  const edgeDomainRoute = matchMultiRule(u, EDGE_DOMAIN_CATCHALL_RULES);
  if (edgeDomainRoute) return edgeDomainRoute;
  const edgeFolderRoute = matchMultiRule(fp, EDGE_FOLDER_CONTEXT_RULES);
  if (edgeFolderRoute) return edgeFolderRoute;
  if (old.startsWith("#__AI")) return routeAi(title, url, old);

  if (old.startsWith("#__CODER")) {
    if (old.includes("##HOSTING")) return "#__CODER/##INFRA_HOSTING/###CLOUD_DEPLOY";
    if (old.includes("##DEV_WORKBENCH") || old.includes("##DEV TOOLS")) return "#__CODER/##DEV_WORKBENCH/###IDE_SANDBOX";
    if (old.includes("##FRAMEWORK") || old.includes("##API REF") || old.includes("##DOCS_FRAMEWORKS")) return "#__CODER/##DOCS_FRAMEWORKS/###API_LIBS";
    if (old.includes("##COMPETITIVE")) return "#__CODER/##LEARNING/###COMPETITIVE";
    if (old.includes("##TUTORIALS") || old.includes("##LEARN")) return "#__CODER/##LEARNING/###TUTORIALS";
    if (old.includes("##HACK CODE") || old.includes("##SECURITY_DEV")) return "#__CODER/##SECURITY_DEV/###RESEARCH";
    return "#__CODER/##DEV_WORKBENCH/###OTHER_DEV";
  }

  if (old.startsWith("#__DESIGN")) return old;
  if (old.startsWith("#__TOOLS")) return old;
  if (old.startsWith("#__SERVER")) return old;
  if (old.startsWith("#__MEDIA")) return old;
  if (old.startsWith("#__STUDY")) return old;
  if (old.startsWith("#__TRADING")) return old;
  if (old.startsWith("#__SHOP")) return old;
  if (old.startsWith("#__LINUX")) return old;
  return "#__TOOLS/##GENERAL_UTILS/###GENERAL";
}

/** Classify a bookmark into the v2 archive taxonomy. */
export function classifyBookmark(bm: Bookmark): string {
  return routeArchiveBookmark(bm);
}

/** Dedup bookmarks by normalized URL. */
export function dedupBookmarks(bookmarks: Bookmark[]): { unique: Bookmark[]; duplicates: number } {
  const seen = new Map<string, Bookmark>();
  let duplicates = 0;

  for (const bm of bookmarks) {
    const key = normalizeUrl(bm.url);
    if (!key) continue;
    const existing = seen.get(key);
    if (existing) {
      duplicates++;
      seen.set(key, choosePreferredDuplicate(existing, bm));
    } else {
      seen.set(key, bm);
    }
  }

  return { unique: [...seen.values()], duplicates };
}

/**
 * Prefer the cleanest representative for exact normalized duplicates.
 * Archive policy: if two bookmarks normalize to the same URL, keep one.
 * Subdomains are intentionally preserved by normalizeUrl(), so
 * docs.example.com and example.com are not considered duplicates.
 */
function choosePreferredDuplicate(a: Bookmark, b: Bookmark): Bookmark {
  const scoreA = titleScore(a.title);
  const scoreB = titleScore(b.title);
  if (scoreA !== scoreB) return scoreB > scoreA ? b : a;
  if ((b.icon && !a.icon)) return { ...b };
  if ((a.icon && !b.icon)) return { ...a };
  const aDate = Number(a.addDate ?? 0);
  const bDate = Number(b.addDate ?? 0);
  return bDate > aDate ? b : a;
}

function titleScore(title: string): number {
  const t = cleanTitle(title || "");
  const lower = t.toLowerCase();
  if (!t) return 0;
  if (["home", "index", "untitled", "new tab", "download", "login"].includes(lower)) return 1;
  let score = 10;
  if (t.length >= 8 && t.length <= 80) score += 5;
  if (t.length > 100) score -= 4;
  if (/[-|:]/.test(t)) score += 1;
  if (/\b(github|docs|api|tutorial|guide|course|tool|dashboard|roadmap)\b/i.test(t)) score += 2;
  // Prefer concise descriptive titles over browser-noisy titles.
  score -= Math.max(0, Math.floor((t.length - 80) / 20));
  return score;
}
