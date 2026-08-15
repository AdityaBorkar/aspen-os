import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// SAFETY: node:crypto's scrypt is callback-based; promisify wraps it and the overloaded
// Signature must be narrowed to the (password, salt, keylen) arity used below.
const scryptAsync = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

async function hash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;
}

async function verify(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltB64, keyB64] = storedHash.split(":");
  if (algorithm !== "scrypt" || !saltB64 || !keyB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const storedKey = Buffer.from(keyB64, "base64");
  const derivedKey = await scryptAsync(password, salt, storedKey.length);
  return timingSafeEqual(derivedKey, storedKey);
}

export const password = { hash, verify };
