// If someone ever reads your database, they shouldn’t get working GitHub tokens.
// AES-256-GCM encrypts the data and also detects tampering.
// Each encryption uses a fresh random IV (initialization vector).
import crypto from "node:crypto";
import { env } from "../config/env.js";

export function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", env.encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(":");
}

export function decrypt(payload) {
  const [iv, tag, encrypted] = payload.split(":").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", env.encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}