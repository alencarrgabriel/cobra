// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RepresentativeCard } from "./RepresentativeCard";

const tags = (el: Element): string =>
  [el.tagName, el.className, ...[...el.children].map(tags)].join("|");

describe("RepresentativeCard", () => {
  it("has the same structure for politicians of different parties", () => {
    render(
      <>
        <RepresentativeCard
          name="Ana Exemplo"
          party={{ acronym: "AAA", color: "#c8102e" }}
          uf="DF"
        />
        <RepresentativeCard
          name="Bruno Exemplo"
          party={{ acronym: "BBBBBBBB", color: "#ffd400" }}
          uf="DF"
        />
      </>,
    );
    const [a, b] = screen.getAllByRole("button");
    expect(tags(a!)).toBe(tags(b!));
  });

  it("is a link when it has a profile address", () => {
    render(
      <RepresentativeCard
        name="Ana Exemplo"
        party={{ acronym: "AAA", color: "#c8102e" }}
        uf="DF"
        href="/perfil/ana"
      />,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/perfil/ana");
  });

  it("describes the missing photo", () => {
    render(
      <RepresentativeCard
        name="Ana Exemplo"
        party={{ acronym: "AAA", color: "#c8102e" }}
        uf="DF"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Sem foto disponível de Ana Exemplo" }),
    ).toBeTruthy();
  });
});
