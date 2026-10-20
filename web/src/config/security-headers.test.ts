import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function asMap(headers: { key: string; value: string }[]) {
  return new Map(headers.map((h) => [h.key.toLowerCase(), h.value]));
}

describe("securityHeaders", () => {
  const headers = asMap(securityHeaders(false));

  it("forces HTTPS for at least one year", () => {
    const maxAge = Number(
      /max-age=(\d+)/.exec(headers.get("strict-transport-security") ?? "")?.[1],
    );
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it("blocks framing, sniffing and cross-site referrers", () => {
    expect(headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("allows eval only in development", () => {
    expect(contentSecurityPolicy(false)).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy(true)).toContain("unsafe-eval");
  });
});
