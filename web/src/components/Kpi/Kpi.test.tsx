// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kpi } from "./Kpi";

describe("Kpi", () => {
  it("shows the house median on the same bar as the presence", () => {
    const { container } = render(
      <Kpi
        value="92"
        unit="%"
        label="presença nas votações do plenário"
        share={0.92}
        reference={{ label: "mediana da casa: 81%", position: 0.81 }}
        source="Câmara dos Deputados"
      />,
    );
    expect(screen.getByTestId("reference-mark").style.left).toBe("81%");
    expect(container.textContent).toContain("mediana da casa: 81%");
    expect(container.textContent).toContain("Fonte: Câmara dos Deputados");
  });

  it("adds no judgment words of its own", () => {
    const { container } = render(
      <Kpi
        value="R$ 230 mil"
        label="gastos da cota em 2026"
        share={0.5}
        reference={{ label: "50% do limite anual" }}
        source="Câmara dos Deputados"
      />,
    );
    expect(container.textContent).not.toMatch(
      /\b(bom|ruim|alto|baixo|excelente|péssimo)\b/i,
    );
  });
});
