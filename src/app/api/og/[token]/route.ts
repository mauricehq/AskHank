import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const card = await convex.query(api.shareCards.getByToken, { token });

  if (!card?.ogImageUrl) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(card.ogImageUrl, 302);
}
