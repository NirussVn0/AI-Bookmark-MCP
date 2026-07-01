import type { PageOffset } from "./types.js";

export interface ParsedPdfText {
  text: string;
  pageCount: number;
  pageOffsets: PageOffset[];
}

export function buildEvenPageOffsets(text: string, pageCount: number): PageOffset[] {
  const safePageCount = Math.max(1, Math.floor(pageCount || 1));
  const offsets: PageOffset[] = [];
  for (let page = 1; page <= safePageCount; page += 1) {
    const start = Math.floor(((page - 1) * text.length) / safePageCount);
    const end = page === safePageCount ? text.length : Math.floor((page * text.length) / safePageCount);
    offsets.push({ page, start, end });
  }
  return offsets;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfText> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      const pages = parsed.pages ?? [];
      if (pages.length > 0) {
        let text = "";
        const pageOffsets: PageOffset[] = [];
        for (const page of pages) {
          const start = text.length;
          text += (text ? "\n\n" : "") + page.text.trim();
          pageOffsets.push({ page: page.num, start, end: text.length });
        }
        return { text: text.trim(), pageCount: Math.max(1, parsed.total), pageOffsets };
      }
      const text = String(parsed.text ?? "").trim();
      const pageCount = Math.max(1, Number(parsed.total ?? 1));
      return { text, pageCount, pageOffsets: buildEvenPageOffsets(text, pageCount) };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
