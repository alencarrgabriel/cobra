// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataUnavailable, isDataUnavailable } from "./DataUnavailable";

class DataUnavailableError extends Error {
  name = "DataUnavailableError";
}

describe("DataUnavailable", () => {
  it("recognises the error by name", () => {
    expect(isDataUnavailable(new DataUnavailableError("x"))).toBe(true);
    expect(isDataUnavailable(new Error("x"))).toBe(false);
    expect(isDataUnavailable("DataUnavailableError")).toBe(false);
  });

  it("tells the reader the data is unavailable right now", () => {
    const { getByRole } = render(<DataUnavailable />);
    expect(getByRole("status").textContent).toContain(
      "Dados indisponíveis no momento",
    );
  });
});
