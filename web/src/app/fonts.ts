import { Newsreader, Onest } from "next/font/google";

// Downloaded at build time and served from our own domain: no request to Google from the visitor.
export const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});

export const onest = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-onest",
});
