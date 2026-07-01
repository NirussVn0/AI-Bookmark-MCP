/**
 * Bookmark HTML parser — parses Netscape bookmark format.
 * Ported from Python merge_bookmarks.py
 */

export interface Bookmark {
  title: string;
  url: string;
  icon?: string;
  addDate?: string;
  folderPath: string;
}

export interface BookmarkFolder {
  type: "folder";
  title: string;
  children: (BookmarkFolder | BookmarkNode)[];
}

export interface BookmarkNode {
  type: "link";
  title: string;
  url: string;
  icon?: string;
  addDate?: string;
}

const H3_RE = /<DT><H3[^>]*>(.*?)<\/H3>/;
const A_RE = /<DT><A\s+HREF="([^"]*)"[^>]*>(.*?)<\/A>/;
const ICON_RE = /ICON="([^"]*)"/;
const ADD_DATE_RE = /ADD_DATE="(\d+)"/;

/** Parse Netscape bookmark HTML into a tree. */
export function parseBookmarkHtml(html: string): BookmarkFolder {
  const lines = html.split("\n");
  const root: BookmarkFolder = { type: "folder", title: "ROOT", children: [] };
  const stack: BookmarkFolder[] = [root];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Folder header
    const h3 = line.match(H3_RE);
    if (h3) {
      const title = decodeHtml(h3[1]);
      const folder: BookmarkFolder = { type: "folder", title, children: [] };
      stack[stack.length - 1].children.push(folder);
      stack.push(folder);
      continue;
    }

    // Link
    const a = line.match(A_RE);
    if (a) {
      const url = decodeHtml(a[1]);
      const title = decodeHtml(a[2]);
      const iconMatch = line.match(ICON_RE);
      const dateMatch = line.match(ADD_DATE_RE);
      const node: BookmarkNode = {
        type: "link",
        title,
        url,
        icon: iconMatch?.[1],
        addDate: dateMatch?.[1],
      };
      stack[stack.length - 1].children.push(node);
      continue;
    }

    // Folder close
    if (line.startsWith("</DL>")) {
      if (stack.length > 1) stack.pop();
      continue;
    }
  }

  return root;
}

/** Flatten tree into list of bookmarks with folder paths. */
export function flattenBookmarks(node: BookmarkFolder | BookmarkNode, path = ""): Bookmark[] {
  const results: Bookmark[] = [];

  if (node.type === "link") {
    results.push({
      title: node.title,
      url: node.url,
      icon: node.icon,
      addDate: node.addDate,
      folderPath: path,
    });
    return results;
  }

  const currentPath = path ? `${path}/${node.title}` : node.title;
  for (const child of node.children) {
    results.push(...flattenBookmarks(child, currentPath));
  }
  return results;
}

/** Count links and folders in a tree. */
export function countTree(node: BookmarkFolder | BookmarkNode): { links: number; folders: number } {
  if (node.type === "link") return { links: 1, folders: 0 };
  let links = 0;
  let folders = 0;
  for (const child of node.children) {
    const c = countTree(child);
    links += c.links;
    folders += c.folders;
  }
  return { links, folders: folders + (node.title !== "ROOT" ? 1 : 0) };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}
