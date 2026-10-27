import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { FLAGS } from "@/lib/geo/flags";
import { formatDate } from "@/lib/works/format";

import type { CardContent } from "./content";
import { CARD_SIZES, type CardFormat } from "./formats";
import { photoDataUrl } from "./photo";

// One card template for every party and politician (change compartilhamento, design D2):
// fixed light background and text; the party color appears only in the acronym badge.

const BG = "#efeee9";
const FG = "#1b1c1a";
const MUTED = "#5c5e58";
const LINE = "#d8d5cc";
const SURFACE = "#f8f7f3";

const FONT_DIR = join(process.cwd(), "assets", "fonts");
let fonts: Promise<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>;

function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "onest-latin-400-normal.woff")),
    readFile(join(FONT_DIR, "onest-latin-700-normal.woff")),
    readFile(join(FONT_DIR, "newsreader-latin-600-normal.woff")),
  ]).then(([regular, bold, display]) => [
    {
      name: "Onest",
      data: regular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Onest",
      data: bold,
      weight: 700 as const,
      style: "normal" as const,
    },
    {
      name: "Newsreader",
      data: display,
      weight: 600 as const,
      style: "normal" as const,
    },
  ]);
  return fonts;
}

async function flagImage(uf: string) {
  const info = FLAGS[uf];
  if (!info) return null;
  const svg = await readFile(
    join(process.cwd(), "public", "bandeiras", info.file),
    "utf8",
  );
  const box = /viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/.exec(svg);
  const ratio = box ? Number(box[2]) / Number(box[1]) : 0.7;
  return {
    src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    ratio,
  };
}

/** Long titles shrink in steps so they fit the card. */
const titleScale = (title: string) =>
  title.length > 80 ? 0.62 : title.length > 45 ? 0.78 : 1;

export async function renderCard(
  content: CardContent,
  format: CardFormat,
  host: string,
  headers: Record<string, string> = {},
): Promise<ImageResponse> {
  const { width, height } = CARD_SIZES[format];
  const wide = format === "link";
  const k = wide ? 0.6 : format === "stories" ? 1.15 : 1;
  const [photo, flag] = await Promise.all([
    content.photo ? photoDataUrl(content.photo.url) : null,
    content.flagUf ? flagImage(content.flagUf) : null,
  ]);
  const visualSize = wide ? 240 : format === "stories" ? 420 : 320;

  let visual = null;
  if (content.photo) {
    visual = photo ? (
      // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not HTML
      <img
        src={photo}
        alt=""
        width={visualSize}
        height={visualSize}
        style={{
          borderRadius: visualSize,
          objectFit: "cover",
          border: `6px solid ${LINE}`,
        }}
      />
    ) : (
      <div
        style={{
          width: visualSize,
          height: visualSize,
          borderRadius: visualSize,
          background: SURFACE,
          border: `6px solid ${LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: visualSize * 0.36,
          fontWeight: 700,
          color: MUTED,
        }}
      >
        {content.photo.initials}
      </div>
    );
  } else if (flag) {
    visual = (
      // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not HTML
      <img
        src={flag.src}
        alt=""
        width={visualSize}
        height={Math.round(visualSize * flag.ratio)}
        style={{ border: `2px solid ${LINE}` }}
      />
    );
  }

  const element = (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: FG,
        fontFamily: "Onest",
        padding: wide ? 56 : 88,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: wide ? "row" : "column",
          flex: 1,
          gap: wide ? 48 : 56,
          alignItems: wide ? "center" : "flex-start",
          justifyContent: "center",
        }}
      >
        {visual}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: wide ? 1 : 0,
            gap: 22 * k,
          }}
        >
          <div
            style={{
              fontSize: 30 * k,
              fontWeight: 700,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {content.kicker}
          </div>
          <div
            style={{
              fontFamily: "Newsreader",
              fontWeight: 600,
              fontSize: 96 * k * titleScale(content.title),
              lineHeight: 1.05,
            }}
          >
            {content.title}
          </div>
          {content.badge || content.status ? (
            <div style={{ display: "flex", gap: 16 }}>
              {content.badge ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12 * k,
                    fontSize: 32 * k,
                    fontWeight: 700,
                  }}
                >
                  <div
                    style={{
                      width: 26 * k,
                      height: 26 * k,
                      borderRadius: 6,
                      background: content.badge.color,
                    }}
                  />
                  {content.badge.text}
                </div>
              ) : null}
              {content.status ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 34 * k,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: content.status.color,
                    borderRadius: 999,
                    padding: `${10 * k}px ${26 * k}px`,
                  }}
                >
                  {content.status.text}
                </div>
              ) : null}
            </div>
          ) : null}
          {content.lines.map((line) => (
            <div key={line} style={{ fontSize: 38 * k, lineHeight: 1.3 }}>
              {line}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 32,
          borderTop: `2px solid ${LINE}`,
          paddingTop: 24 * k,
          fontSize: 26 * k,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex", flex: 1 }}>
          {`Fonte: ${content.source}${content.updatedOn ? ` · Atualizado em ${formatDate(content.updatedOn)}` : ""}`}
        </div>
        <div style={{ fontWeight: 700, color: FG, fontSize: 32 * k }}>
          {host}
        </div>
      </div>
    </div>
  );

  return new ImageResponse(element, {
    width,
    height,
    fonts: await loadFonts(),
    headers,
  });
}
