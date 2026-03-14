import type { VerdictCardData } from "@/lib/cards/types";
import { getCardTextDensity } from "@/lib/cards/cardDensity";
import "./styles/card.css";

interface VerdictShareCardProps {
  data: VerdictCardData;
}

export function VerdictShareCard({ data }: VerdictShareCardProps) {
  const { verdict, item, estimatedPrice, category, excuse, verdictTagline } = data;
  const isDenied = verdict === "denied";
  const density = getCardTextDensity(item, excuse);

  const priceLabel = estimatedPrice
    ? `$${estimatedPrice.toLocaleString()}`
    : null;

  const metaParts = [priceLabel, category].filter(Boolean).join(" · ");

  // Truncate excuse to ~2 lines worth for the card
  const maxExcuseLen = density === "tight" ? 120 : density === "compact" ? 160 : 200;
  const displayExcuse =
    excuse.length > maxExcuseLen
      ? excuse.slice(0, maxExcuseLen).trimEnd() + "..."
      : excuse;

  return (
    <div className="share-card-container">
      <div
        className="card-padding flex flex-col justify-between w-full h-full relative overflow-hidden"
        style={{
          background: "#1A1714",
          color: "#F4EFEA",
          fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Subtle radial gradient warmth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDenied
              ? "radial-gradient(ellipse at 30% 80%, rgba(198, 90, 46, 0.08) 0%, transparent 60%)"
              : "radial-gradient(ellipse at 30% 80%, rgba(90, 138, 94, 0.08) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col justify-between h-full card-gap">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="card-text-label" style={{ color: "#9A9A9A" }}>
              ASK HANK
            </span>
            <span
              className="card-text-label"
              style={{
                color: isDenied ? "#D4673A" : "#6B9E6F",
              }}
            >
              {isDenied ? "DENIED" : "APPROVED"}
            </span>
          </div>

          {/* Main content — switches to row in landscape via container query */}
          <div className="card-layout flex flex-col card-gap flex-1 justify-center">
            {/* Left side: item + meta */}
            <div className="card-left flex flex-col card-gap-sm">
              <h1 className={`card-text-hero ${density}`}>
                {item}
              </h1>
              {metaParts.length > 0 && (
                <p className="card-text-meta" style={{ color: "#9A9A9A" }}>
                  {metaParts}
                </p>
              )}
            </div>

            {/* Divider (hidden in landscape) */}
            <div
              className="card-divider"
              style={{
                height: 1,
                background: "rgba(244, 239, 234, 0.1)",
              }}
            />

            {/* Right side: excuse + tagline */}
            <div className="card-right flex flex-col card-gap-sm">
              <p className={`card-text-excuse ${density}`}>
                &ldquo;{displayExcuse}&rdquo;
              </p>
              {verdictTagline && (
                <p
                  className="card-text-tagline"
                  style={{
                    color: isDenied ? "#D4673A" : "#6B9E6F",
                  }}
                >
                  {verdictTagline}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="card-text-footer" style={{ color: "#9A9A9A" }}>
              askhank.app
            </span>
            <span className="card-text-footer" style={{ color: "#9A9A9A" }}>
              Hank says {isDenied ? "no" : "yes"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
