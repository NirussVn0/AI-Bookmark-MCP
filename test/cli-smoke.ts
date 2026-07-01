import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const sample = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE><H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><A HREF="https://example.com">Example</A>
  </DL><p>
</DL><p>`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bookmark-mcp-cli-"));
const sampleFile = path.join(tmp, "sample.html");
fs.writeFileSync(sampleFile, sample, "utf-8");

const result = spawnSync(process.execPath, ["dist/cli.js", "stats", sampleFile], { cwd: process.cwd(), encoding: "utf-8" });
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /Total bookmarks: 1/);
console.log("cli smoke ok");
