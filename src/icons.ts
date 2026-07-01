/**
 * Folder icon SVG data URIs.
 * Each folder gets an emoji rendered as SVG → base64 data URI.
 * Browser bookmark HTML supports ICON attribute on <H3> tags.
 */

const EMOJI_SVG = (emoji: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

/** Map folder name patterns to emoji. First match wins. */
const FOLDER_EMOJI_RULES: Array<[RegExp, string]> = [
  // Top-level
  [/^Bookmarks bar$/, "📑"],
  [/^Other Bookmarks$/, "📂"],
  [/^__QUICK$/, "⚡"],
  [/^@PIN$/, "📌"],
  [/^@DAILY$/, "☀️"],
  [/^@AI_FAST$/, "🤖"],
  [/^@WORK$/, "💼"],

  // @PIN sub
  [/^@PIN_AI_CHAT$/, "💬"],
  [/^@PIN_AI_GEMS$/, "💎"],
  [/^@PIN_YOUTUBE_SAVE$/, "▶️"],
  [/^@PIN_STORE_ACCOUNT$/, "🛒"],
  [/^@PIN_SERVER_MC$/, "🎮"],
  [/^@PIN_WORK_PROJECT$/, "📊"],
  [/^@PIN_INBOX_REVIEW$/, "📥"],

  // @DAILY sub
  [/^@DAILY_GOOGLE$/, "🔵"],
  [/^@DAILY_TASKS$/, "✅"],
  [/^@DAILY_PRACTICE$/, "⌨️"],

  // @AI_FAST sub
  [/^@AI_CHAT$/, "💬"],
  [/^@AI_DEV$/, "👨‍💻"],
  [/^@AI_CREATIVE$/, "🎨"],

  // @WORK sub
  [/^@WORK_DASHBOARD$/, "📊"],
  [/^@WORK_SERVER$/, "🖥️"],

  // #__AI
  [/^#__AI$/, "🤖"],
  [/^##CHAT/, "💬"],
  [/^##CREATIVE/, "🎨"],
  [/^##DEV_AGENT/, "🧠"],
  [/^##OPEN_SOURCE/, "📦"],
  [/^##RESEARCH_SEARCH/, "🔍"],
  [/^##PRODUCTIVITY/, "⚡"],
  [/^###CORE_CHAT/, "💬"],
  [/^###DETECTOR/, "🔬"],
  [/^###TTS_VOICE/, "🎙️"],
  [/^###EDITING/, "✂️"],
  [/^###VIDEO_GEN/, "🎬"],
  [/^###IMAGE_GEN/, "🖼️"],
  [/^###SOUND_MUSIC/, "🎵"],
  [/^###APP_BUILDER/, "🏗️"],
  [/^###AI_IDE_CODING/, "💻"],
  [/^###AGENT_FRAMEWORKS/, "🤖"],
  [/^###MCP_SERVERS/, "🔌"],
  [/^###HUGGINGFACE/, "🤗"],
  [/^###REPOS_MODELS/, "📦"],
  [/^###AI_SEARCH/, "🔍"],
  [/^###LEARN_TRAIN/, "🎓"],
  [/^###AI_TOOLS/, "🛠️"],
  [/^###AI_GEMS/, "💎"],

  // #__CODER
  [/^#__CODER$/, "💻"],
  [/^##GITHUB_REPOS/, "🐙"],
  [/^##GITHUB_PROFILES/, "👤"],
  [/^##DEV_WORKBENCH/, "🛠️"],
  [/^##INFRA_HOSTING/, "☁️"],
  [/^##DOCS_FRAMEWORKS/, "📚"],
  [/^##LEARNING/, "🎓"],
  [/^##SECURITY_DEV/, "🔒"],
  [/^###AI_AGENT_LLM/, "🤖"],
  [/^###MINECRAFT/, "⛏️"],
  [/^###SECURITY_RE/, "🔒"],
  [/^###CRACK_ACTIVATION/, "🔓"],
  [/^###SYSTEM_OS_UTILS/, "🐧"],
  [/^###WEB_APP_API/, "🌐"],
  [/^###GAME_DEV_STEAM/, "🎮"],
  [/^###MEDIA_DESIGN_TOOLS/, "🎨"],
  [/^###DATA_DEVOPS/, "📊"],
  [/^###LEARNING/, "📚"],
  [/^###IDE_SANDBOX/, "💻"],
  [/^###OTHER_DEV/, "🔧"],
  [/^###CLOUD_DEPLOY/, "☁️"],
  [/^###API_LIBS/, "📖"],
  [/^###COMPETITIVE/, "🏆"],
  [/^###TUTORIALS/, "📚"],
  [/^###RESEARCH/, "🔬"],

  // #__TOOLS
  [/^#__TOOLS$/, "🔧"],
  [/^##SEARCH_OSINT/, "🔍"],
  [/^##DOWNLOAD_CONVERT/, "⬇️"],
  [/^##PRIVACY_TEMP/, "🔐"],
  [/^##CRACK_ACTIVATION/, "🔓"],
  [/^##SECURITY_ANALYSIS/, "🛡️"],
  [/^##SYSTEM_CUSTOMIZE/, "🎨"],
  [/^##SOCIAL_UTILS/, "💬"],
  [/^##PRODUCTIVITY_AUTOMATION/, "⚡"],
  [/^##GENERAL_UTILS/, "🧰"],
  [/^###REVERSE_IMAGE_FACE/, "🔍"],
  [/^###MEDIA_FILE/, "🎞️"],
  [/^###TEMP_MAIL_SMS/, "📧"],
  [/^###PROXY_BROWSER/, "🌐"],
  [/^###SOFTWARE/, "💿"],
  [/^###STEAM_GAME/, "🎮"],
  [/^###MALWARE_IP/, "🦠"],
  [/^###THEMES_RICING/, "🖼️"],
  [/^###TELEGRAM_DISCORD/, "💬"],
  [/^###TASK_AUTOMATION/, "⚙️"],
  [/^###GOOGLE_WORKSPACE/, "🔵"],
  [/^###TASK_BOARD/, "📋"],
  [/^###GENERAL/, "🧰"],

  // #__DESIGN
  [/^#__DESIGN$/, "🎨"],
  [/^##UI_UX/, "🎨"],
  [/^##3D_GAME_ASSET/, "🎲"],
  [/^##EDITING/, "✂️"],
  [/^##TEMPLATES/, "📐"],
  [/^##STYLE_SYSTEM/, "🎨"],
  [/^###INSPIRATION_TOOLS/, "💡"],
  [/^###MODELS_TEXTURES/, "🧊"],
  [/^###IMAGE_TOOLS/, "🖼️"],
  [/^###VIDEO_TOOLS/, "🎬"],
  [/^###SLIDES_PRESENTATION/, "📊"],
  [/^###FONT_COLOR/, "🔤"],
  [/^###STOCK_ICONS/, "🎯"],
  [/^###WALLPAPER/, "🖼️"],
  [/^###SLIDES_DRIVE/, "📁"],

  // #__MEDIA
  [/^#__MEDIA$/, "🎬"],
  [/^##ANIME_MANGA/, "🎌"],
  [/^##BOOK_NOVEL/, "📖"],
  [/^##GAMES/, "🎮"],
  [/^##MUSIC_STREAM/, "🎵"],
  [/^##PRIVATE/, "🔒"],
  [/^###ANIME_STREAM/, "📺"],
  [/^###MANGA_READ/, "📚"],
  [/^###LIGHT_NOVEL_EBOOK/, "📕"],
  [/^###DOWNLOAD_MODS/, "💾"],
  [/^###MUSIC_VIDEO/, "🎶"],
  [/^###NSFW/, "🔞"],
  [/^###PRACTICE_GAMES/, "♟️"],

  // #__STUDY
  [/^#__STUDY$/, "📚"],
  [/^##ENGLISH/, "🇬🇧"],
  [/^##SCHOOL_VN/, "🇻🇳"],
  [/^##CODING_COURSES/, "💻"],
  [/^##DOCS_LIBRARY/, "📄"],
  [/^###IELTS_PRONUNCIATION/, "🗣️"],
  [/^###THPT_DGNL/, "🎓"],
  [/^###COURSE_LIBRARY/, "📦"],
  [/^###DRIVE_COURSES/, "📁"],
  [/^###DRIVE_DOCS/, "📁"],
  [/^###GENERAL_DOCS/, "📄"],
  [/^###GOOGLE_DRIVE_DOCS/, "📁"],

  // #__SERVER
  [/^#__SERVER$/, "🎮"],
  [/^##MINECRAFT_SERVER/, "⛏️"],
  [/^###HOSTING_PANEL/, "🖥️"],
  [/^###PLUGIN_MARKET/, "🔌"],
  [/^###WIKI_DOCS/, "📖"],
  [/^###RESOURCE_PACKS/, "📦"],
  [/^###TOOLS/, "🔧"],

  // #__TRADING
  [/^#__TRADING$/, "📈"],
  [/^##CRYPTO/, "₿"],
  [/^##MARKET/, "📊"],
  [/^##MONEY/, "💰"],
  [/^###DEX_CEX_AIRDROP/, "🪙"],
  [/^###CHART_BROKER/, "📈"],
  [/^###CURRENCY_PAYMENT/, "💱"],

  // #__SOCIAL
  [/^#__SOCIAL$/, "👥"],
  [/^##SOCIAL_APPS/, "💬"],
  [/^###CHAT_FEED/, "💬"],

  // #__SHOP
  [/^#__SHOP$/, "🛒"],
  [/^##DIGITAL_STORE/, "🎫"],
  [/^##WORK_MARKET/, "💼"],
  [/^##MARKETPLACE/, "🛍️"],
  [/^###AI_ACCOUNT_GAME/, "🤖"],
  [/^###FREELANCE_CREATOR/, "✍️"],
  [/^###SHOPPING/, "🛒"],

  // #__LINUX
  [/^#__LINUX$/, "🐧"],
  [/^##RICE_DOTFILES/, "🎨"],
  [/^###HYPRLAND_THEMES/, "🖼️"],

  // #__WORK
  [/^#__WORK$/, "💼"],
  [/^##PROJECTS/, "📊"],
  [/^###DASHBOARDS_DOCS/, "📋"],

  // Domain subfolders
  [/^github\.com$/, "🐙"],
  [/^huggingface\.co$/, "🤗"],
  [/^drive\.google\.com$/, "📁"],
  [/^docs\.google\.com$/, "📄"],
  [/^youtube\.com$/, "▶️"],
  [/^mail\.google\.com$/, "📧"],
  [/^spigotmc\.org$/, "🔌"],
  [/^shutterstock\.com$/, "📷"],
];

/** Get icon data URI for a folder name. */
export function getFolderIcon(folderName: string): string {
  for (const [pattern, emoji] of FOLDER_EMOJI_RULES) {
    if (pattern.test(folderName)) {
      return EMOJI_SVG(emoji);
    }
  }
  return EMOJI_SVG("📁"); // default
}
