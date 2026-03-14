import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getCardEntry, isValidCardType } from "@/lib/cards/registry";
import { CardPageClient } from "./CardPageClient";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const card = await fetchQuery(api.shareCards.getByToken, { token });

  if (!card || !isValidCardType(card.cardType)) {
    return { title: "Card — AskHank" };
  }

  const entry = getCardEntry(card.cardType);
  if (!entry) {
    return { title: "Card — AskHank" };
  }

  const title = entry.generateTitle(card.data);
  const description = entry.generateDescription(card.data);
  const ogImageUrl = `/api/og/${token}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "AskHank",
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CardPage({ params }: Props) {
  const { token } = await params;
  return <CardPageClient token={token} />;
}
