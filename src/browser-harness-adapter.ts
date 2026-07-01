import { spawnSync } from "node:child_process";

export interface BrowserHarnessStatus {
  available: boolean;
  command: string;
  message: string;
}

const CANDIDATE_COMMANDS = ["browser-harness", "opencode-browser-harness"];

export function checkBrowserHarness(): BrowserHarnessStatus {
  for (const command of CANDIDATE_COMMANDS) {
    const result = spawnSync(command, ["--help"], { encoding: "utf-8", timeout: 5_000, shell: process.platform === "win32" });
    if (!result.error && (result.status === 0 || result.status === 1)) {
      return { available: true, command, message: `${command} is available. Extraction via harness is not enabled because no stable CLI contract is assumed; use CDP browser extraction instead.` };
    }
  }
  return { available: false, command: CANDIDATE_COMMANDS.join(" | "), message: "browser-harness command was not found on PATH. This is optional; tests and MCP server do not require it." };
}
