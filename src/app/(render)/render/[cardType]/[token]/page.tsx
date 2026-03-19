import { headers } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { isValidCardType } from "@/lib/cards/registry";
import { DecisionShareCard } from "@/components/share/DecisionShareCard";
import type { DecisionCardData } from "@/lib/cards/types";

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

  const data = card.data as DecisionCardData;

  if (format === "og") {
    return (
      <OgLayout>
        {cardType === "decision" && <DecisionShareCard data={data} />}
      </OgLayout>
    );
  }

  return (
    <DownloadLayout>
      {cardType === "decision" && <DecisionShareCard data={data} />}
    </DownloadLayout>
  );
}

/**
 * Download format: 1080x1350 (4:5 portrait for Instagram/Reddit)
 *
 * Card fills the canvas with 40px padding on all sides.
 * Container queries make the card scale proportionally.
 * Portrait aspect ratio keeps the vertical layout.
 */
function DownloadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: "#110F0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 40,
      }}
    >
      {/* Positioned glow orb - top right (brand orange) */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(212, 103, 58, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      {/* Positioned glow orb - bottom left (brand orange) */}
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(212, 103, 58, 0.05) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      {/* Card fills available space - container queries handle scaling */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * OG format: 1200x630 (landscape for Twitter/Facebook/LinkedIn)
 *
 * Card fills the canvas with 40px padding on all sides.
 * Landscape aspect ratio (1.9:1) triggers the card's landscape layout
 * via container query @container (min-aspect-ratio: 3/2).
 * Content rearranges horizontally with item info on left, insight on right.
 */
function OgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "#110F0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 40,
      }}
    >
      {/* Subtle background flair - ellipse gradient (brand orange) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(212, 103, 58, 0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      {/* Card fills available space - container queries handle layout switch */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}
