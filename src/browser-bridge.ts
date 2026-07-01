import CDP from "chrome-remote-interface";

export interface BrowserBridgeOptions {
  host?: string;
  port?: number;
  keepTabs?: boolean;
  waitMs?: number;
}

export interface OpenBookmarkOptions {
  extractContent?: boolean;
  screenshot?: boolean;
  keepOpen?: boolean;
  waitMs?: number;
}

export interface BrowserConnectionStatus {
  ok: boolean;
  message: string;
}

export interface BrowserPageInfo {
  links: number;
  images: number;
  forms: number;
  hasLoginForm: boolean;
}

export interface ExtractedBrowserContent {
  title: string;
  url: string;
  description: string;
  content: string;
  pageInfo: BrowserPageInfo;
}

export interface OpenBookmarkResult {
  title: string;
  url: string;
  targetId: string;
  tabId: string;
  content?: ExtractedBrowserContent;
  screenshotBase64?: string;
  closed: boolean;
}

type CdpClient = Awaited<ReturnType<typeof CDP>>;
type CdpTarget = { id: string; title?: string; url?: string; type?: string };

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 9222;
const DEFAULT_WAIT_MS = 3_000;
const LOAD_TIMEOUT_MS = 30_000;

export class BrowserBridge {
  readonly host: string;
  readonly port: number;
  readonly keepTabs: boolean;
  readonly waitMs: number;

  constructor(options: BrowserBridgeOptions = {}) {
    this.host = options.host ?? DEFAULT_HOST;
    this.port = options.port ?? DEFAULT_PORT;
    this.keepTabs = options.keepTabs ?? false;
    this.waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  }

  async checkConnection(): Promise<BrowserConnectionStatus> {
    try {
      const version = await CDP.Version({ host: this.host, port: this.port });
      const browser = typeof version.Browser === "string" ? version.Browser : "Chrome/Chromium";
      return { ok: true, message: `Connected to ${browser} at ${this.host}:${this.port}` };
    } catch (error) {
      return {
        ok: false,
        message: `Chrome DevTools Protocol is not available at ${this.host}:${this.port}. Start Chrome/Chromium with --remote-debugging-port=${this.port} and retry. ${errorMessage(error)}`,
      };
    }
  }

  async openBookmark(url: string, options: OpenBookmarkOptions = {}): Promise<OpenBookmarkResult> {
    validateBrowserUrl(url);
    const status = await this.checkConnection();
    if (!status.ok) throw new Error(status.message);

    const keepOpen = options.keepOpen ?? this.keepTabs;
    const target = await CDP.New({ host: this.host, port: this.port, url }) as CdpTarget;
    let client: CdpClient | undefined;
    let closed = false;
    let result: OpenBookmarkResult | undefined;

    try {
      client = await CDP({ host: this.host, port: this.port, target: target.id });
      await client.Page.enable();
      await client.Runtime.enable();
      await client.Page.navigate({ url });
      await withTimeout(client.Page.loadEventFired(), LOAD_TIMEOUT_MS, `Timed out waiting for page load: ${url}`);
      await sleep(options.waitMs ?? this.waitMs);

      const title = await this.readTitle(client);
      const currentUrl = await this.readCurrentUrl(client);
      result = {
        title,
        url: currentUrl || url,
        targetId: target.id,
        tabId: target.id,
        closed: false,
      };

      if (options.extractContent) result.content = await this.extractContent(client);
      if (options.screenshot) {
        const screenshot = await client.Page.captureScreenshot();
        result.screenshotBase64 = screenshot.data;
      }
    } finally {
      if (client) await client.close();
      if (!keepOpen) {
        try {
          await CDP.Close({ host: this.host, port: this.port, id: target.id });
          closed = true;
        } catch {
          // Best-effort cleanup: the target may already be gone.
        }
      }
    }
    if (!result) throw new Error(`Failed to open ${url}`);
    result.closed = closed;
    return result;
  }

  async extractContentFromUrl(url: string, options: Omit<OpenBookmarkOptions, "extractContent" | "screenshot" | "keepOpen"> = {}): Promise<ExtractedBrowserContent> {
    const result = await this.openBookmark(url, { ...options, extractContent: true, keepOpen: false });
    if (!result.content) throw new Error(`No content extracted from ${url}`);
    return result.content;
  }

  private async readTitle(client: CdpClient): Promise<string> {
    const evaluated = await client.Runtime.evaluate({ expression: "document.title || ''", returnByValue: true });
    return typeof evaluated.result.value === "string" ? evaluated.result.value : "";
  }

  private async readCurrentUrl(client: CdpClient): Promise<string> {
    const evaluated = await client.Runtime.evaluate({ expression: "document.location.href", returnByValue: true });
    return typeof evaluated.result.value === "string" ? evaluated.result.value : "";
  }

  private async extractContent(client: CdpClient): Promise<ExtractedBrowserContent> {
    // The expression below is trusted local extraction code. The page content it
    // returns is untrusted data: callers must never execute returned text as code
    // and should avoid logging/storing sensitive private page content unnecessarily.
    const evaluated = await client.Runtime.evaluate({ expression: EXTRACTION_EXPRESSION, returnByValue: true });
    const value = evaluated.result.value as Partial<ExtractedBrowserContent> | undefined;
    return {
      title: typeof value?.title === "string" ? value.title : "",
      url: typeof value?.url === "string" ? value.url : "",
      description: typeof value?.description === "string" ? value.description : "",
      content: typeof value?.content === "string" ? value.content : "",
      pageInfo: {
        links: numberOrZero(value?.pageInfo?.links),
        images: numberOrZero(value?.pageInfo?.images),
        forms: numberOrZero(value?.pageInfo?.forms),
        hasLoginForm: Boolean(value?.pageInfo?.hasLoginForm),
      },
    };
  }
}

const EXTRACTION_EXPRESSION = `(() => {
  const title = document.title || '';
  const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]');
  const description = metaDesc ? (metaDesc.getAttribute('content') || '') : '';
  const contentArea =
    document.querySelector('[class*="notion-page-content"]') ||
    document.querySelector('[class*="notion-app-inner"]') ||
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('.content') ||
    document.body;

  const clone = contentArea ? contentArea.cloneNode(true) : document.createElement('div');
  clone.querySelectorAll('script, style, noscript, iframe, svg, canvas').forEach((el) => el.remove());
  const content = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  const hasLoginForm = Array.from(document.forms).some((form) => Boolean(
    form.querySelector('input[type="password"], input[name*="password" i], input[name*="email" i], input[type="email"]')
  ));

  return {
    title,
    url: document.location.href,
    description,
    content,
    pageInfo: {
      links: document.links.length,
      images: document.images.length,
      forms: document.forms.length,
      hasLoginForm,
    },
  };
})()`;

function validateBrowserUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported browser URL protocol: ${parsed.protocol}. Only http, https, and data URLs are allowed.`);
  }
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
