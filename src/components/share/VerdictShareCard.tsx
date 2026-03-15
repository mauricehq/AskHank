import type { VerdictCardData } from "@/lib/cards/types";
import { getCardTextSizes, sizeToClass } from "@/lib/cards/cardDensity";
import "./styles/card.css";

interface VerdictShareCardProps {
  data: VerdictCardData;
}

export function VerdictShareCard({ data }: VerdictShareCardProps) {
  const { verdict, item, estimatedPrice, excuse } = data;
  const isDenied = verdict === "denied";

  const priceLabel = estimatedPrice
    ? `$${estimatedPrice.toLocaleString()}`
    : null;

  // Calculate per-element text sizes based on content length
  const sizes = getCardTextSizes(item, excuse);

  const accentColor = isDenied ? "#D4673A" : "#6B9E6F";
  const accentRgb = isDenied ? "212, 103, 58" : "107, 158, 111";

  return (
    <div
      className="share-card-container w-full h-full card-radius border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden relative"
      style={{ background: "#1A1714" }}
    >
      {/* Background Flair - 4 gradient layers */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom right, rgba(${accentRgb}, 0.20), transparent, transparent)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at top right, rgba(${accentRgb}, 0.15), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.3)_100%)]" />
      <div
        className="absolute bottom-0 inset-x-0 h-1/2"
        style={{
          background: `linear-gradient(to top, rgba(${accentRgb}, 0.05), transparent)`,
        }}
      />

      <div className="relative h-full flex flex-col justify-between z-10 card-padding">
        {/* Header */}
        <div className="flex justify-between items-start flex-shrink-0">
          <div className="flex items-center card-gap-sm">
            {/* AskHank logo icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="card-icon-logo"
              src="/AskHankIcon.svg"
              alt=""
              style={{ borderRadius: "21%" }}
            />
            <span
              className="font-black tracking-tight leading-none card-text-logo"
              style={{ color: "#FFFFFF" }}
            >
              ASK HANK
            </span>
          </div>
          <div
            className="flex items-center card-gap-sm card-badge-padding rounded-full"
            style={{
              background: `rgba(${accentRgb}, 0.10)`,
              border: `1px solid rgba(${accentRgb}, 0.30)`,
            }}
          >
            {/* Badge icon */}
            {isDenied ? (
              <svg
                className="card-icon-badge"
                viewBox="0 0 14 14"
                fill="none"
                style={{ color: accentColor }}
              >
                <path
                  d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className="card-icon-badge"
                viewBox="0 0 14 14"
                fill="none"
                style={{ color: accentColor }}
              >
                <path
                  d="M2.5 7.5L5.5 10.5L11.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span
              className="card-text-badge font-black uppercase leading-none"
              style={{ color: accentColor }}
            >
              {isDenied ? "DENIED" : "APPROVED"}
            </span>
          </div>
        </div>

        {/* Main Content - switches to row layout in landscape */}
        <div className="card-main-content">
          {/* Item Info Section */}
          <div className="card-item-section">
            {/* Item name - hero with glow */}
            <h2
              className={`font-black card-text-hero${sizeToClass(sizes.heroSize)}`}
              style={{
                color: "#FFFFFF",
                filter: `drop-shadow(0 0 25px rgba(${accentRgb}, 0.35))`,
              }}
            >
              {item}
            </h2>

            {/* Price */}
            {priceLabel && (
              <p className="text-zinc-400 font-bold uppercase tracking-widest card-text-price card-mt-price">
                {priceLabel}
              </p>
            )}
          </div>

          {/* Accent divider - hidden in landscape */}
          <div
            className="card-divider"
            style={{ background: `rgba(${accentRgb}, 0.30)` }}
          />

          {/* Insight Section - contained box with icon */}
          <div className="card-insight-section">
            <div className="card-insight-box bg-white/5 border border-white/10 shadow-inner">
              <div className="flex items-start card-insight-layout">
                <div
                  className="card-icon-container flex items-center justify-center shrink-0"
                  style={{
                    background: `rgba(${accentRgb}, 0.10)`,
                    border: `1px solid rgba(${accentRgb}, 0.20)`,
                  }}
                >
                  {/* Quote mark SVG */}
                  <svg
                    className="card-icon-insight"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ color: accentColor }}
                  >
                    <path
                      d="M11 7.5V14H7.5C7.5 15.933 9.067 17.5 11 17.5V19.5C7.964 19.5 5.5 17.036 5.5 14V7.5H11ZM18.5 7.5V14H15C15 15.933 16.567 17.5 18.5 17.5V19.5C15.464 19.5 13 17.036 13 14V7.5H18.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <p
                  className={`font-light italic card-text-insight${sizeToClass(sizes.insightSize)}`}
                  style={{ color: "#E8E4DF" }}
                >
                  &ldquo;{excuse}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end flex-shrink-0">
          <span
            className="card-text-footer font-bold"
            style={{ color: accentColor }}
          >
            askhank.app
          </span>
          <span className="card-text-badge font-medium text-zinc-500 tracking-wide">
            Hank says {isDenied ? "no" : "yes"}
          </span>
        </div>
      </div>
    </div>
  );
}
