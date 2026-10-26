// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorksMap } from "./WorksMap";

const pin = (code: string, lon: number, lat: number) => ({
  code,
  name: `Obra ${code}`,
  status: "stopped" as const,
  lat,
  lon,
});

describe("WorksMap", () => {
  it("draws one link per located work in the DF, with name and status", () => {
    const { container } = render(
      <WorksMap
        pins={[pin("1.53-1", -48.1, -15.82), pin("2.53-2", -47.9, -15.8)]}
        withoutLocation={0}
      />,
    );
    const links = container.querySelectorAll("svg a");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/obras/1.53-1");
    expect(links[0].getAttribute("aria-label")).toBe("Obra 1.53-1, Paralisada");
    expect(container.textContent).toContain("Paralisada");
    expect(container.querySelector("[data-testid=sem-localizacao]")).toBeNull();
  });

  it("counts works without location and outside the DF instead of placing them", () => {
    const { getByTestId, container } = render(
      <WorksMap
        pins={[pin("1.53-1", -48.1, -15.82), pin("3.53-3", -46.6, -23.55)]}
        withoutLocation={2}
      />,
    );
    expect(container.querySelectorAll("svg a")).toHaveLength(1);
    expect(getByTestId("sem-localizacao").textContent).toContain(
      "2 obras sem localização não aparecem no mapa",
    );
    expect(getByTestId("fora-do-mapa").textContent).toContain(
      "1 obra tem coordenadas fora do Distrito Federal",
    );
  });
});
