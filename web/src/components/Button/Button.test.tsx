// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "../Card/Card";
import { FilterChip } from "../FilterChip/FilterChip";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a button by default", () => {
    render(<Button variant="primary">Ver meus representantes</Button>);
    const button = screen.getByRole("button", {
      name: "Ver meus representantes",
    });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("renders a link when given href", () => {
    render(<Button href="https://wa.me/">Enviar no WhatsApp</Button>);
    expect(
      screen
        .getByRole("link", { name: "Enviar no WhatsApp" })
        .getAttribute("href"),
    ).toBe("https://wa.me/");
  });
});

describe("FilterChip", () => {
  it("exposes the selected state", () => {
    render(
      <div role="group" aria-label="Situação">
        <FilterChip selected>Todas</FilterChip>
        <FilterChip selected={false}>Paralisadas</FilterChip>
      </div>,
    );
    expect(
      screen
        .getByRole("button", { name: "Todas" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Paralisadas" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("Card", () => {
  it("renders as a section with its content", () => {
    render(<Card aria-label="Resumo">Conteúdo</Card>);
    expect(screen.getByRole("region", { name: "Resumo" }).textContent).toBe(
      "Conteúdo",
    );
  });
});
