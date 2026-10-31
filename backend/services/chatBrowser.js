import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { access } from "node:fs/promises";
import { join } from "node:path";

async function localBrowserPath() {
  const candidates = [process.env.CHROME_EXECUTABLE_PATH].filter(Boolean);
  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA;
    candidates.push(
      join(programFiles, "Google/Chrome/Application/chrome.exe"),
      join(programFilesX86, "Google/Chrome/Application/chrome.exe"),
      join(programFiles, "Microsoft/Edge/Application/msedge.exe"),
      ...(localAppData ? [join(localAppData, "Google/Chrome/Application/chrome.exe")] : []),
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
  }
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch { /* Try the next standard browser location. */ }
  }
  return null;
}

// In production use the small serverless Chromium binary. Locally, point to an
// already-installed Chrome/Chromium so we do not download Puppeteer's browser.
export async function launchChatBrowser() {
  const executablePath = process.env.NODE_ENV === "production"
    ? await chromium.executablePath()
    : await localBrowserPath();

  if (!executablePath) {
    throw new Error("Set CHROME_EXECUTABLE_PATH to a local Chrome/Chromium executable.");
  }

  return puppeteer.launch({
    args: process.env.NODE_ENV === "production"
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });
}
