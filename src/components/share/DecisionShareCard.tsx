import type { DecisionCardData } from "@/lib/cards/types";
import { getCardTextSizes, sizeToClass } from "@/lib/cards/cardDensity";
import "./styles/card.css";

// Design tokens — keep in sync with docs/style-guide.html
const COLOR = {
  bg: "#1A1714",
  text: "#F4EFEA",
  textQuote: "#D4CFC8",
  textMuted: "#9A9A9A",
  textSubtle: "#7A7A7A",
  brand: "#C65A2E",
  buying: "#C65A2E",
  buyingRgb: "198, 90, 46",
  skipping: "#6B9E6F",
  skippingRgb: "107, 158, 111",
  thinking: "#9A9A9A",
  thinkingRgb: "154, 154, 154",
  surface: "rgba(42, 37, 32, 0.6)",
  surfaceBorder: "rgba(61, 55, 50, 0.8)",
  track: "#2A2520",
} as const;

const HANK_SCORE_LABELS: Record<number, string> = {
  1: "Pure impulse",
  2: "Pure impulse",
  3: "Gut feeling",
  4: "Gut feeling",
  5: "Half-examined",
  6: "Half-examined",
  7: "Well-considered",
  8: "Well-considered",
  9: "Thoroughly examined",
  10: "Thoroughly examined",
};

const FONT_MONO = "var(--font-mono)";

interface DecisionShareCardProps {
  data: DecisionCardData;
}

export function DecisionShareCard({ data }: DecisionShareCardProps) {
  const { decision, item, estimatedPrice, reactionText, hankScore } = data;

  const priceLabel = estimatedPrice
    ? `$${estimatedPrice.toLocaleString()}`
    : null;

  const quoteText = reactionText ?? "";
  const sizes = getCardTextSizes(item, quoteText);

  const accentMap = {
    buying: COLOR.buying,
    skipping: COLOR.skipping,
    thinking: COLOR.thinking,
  };
  const accentRgbMap = {
    buying: COLOR.buyingRgb,
    skipping: COLOR.skippingRgb,
    thinking: COLOR.thinkingRgb,
  };

  const accent = accentMap[decision];
  const accentRgb = accentRgbMap[decision];

  const stampLabel = decision === "buying" ? "BUYING IT" : decision === "skipping" ? "SKIPPING IT" : "THINKING";
  const stampSub = hankScore != null
    ? `Hank Score: ${hankScore}/10 — ${HANK_SCORE_LABELS[hankScore] ?? "Unknown"}`
    : decision === "buying" ? "They're buying it" : decision === "skipping" ? "Smart move" : "Need more time";

  const hasScore = hankScore != null;

  // Shared fragments rendered identically in both layouts
  const logoBlock = (
    <div className="flex items-center card-gap-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="card-icon-logo"
        src="/AskHankIcon.svg"
        alt=""
        style={{ borderRadius: "21%" }}
      />
      <span className="card-text-logo font-bold tracking-wide uppercase" style={{ color: COLOR.text }}>
        Ask <span style={{ color: COLOR.brand }}>Hank</span>
      </span>
    </div>
  );

  const stampBlock = (
    <>
      <span
        className="card-text-stamp font-black uppercase"
        style={{ color: accent, letterSpacing: "0.06em" }}
      >
        {stampLabel}
      </span>
    </>
  );

  const stampSubBlock = (
    <span className="card-stamp-sub font-bold uppercase" style={{ color: accent }}>
      {stampSub}
    </span>
  );

  const productBlock = (
    <div>
      <h2
        className={`font-bold capitalize card-text-product${sizeToClass(sizes.heroSize)}`}
        style={{ color: COLOR.text, letterSpacing: "-0.02em", lineHeight: "1.2" }}
      >
        {item}
      </h2>
      {priceLabel && (
        <p
          className="card-text-price card-mt-price"
          style={{ color: COLOR.brand, fontFamily: FONT_MONO, fontWeight: 500 }}
        >
          {priceLabel}
        </p>
      )}
    </div>
  );

  const quoteBlock = quoteText ? (
    <div
      className="card-quote-box"
      style={{ background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}` }}
    >
      <p
        className={`font-light italic card-text-quote${sizeToClass(sizes.insightSize)}`}
        style={{ color: COLOR.textQuote }}
      >
        &ldquo;{quoteText}&rdquo;
      </p>
    </div>
  ) : null;

  const scoreBlock = hasScore ? (
    <div className="card-score-section">
      <div className="flex justify-between items-baseline card-score-header">
        <span
          className="card-text-score-label font-semibold uppercase"
          style={{ color: COLOR.textMuted, letterSpacing: "0.1em" }}
        >
          Hank Score
        </span>
        <span
          className="card-text-score-value"
          style={{ color: accent, fontFamily: FONT_MONO, fontWeight: 500 }}
        >
          {hankScore} / 10
        </span>
      </div>
      <div className="card-score-track" style={{ background: COLOR.track }}>
        <div
          className="card-score-fill"
          style={{ width: `${(hankScore! / 10) * 100}%`, background: accent }}
        />
      </div>
    </div>
  ) : null;

  const urlBlock = (
    <span
      className="card-text-url"
      style={{ color: COLOR.brand, fontFamily: FONT_MONO, fontWeight: 500 }}
    >
      askhank.app
    </span>
  );

  return (
    <div
      className="share-card-container w-full h-full card-radius overflow-hidden relative"
      style={{ background: COLOR.bg, border: `1px solid rgba(255, 255, 255, 0.07)` }}
    >
      {/* Warm radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 0%, rgba(${accentRgb}, 0.08), transparent 60%)`,
        }}
      />

      <div className="relative h-full z-10 card-layout">
        {/* ── PORTRAIT ── */}
        <div className="card-portrait">
          {logoBlock}

          <div className="card-stamp">
            {stampBlock}
            <div className="card-stamp-frame">
              <div className="card-stamp-line" style={{ background: accent }} />
              {stampSubBlock}
              <div className="card-stamp-line" style={{ background: accent }} />
            </div>
          </div>

          {productBlock}
          {quoteBlock}
          {scoreBlock}

          <div className="card-footer-portrait" style={{ borderTop: `1px solid ${COLOR.track}` }}>
            <span className="card-text-tagline" style={{ color: COLOR.textSubtle }}>
              Ask before buying
            </span>
            {urlBlock}
          </div>
        </div>

        {/* ── LANDSCAPE ── */}
        <div className="card-landscape">
          <div className="card-ls-left">
            {logoBlock}
            <div className="card-ls-stamp-area">
              {stampBlock}
              {stampSubBlock}
            </div>
            <span className="card-text-tagline mt-auto" style={{ color: COLOR.textSubtle }}>
              Ask before buying
            </span>
          </div>

          <div
            className="card-ls-divider"
            style={{
              background: `linear-gradient(to bottom, transparent, ${accent} 30%, ${accent} 70%, transparent)`,
            }}
          />

          <div className="card-ls-right">
            {productBlock}
            {quoteBlock}

            <div className="mt-auto">
              {scoreBlock}
              <div className="card-ls-url" style={{ textAlign: "right" }}>
                {urlBlock}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
