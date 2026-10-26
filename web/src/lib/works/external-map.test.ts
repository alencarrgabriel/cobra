import { describe, expect, it } from "vitest";

import { googleMapsLinks } from "./external-map";

describe("googleMapsLinks", () => {
  const links = googleMapsLinks(-15.83, -48.13);

  it("uses the official Maps URLs with api=1 and an encoded comma", () => {
    expect(links).toEqual({
      view: "https://www.google.com/maps/search/?api=1&query=-15.83%2C-48.13",
      directions:
        "https://www.google.com/maps/dir/?api=1&destination=-15.83%2C-48.13",
      streetView:
        "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-15.83%2C-48.13",
    });
  });

  it("puts latitude before longitude", () => {
    const query = new URL(links.view).searchParams.get("query");
    expect(query).toBe("-15.83,-48.13");
  });

  it("keeps the full precision of the source", () => {
    expect(googleMapsLinks(-15.835102, -48.130978).view).toContain(
      "-15.835102%2C-48.130978",
    );
  });
});
