export const STARTER_CREDITS = 30;
export const MESSAGE_COST = 1;
export const PHOTO_MESSAGE_COST = 3;

export const CREDIT_PACKS = {
  small: { credits: 25, priceCents: 299, label: "25 credits", priceLabel: "$2.99" },
  medium: { credits: 75, priceCents: 699, label: "75 credits", priceLabel: "$6.99" },
  large: { credits: 200, priceCents: 1499, label: "200 credits", priceLabel: "$14.99" },
} as const;

export type PackId = keyof typeof CREDIT_PACKS;
