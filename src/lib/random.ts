import {
  type RandomReader,
  generateRandomString as generateRandomStringFromCrypto,
} from "@oslojs/crypto/random";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

const random: RandomReader = {
  read(bytes: Uint8Array): void {
    crypto.getRandomValues(bytes);
  },
};

export function generateRandomString(alphabet: string, length: number): string {
  return generateRandomStringFromCrypto(random, alphabet, length);
}

/**
 * Generates a random ID with the specified number of bytes of entropy.
 * The resulting string is base32 encoded (lowercase, no padding).
 *
 * Common sizes and their properties:
 * - 10 bytes = 16 chars, 80 bits entropy (1.2 quadrillion unique IDs)
 * - 15 bytes = 24 chars, 120 bits entropy (1.3 quintillion unique IDs)
 * - 20 bytes = 32 chars, 160 bits entropy (1.5 sextillion unique IDs)
 *
 * @param size - Number of random bytes to generate (entropy size)
 * @returns Base32 encoded random string
 */
export function generateIdFromEntropySize(size: number): string {
  const buffer = crypto.getRandomValues(new Uint8Array(size));
  return encodeBase32LowerCaseNoPadding(buffer);
}
