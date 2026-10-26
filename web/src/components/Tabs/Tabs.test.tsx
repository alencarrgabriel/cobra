// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tabs } from "./Tabs";

const tabs = [
  { id: "votos", label: "Como votou", content: <p>votos</p> },
  { id: "projetos", label: "Projetos", content: <p>projetos</p> },
  {
    id: "obras",
    label: "Emendas e obras",
    badge: "fase 2",
    content: <p>obras</p>,
  },
];

describe("Tabs", () => {
  it("shows the first panel and marks the tab as selected", () => {
    render(<Tabs label="Seções do perfil" tabs={tabs} />);
    expect(
      screen
        .getByRole("tab", { name: "Como votou" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("votos");
  });

  it("moves with the arrow keys and wraps around", () => {
    render(<Tabs label="Seções do perfil" tabs={tabs} />);
    const first = screen.getByRole("tab", { name: "Como votou" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Projetos");
    expect(screen.getByRole("tabpanel").textContent).toBe("projetos");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement?.textContent).toBe("Emendas e obrasfase 2");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(
      screen.getByRole("tab", { name: "Como votou" }).getAttribute("tabindex"),
    ).toBe("0");
  });
});
