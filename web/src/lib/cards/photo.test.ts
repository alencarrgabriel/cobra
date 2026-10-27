import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { isOfficialPhoto, photoDataUrl } = await import("./photo");

describe("official photo", () => {
  it("accepts only official addresses", () => {
    expect(
      isOfficialPhoto(
        "https://legis.senado.leg.br/senadores/fotos-oficiais/5953",
      ),
    ).toBe(true);
    expect(
      isOfficialPhoto("https://example.com/senadores/fotos-oficiais/1"),
    ).toBe(false);
    expect(
      isOfficialPhoto(
        "http://www.camara.leg.br/internet/deputado/bandep/1.jpg",
      ),
    ).toBe(false);
  });

  it("embeds a JPEG and falls back to initials on failure", async () => {
    const ok = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/jpeg" },
        }),
    );
    expect(
      await photoDataUrl(
        "https://www.camara.leg.br/internet/deputado/bandep/1.jpg",
        ok,
      ),
    ).toBe("data:image/jpeg;base64,AQID");
    const html = vi.fn(
      async () =>
        new Response("<html>", { headers: { "content-type": "text/html" } }),
    );
    expect(
      await photoDataUrl(
        "https://www.camara.leg.br/internet/deputado/bandep/1.jpg",
        html,
      ),
    ).toBeNull();
    const down = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect(
      await photoDataUrl(
        "https://www.camara.leg.br/internet/deputado/bandep/1.jpg",
        down,
      ),
    ).toBeNull();
  });
});
