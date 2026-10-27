// Literal excerpts of a plan page (change plano-de-governo, design D2). Matching happens on a
// "folded" copy (no accents, lower case) with the same length as the original, and the excerpt
// is cut from the original: what is shown is exactly the text of the PDF.

export type Segment = { text: string; mark: boolean };
export type Excerpt = Segment[];
type Range = [start: number, end: number];

/** Same length as the input: one folded unit per original unit. */
export function fold(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    out += c.normalize("NFD")[0]!.toLowerCase()[0]!;
  }
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where the terms occur. "word" matches whole words (theme keywords); "prefix" matches words
 * that start with the term, so a root also finds the plural (search).
 */
export function findMatches(
  text: string,
  terms: string[],
  mode: "word" | "prefix",
): Range[] {
  const folded = fold(text);
  const ranges: Range[] = [];
  for (const term of terms) {
    const body = escape(fold(term).trim()).replace(/\s+/g, "\\s+");
    if (!body) continue;
    const tail = mode === "word" ? "(?![\\p{L}\\p{N}])" : "[\\p{L}\\p{N}]*";
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${body}${tail}`, "gu");
    for (const m of folded.matchAll(re))
      ranges.push([m.index, m.index + m[0].length]);
  }
  return merge(ranges);
}

function merge(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/** Search words as roots: folded, and without a final "s" so the plural matches. */
export function searchTerms(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2)
        .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)),
    ),
  ];
}

const collapse = (s: string) => s.replace(/\s+/g, " ");

/** Up to `max` excerpts around the matches, cut at spaces, with the matches marked. */
export function excerpts(
  text: string,
  matches: Range[],
  { max = 3, radius = 160 } = {},
): Excerpt[] {
  const windows: Range[] = [];
  for (const [s, e] of matches) {
    let start = Math.max(0, s - radius);
    let end = Math.min(text.length, e + radius);
    if (start > 0) {
      const space = text.slice(start, s).search(/\s/);
      if (space >= 0) start += space + 1;
    }
    if (end < text.length) {
      const before = text.slice(e, end);
      const space = Math.max(before.lastIndexOf(" "), before.lastIndexOf("\n"));
      if (space >= 0) end = e + space;
    }
    const last = windows.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else windows.push([start, end]);
  }
  return windows.slice(0, max).map(([start, end]) => {
    const segments: Segment[] = [];
    let at = start;
    for (const [s, e] of matches) {
      if (e <= start || s >= end) continue;
      if (s > at) segments.push({ text: text.slice(at, s), mark: false });
      segments.push({ text: text.slice(Math.max(s, start), e), mark: true });
      at = e;
    }
    if (at < end) segments.push({ text: text.slice(at, end), mark: false });
    const out = segments.map((g) => ({ ...g, text: collapse(g.text) }));
    out[0]!.text = (start > 0 ? "…" : "") + out[0]!.text.trimStart();
    out.at(-1)!.text =
      out.at(-1)!.text.trimEnd() + (end < text.length ? "…" : "");
    return out;
  });
}

/** The start of a page, when it matched only through the Portuguese dictionary. */
export function opening(text: string, length = 320): Excerpt {
  const [first] = excerpts(text, [[0, 0]], { max: 1, radius: length });
  return first ?? [];
}
