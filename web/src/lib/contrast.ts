// WCAG 2.1 contrast helpers used to keep party badges readable whatever color a party has.
const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#141512";
export const AA = 4.5;

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const toHex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Picks the text color with the best contrast on `background`. If neither reaches AA,
 * darkens the background step by step until white text does.
 */
export function readableTextOn(background: string): {
  background: string;
  text: string;
  ratio: number;
} {
  let bg = toHex(parse(background));
  for (let i = 0; i <= 20; i++) {
    const light = contrastRatio(bg, LIGHT_TEXT);
    const dark = contrastRatio(bg, DARK_TEXT);
    const best =
      light >= dark
        ? { text: LIGHT_TEXT, ratio: light }
        : { text: DARK_TEXT, ratio: dark };
    if (best.ratio >= AA) return { background: bg, ...best };
    bg = toHex(parse(bg).map((v) => v * 0.9));
  }
  return {
    background: bg,
    text: LIGHT_TEXT,
    ratio: contrastRatio(bg, LIGHT_TEXT),
  };
}
