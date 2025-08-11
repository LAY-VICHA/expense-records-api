import { encodeHexLowerCase } from "@oslojs/encoding";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { generateRandomString } from "./random";

const scryptAsync = promisify<
  string,
  string,
  number,
  typeof SCRYPT_PARAMS,
  Buffer
>(scrypt);

const SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost parameter
  r: 16, // Block size parameter
  p: 1, // Parallelization parameter
  maxmem: 64 * 1024 * 1024,
} as const;

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const CHARS = "0123456789";
const VERSION = "v1";

export async function generateScryptHash(input: string): Promise<string> {
  const salt = generateRandomString(CHARS, SALT_LENGTH);
  const derivedKey = await scryptAsync(input, salt, KEY_LENGTH, SCRYPT_PARAMS);
  const hash = `${VERSION}:${salt}:${encodeHexLowerCase(derivedKey)}`;
  return hash;
}

export async function verifyScryptHash(
  input: string,
  hashedInput: string
): Promise<boolean> {
  const [version, salt, hash] = hashedInput.split(":");
  if (version !== VERSION) {
    throw new Error(`Invalid hash version: ${version}. Input: ${hashedInput}`);
  }
  const derivedKey = await scryptAsync(input, salt, KEY_LENGTH, SCRYPT_PARAMS);
  const result = timingSafeEqual(
    Buffer.from(encodeHexLowerCase(derivedKey), "hex"),
    Buffer.from(hash, "hex")
  );
  return result;
}
