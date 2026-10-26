import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/AppShell";
import { themeScript } from "@/components/ThemeToggle";

import { newsreader, onest } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cobra — o que fazem os políticos que representam você",
    template: "%s | Cobra",
  },
  description:
    "Veja, a partir de onde você mora, como votam, o que propõem e quanto gastam os políticos que representam você. Só fatos, com fonte oficial.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${onest.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before the first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
