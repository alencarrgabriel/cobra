import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  decrypt,
  deriveKeys,
  emailLookup,
  encrypt,
  newToken,
  readUnsubscribeToken,
  tokenHash,
  unsubscribeToken,
} from "./crypto";

const keys = deriveKeys(randomBytes(32).toString("base64"));
const other = deriveKeys(randomBytes(32).toString("base64"));
const ID = "0b7c2f0e-8a51-4a9e-9d6f-0e2a1c3b4d5e";

describe("alert encryption", () => {
  it("round-trips and uses a new nonce each time", () => {
    const a = encrypt(keys, "ana@exemplo.org");
    expect(decrypt(keys, a)).toBe("ana@exemplo.org");
    expect(encrypt(keys, "ana@exemplo.org").equals(a)).toBe(false);
  });

  it("rejects changed data and another key", () => {
    const data = encrypt(keys, '{"place":"53"}');
    data[14] = data[14]! ^ 1;
    expect(() => decrypt(keys, data)).toThrow();
    expect(() => decrypt(other, encrypt(keys, "x"))).toThrow();
  });

  it("finds the same address regardless of case and spaces", () => {
    expect(emailLookup(keys, " Ana@Exemplo.ORG ")).toEqual(
      emailLookup(keys, "ana@exemplo.org"),
    );
    expect(emailLookup(keys, "ana@exemplo.org")).not.toEqual(
      emailLookup(other, "ana@exemplo.org"),
    );
  });

  it("stores only the hash of a token", () => {
    const { token, hash } = newToken();
    expect(tokenHash(token)).toEqual(hash);
    expect(token).toMatch(/^[\w-]{43}$/);
  });

  it("accepts only a genuine unsubscribe token", () => {
    const token = unsubscribeToken(keys, ID);
    expect(readUnsubscribeToken(keys, token)).toBe(ID);
    expect(readUnsubscribeToken(other, token)).toBeNull();
    expect(readUnsubscribeToken(keys, `${ID}.x${token.slice(38)}`)).toBeNull();
    expect(readUnsubscribeToken(keys, "lixo")).toBeNull();
  });
});
