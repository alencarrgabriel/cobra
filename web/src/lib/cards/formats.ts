// Card formats (RF-61): stories 9:16, feed 4:5 and link preview 1.91:1.

export type CardFormat = "stories" | "feed" | "link";

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> =
  {
    stories: { width: 1080, height: 1920 },
    feed: { width: 1080, height: 1350 },
    link: { width: 1200, height: 630 },
  };

export const isCardFormat = (value: string): value is CardFormat =>
  Object.hasOwn(CARD_SIZES, value);
