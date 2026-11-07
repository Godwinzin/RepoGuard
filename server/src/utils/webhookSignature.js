import crypto from "node:crypto";

export function verifySignature(secret, rawBody, header) {
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");

  // timingSafeEqual needs equal lengths, and avoids leaking information
  // through how long the comparison takes
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}