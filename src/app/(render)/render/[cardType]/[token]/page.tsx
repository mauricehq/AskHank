import { headers } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { isValidCardType } from "@/lib/cards/registry";
import { VerdictShareCard } from "@/components/share/VerdictShareCard";
import type { VerdictCardData } from "@/lib/cards/types";

type Props = {
  params: Promise<{ cardType: string; token: string }>;
  searchParams: Promise<{ format?: string }>;
};

export default async function RenderPage({ params, searchParams }: Props) {
  const { cardType, token } = await params;
  const { format = "download" } = await searchParams;

  // Validate render page secret from HTTP header
  const headersList = await headers();
  const secret = headersList.get("x-render-secret");
  const renderSecret = process.env.RENDER_PAGE_SECRET;
  if (!renderSecret || secret !== renderSecret) {
    return <div>Not found</div>;
  }

  if (!isValidCardType(cardType)) {
    return <div>Invalid card type</div>;
  }

  const card = await fetchQuery(api.shareCards.getByToken, { token });
  if (!card) {
    return <div>Card not found</div>;
  }

  const isOg = format === "og";
  const width = isOg ? 1200 : 1080;
  const height = isOg ? 630 : 1350;

  return (
    <div
      style={{
        width,
        height,
        background: "#1A1714",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle gradient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isOg
            ? "radial-gradient(ellipse at 50% 50%, rgba(198, 90, 46, 0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 70%, rgba(198, 90, 46, 0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      {/* Card with padding */}
      <div
        style={{
          position: "absolute",
          inset: 40,
        }}
      >
        {cardType === "verdict" && <VerdictShareCard data={card.data as VerdictCardData} />}
      </div>
    </div>
  );
}
