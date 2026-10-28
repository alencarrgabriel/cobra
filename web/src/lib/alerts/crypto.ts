import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// Encryption of alert subscriptions (change alertas-cadastro, design D1). One secret derives,
// by HKDF-SHA256 with distinct labels, a key that encrypts (AES-256-GCM) and a key that signs
// (HMAC-SHA256). The collector of change resumo-semanal derives the same keys.

export type Keys = { enc: Buffer; mac: Buffer };

export function deriveKeys(secretBase64: string): Keys {
  const secret = Buffer.from(secretBase64, "base64");
  if (secret.length !== 32) throw new Error("ALERTS_SECRET must be 32 bytes");
  const derive = (label: string) =>
    Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), label, 32));
  return {
    enc: derive("cobra-alerts-enc-v1"),
    mac: derive("cobra-alerts-mac-v1"),
  };
}

/** nonce (12 bytes) || ciphertext || tag (16 bytes). */
export function encrypt(keys: Keys, plain: string): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.enc, nonce);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, body, cipher.getAuthTag()]);
}

/** Throws if the data was changed or was encrypted with another key. */
export function decrypt(keys: Keys, data: Uint8Array): string {
  const buf = Buffer.from(data);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keys.enc,
    buf.subarray(0, 12),
  );
  decipher.setAuthTag(buf.subarray(buf.length - 16));
  return Buffer.concat([
    decipher.update(buf.subarray(12, buf.length - 16)),
    decipher.final(),
  ]).toString("utf8");
}

/** Lower case, no spaces: "Ana@Exemplo.org " and "ana@exemplo.org" are the same address. */
export function normalizeEmail(email: string): string {
  return email.replace(/\s+/g, "").toLowerCase();
}

/** Finds a subscription by e-mail without storing the e-mail. */
export function emailLookup(keys: Keys, email: string): Buffer {
  return createHmac("sha256", keys.mac)
    .update(`email:${normalizeEmail(email)}`)
    .digest();
}

/** A link token (base64url) and the SHA-256 that is stored in its place. */
export function newToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token) };
}

export function tokenHash(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/** Permanent unsubscribe token: `<id>.<hmac>`, so it needs no storage (design D1). */
export function unsubscribeToken(keys: Keys, subscriptionId: string): string {
  const mac = createHmac("sha256", keys.mac)
    .update(`sair:${subscriptionId}`)
    .digest("base64url");
  return `${subscriptionId}.${mac}`;
}

/** The subscription id of a valid unsubscribe token, or null. */
export function readUnsubscribeToken(keys: Keys, token: string): string | null {
  const [id, mac] = token.split(".");
  if (!id || !mac || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(unsubscribeToken(keys, id).split(".")[1]!);
  const given = Buffer.from(mac);
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? id
    : null;
}
