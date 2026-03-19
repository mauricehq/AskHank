import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { ReplayPageClient } from "./ReplayPageClient";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const cut = await fetchQuery(api.replayCuts.getByToken, { token });

  if (!cut) {
    return { title: "Replay — AskHank" };
  }

  const label = cut.decision === "buying" ? "buying" : cut.decision === "skipping" ? "skipping" : "thinking about";
  const title = `${label} ${cut.item} — AskHank`;
  const description =
    cut.reactionText ?? `Watch Hank challenge this purchase decision.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "AskHank",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ReplayPage({ params }: Props) {
  const { token } = await params;
  return <ReplayPageClient token={token} />;
}
