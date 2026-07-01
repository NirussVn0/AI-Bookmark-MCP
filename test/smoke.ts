import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { classifyBookmark } from "../src/classifier.js";
import { exportBookmarks, mergeBookmarkFiles, readBookmarkFile } from "../src/index.js";

const sample = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><H3>Dev</H3>
    <DL><p>
      <DT><A HREF="https://github.com/modelcontextprotocol/typescript-sdk">MCP TypeScript SDK</A>
      <DT><A HREF="https://github.com/modelcontextprotocol/servers">MCP servers</A>
      <DT><A HREF="https://github.com/modelcontextprotocol/specification">Model Context Protocol spec</A>
      <DT><A HREF="https://github.com/PaperMC/Paper">Minecraft Paper server</A>
      <DT><A HREF="https://github.com/Yara-Rules/rules">YARA malware rules</A>
      <DT><A HREF="https://drive.google.com/file/d/course">Python Django course</A>
      <DT><A HREF="https://docs.google.com/document/d/ielts">IELTS English notes</A>
      <DT><A HREF="https://chatgpt.com/">ChatGPT</A>
      <DT><A HREF="https://claude.ai/">Claude</A>
      <DT><A HREF="https://docs.github.com/en/actions">GitHub Actions docs</A>
      <DT><A HREF="https://docs.github.com/en/rest">GitHub REST docs</A>
      <DT><A HREF="https://docs.github.com/en/graphql">GitHub GraphQL docs</A>
      <DT><A HREF="https://docs.github.com/en/issues">GitHub Issues docs</A>
      <DT><A HREF="https://docs.github.com/en/apps">GitHub Apps docs</A>
      <DT><A HREF="https://docs.github.com/en/webhooks">GitHub Webhooks docs</A>
    </DL><p>
  </DL><p>
</DL><p>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bookmark-mcp-smoke-"));
const sampleFile = path.join(tmp, "sample.html");
const mergedFile = path.join(tmp, "merged.html");
const jsonFile = path.join(tmp, "bookmarks.json");
fs.writeFileSync(sampleFile, sample, "utf-8");

const realInput = path.resolve(process.cwd(), "..", "bookmarks_merged.html");
const readTarget = fs.existsSync(realInput) ? realInput : sampleFile;
const parsed = readBookmarkFile(readTarget);
assert.ok(parsed.bookmarks.length > 0, "readBookmarkFile should parse at least one bookmark");

const mergeResult = mergeBookmarkFiles([sampleFile], mergedFile);
assert.equal(mergeResult.finalCount, 15);
const mergedHtml = fs.readFileSync(mergedFile, "utf-8");
assert.match(mergedHtml, /<DT><H3 ADD_DATE="\d+" ICON="data:image\/svg\+xml;base64,[^"]+">/);
assert.match(mergedHtml, /<H3 ADD_DATE="\d+" ICON="data:image\/svg\+xml;base64,[^"]+" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar<\/H3>/);
assert.match(mergedHtml, /<H3 ADD_DATE="\d+" ICON="data:image\/svg\+xml;base64,[^"]+">Other Bookmarks<\/H3>/);
assert.doesNotMatch(mergedHtml, />docs\.github\.com<\/H3>/, "Other Bookmarks should be semantic-first by default, not domain-grouped");
assert.match(mergedHtml, />#__CODER<\/H3>/);
assert.match(mergedHtml, />###MINECRAFT<\/H3>/);
assert.match(mergedHtml, />###SECURITY_RE<\/H3>/);
assert.match(mergedHtml, />###AI_AGENT_LLM<\/H3>/);
assert.match(mergedHtml, />###DRIVE_COURSES<\/H3>/);
assert.match(mergedHtml, />###DRIVE_DOCS<\/H3>/);
assert.match(mergedHtml, />###CORE_CHAT<\/H3>/);
assert.doesNotMatch(mergedHtml, /###UNCATEGORIZED_REPO/);

const mcpPath = classifyBookmark({
  title: "Model Context Protocol TypeScript SDK",
  url: "https://github.com/modelcontextprotocol/typescript-sdk",
  folderPath: "",
});
assert.equal(mcpPath, "#__CODER/##GITHUB_REPOS/###AI_AGENT_LLM");

assert.equal(classifyBookmark({ title: "Minecraft Paper server", url: "https://github.com/PaperMC/Paper", folderPath: "" }), "#__CODER/##GITHUB_REPOS/###MINECRAFT");
assert.equal(classifyBookmark({ title: "YARA malware rules", url: "https://github.com/Yara-Rules/rules", folderPath: "" }), "#__CODER/##GITHUB_REPOS/###SECURITY_RE");
assert.equal(classifyBookmark({ title: "Python Django course", url: "https://drive.google.com/file/d/course", folderPath: "" }), "#__STUDY/##CODING_COURSES/###DRIVE_COURSES");
assert.equal(classifyBookmark({ title: "IELTS English notes", url: "https://docs.google.com/document/d/ielts", folderPath: "" }), "#__STUDY/##ENGLISH/###DRIVE_DOCS");
assert.equal(classifyBookmark({ title: "ChatGPT", url: "https://chatgpt.com/", folderPath: "" }), "#__AI/##CHAT/###CORE_CHAT");

const groupedFile = path.join(tmp, "merged-grouped.html");
mergeBookmarkFiles([sampleFile], groupedFile, true);
assert.match(fs.readFileSync(groupedFile, "utf-8"), />docs\.github\.com<\/H3>/, "explicit groupByDomain should still be available");

const exportedCount = exportBookmarks(sampleFile, jsonFile, "json");
assert.equal(exportedCount, 15);
assert.equal(JSON.parse(fs.readFileSync(jsonFile, "utf-8")).length, 15);

console.log(`smoke ok: parsed=${parsed.bookmarks.length}, merged=${mergeResult.finalCount}, tmp=${tmp}`);
