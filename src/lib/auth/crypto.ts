import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * Hashes a plaintext password using memory-hard scrypt with a 128-bit random salt.
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })
    .toString("hex");

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored hash in constant time.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
      return false;
    }
    const N = parseInt(parts[1] ?? "16384", 10);
    const r = parseInt(parts[2] ?? "8", 10);
    const p = parseInt(parts[3] ?? "1", 10);
    const salt = parts[4] ?? "";
    const expectedHex = parts[5] ?? "";

    const derived = crypto.scryptSync(
      password.normalize("NFKC"),
      salt,
      SCRYPT_KEYLEN,
      { N, r, p }
    );
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (derived.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Computes SHA-256 hex digest of a session token or Hermes Agent API key.
 */
export function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Constant-time string comparison for bearer API keys.
 */
export function constantTimeEqualStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

/**
 * Generates a cryptographically random 256-bit hex token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Encrypts sensitive application secrets (TOTP secret, Home Assistant token) with AES-256-GCM.
 */
export function encryptSecret(plaintext: string, hexKey?: string): string {
  const rawKey = hexKey ?? process.env.ENCRYPTION_KEY ?? "";
  const keyBuf = crypto.createHash("sha256").update(rawKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts AES-256-GCM ciphertext back to plaintext.
 */
export function decryptSecret(ciphertext: string, hexKey?: string): string {
  const rawKey = hexKey ?? process.env.ENCRYPTION_KEY ?? "";
  const keyBuf = crypto.createHash("sha256").update(rawKey).digest();
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret format");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyBuf,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
