import { describe, expect, it } from "vitest";

import { cardPath, whatsappUrl, xUrl } from "./share";

describe("share links", () => {
  it("builds the WhatsApp link with the text and the page address", () => {
    expect(whatsappUrl("Obra no Cobra:", "https://x.org/obras/1")).toBe(
      "https://wa.me/?text=Obra%20no%20Cobra%3A%20https%3A%2F%2Fx.org%2Fobras%2F1",
    );
  });

  it("builds the X intent", () => {
    expect(xUrl("Perfil", "https://x.org/p")).toBe(
      "https://x.com/intent/tweet?text=Perfil&url=https%3A%2F%2Fx.org%2Fp",
    );
  });

  it("builds card paths", () => {
    expect(cardPath("obra", "900002.53-02", "feed")).toBe(
      "/cartao/obra/900002.53-02/feed",
    );
  });
});
