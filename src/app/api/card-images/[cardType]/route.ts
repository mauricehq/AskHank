import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { put } from "@vercel/blob";
import { api } from "../../../../../convex/_generated/api";
import { isValidCardType } from "@/lib/cards/registry";
import { captureScreenshot, type ImageFormat } from "@/lib/puppeteer/screenshot.server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Simple in-memory rate limiter (resets on cold start)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  requestLog.set(userId, recent);
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardType: string }> }
) {
  try {
    const { cardType } = await params;

    if (!isValidCardType(cardType)) {
      return NextResponse.json({ error: "Invalid card type" }, { status: 400 });
    }

    // Auth check
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    if (isRateLimited(userId)) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, format } = body as { token: string; format: ImageFormat };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (format !== "og" && format !== "download") {
      return NextResponse.json({ error: 'Format must be "og" or "download"' }, { status: 400 });
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const clerkToken = await getToken({ template: "convex" });
    if (clerkToken) convex.setAuth(clerkToken);

    // Ownership check — fails fast before expensive Puppeteer work
    const card = await convex.query(api.shareCards.verifyOwnership, { token });

    // Cache check: return existing URL if already generated
    const urlField = format === "og" ? "ogImageUrl" : "downloadImageUrl";
    if (card[urlField]) {
      return NextResponse.json({ imageUrl: card[urlField], cached: true });
    }

    const renderSecret = process.env.RENDER_PAGE_SECRET;
    if (!renderSecret) {
      console.error("RENDER_PAGE_SECRET not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host") || "localhost:3000"}`;
    const renderUrl = `${baseUrl}/render/${cardType}/${token}?format=${format}`;

    const { buffer } = await captureScreenshot({
      url: renderUrl,
      format,
      deviceScaleFactor: 2,
      timeout: 25000,
      headers: { "x-render-secret": renderSecret },
    });

    // Re-check cache after expensive Puppeteer work (race condition guard)
    const freshCard = await convex.query(api.shareCards.verifyOwnership, { token });
    if (freshCard[urlField]) {
      return NextResponse.json({ imageUrl: freshCard[urlField], cached: true });
    }

    // Upload to Vercel Blob
    const blob = await put(`cards/${format}/${token}.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
    });

    // Save URL to shareCards table
    await convex.mutation(api.shareCards.setImageUrl, {
      token,
      field: urlField,
      url: blob.url,
    });

    return NextResponse.json({ imageUrl: blob.url, cached: false });
  } catch (error) {
    console.error("Card image generation error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
