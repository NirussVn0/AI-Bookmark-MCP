import assert from "node:assert/strict";

import { BrowserBridge } from "../src/browser-bridge.js";

const bridge = new BrowserBridge({ waitMs: 50 });
const status = await bridge.checkConnection();

assert.equal(typeof status.ok, "boolean");
assert.equal(typeof status.message, "string");
assert.ok(status.message.length > 0);

if (!status.ok) {
  console.log(`browser bridge smoke skipped live extraction: ${status.message}`);
} else {
  const html = "<!doctype html><title>Bridge Smoke</title><main><h1>Hello CDP</h1><p>Visible bookmark content.</p><a href='https://example.com'>link</a></main>";
  const url = `data:text/html,${encodeURIComponent(html)}`;
  const content = await bridge.extractContentFromUrl(url, { waitMs: 50 });
  assert.equal(content.title, "Bridge Smoke");
  assert.match(content.content, /Hello CDP/);
  assert.equal(content.pageInfo.links, 1);
  console.log(`browser bridge smoke ok: ${status.message}`);
}
