import "server-only";

// Official photo embedded in a card (change compartilhamento, design D4): only the official
// addresses the image proxy accepts, a short time limit, and initials when anything fails.

const ALLOWED: [host: string, path: string][] = [
  ["www.camara.leg.br", "/internet/deputado/bandep/"],
  ["legis.senado.leg.br", "/senadores/fotos-oficiais/"],
  ["www.cl.df.gov.br", "/documents/"],
];

const TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 2_000_000;

export function isOfficialPhoto(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      ALLOWED.some(
        ([host, path]) => u.host === host && u.pathname.startsWith(path),
      )
    );
  } catch {
    return false;
  }
}

/** The photo as a data URL, or null (the card then shows initials). */
export async function photoDataUrl(
  url: string | null,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!url || !isOfficialPhoto(url)) return null;
  try {
    const response = await fetcher(url, {
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    const type = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (!response.ok || !type || !TYPES.has(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
