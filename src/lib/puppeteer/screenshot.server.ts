/**
 * Server-side screenshot utility using Puppeteer
 * Optimized for Vercel serverless environment
 *
 * Uses puppeteer-core + @sparticuz/chromium for serverless compatibility
 */

import fs from "fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const IMAGE_DIMENSIONS = {
  og: { width: 1200, height: 630 },
  download: { width: 1080, height: 1350 },
} as const;

export type ImageFormat = keyof typeof IMAGE_DIMENSIONS;

interface ScreenshotOptions {
  url: string;
  format: ImageFormat;
  deviceScaleFactor?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

interface ScreenshotResult {
  buffer: Buffer;
  width: number;
  height: number;
}

async function getExecutablePath(): Promise<string> {
  // Production (Vercel/Lambda): use @sparticuz/chromium
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath();
  }

  // Local dev: use system Chrome
  const localPaths = [
    // Explicit env var override
    process.env.CHROME_PATH,
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  for (const path of localPaths) {
    if (path && fs.existsSync(path)) return path;
  }

  throw new Error("Chrome executable not found. Install Chrome or set CHROME_PATH.");
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = await getExecutablePath();
  const isProduction = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  return puppeteer.launch({
    executablePath,
    args: isProduction
      ? chromium.args
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
    headless: true,
    defaultViewport: null,
  });
}

const ALLOWED_HOSTS = ["localhost", "127.0.0.1", "askhank.app"];

function isAllowedUrl(url: string): boolean {
  const parsed = new URL(url);
  return (
    ALLOWED_HOSTS.includes(parsed.hostname) ||
    parsed.hostname.endsWith(".askhank.app") ||
    parsed.hostname.endsWith(".vercel.app")
  );
}

export async function captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const {
    url,
    format,
    deviceScaleFactor = 2,
    timeout = 30000,
    headers,
  } = options;

  if (!isAllowedUrl(url)) {
    throw new Error(`Blocked screenshot request to untrusted host: ${new URL(url).hostname}`);
  }

  const dimensions = IMAGE_DIMENSIONS[format];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await launchBrowser();
    page = await browser.newPage();

    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor,
    });

    if (headers) {
      await page.setExtraHTTPHeaders(headers);
    }

    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout,
    });

    // Small delay to ensure fonts are rendered
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));

    const buffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
      },
    });

    return {
      buffer: Buffer.from(buffer),
      width: dimensions.width * deviceScaleFactor,
      height: dimensions.height * deviceScaleFactor,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
