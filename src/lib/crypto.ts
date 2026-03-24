/**
 * Cryptographic utilities for client-side password hashing
 */

/**
 * Hashes a password using SHA-256 with a fixed salt
 * This provides an additional layer of security before transmission
 *
 * @param password - The plain text password
 * @returns SHA-256 hash in hexadecimal format
 */
export async function hashPasswordWithSHA256(password: string): Promise<string> {
  // Fixed salt from environment or use a default
  const salt = process.env.NEXT_PUBLIC_PASSWORD_SALT || "infp-cms-fixed-salt-2024";

  // Encode password and salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);

  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Verifies if a string is a valid SHA-256 hash
 * (hex string of 64 characters)
 */
export function isValidSHA256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}
