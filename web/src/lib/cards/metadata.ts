import type { Metadata } from "next";

import { CARD_SIZES } from "./formats";
import { cardPath } from "./share";

// Link preview of a shareable page (change compartilhamento, design D5): Open Graph and the X
// card, both pointing at the 1.91:1 card of the same page. Relative URLs are made absolute by
// `metadataBase` in the root layout.

export function shareMetadata(input: {
  title: string;
  description: string;
  path: string;
  card: Parameters<typeof cardPath>;
  type?: "website" | "profile";
}): Metadata {
  const image = {
    url: cardPath(...input.card),
    ...CARD_SIZES.link,
    alt: `${input.title}. ${input.description}`,
  };
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      siteName: "Cobra",
      locale: "pt_BR",
      type: input.type ?? "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
