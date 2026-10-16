import crypto from "crypto";
import path from "path";

export const ALLOWED_DOCUMENT_TYPES = {
  "application/pdf": { ext: ".pdf", label: "PDF" },
  "image/jpeg": { ext: ".jpg", label: "JPEG" },
  "image/png": { ext: ".png", label: "PNG" },
  "image/webp": { ext: ".webp", label: "WEBP" },
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_DOCUMENT_TYPES;

export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Inspects actual binary magic bytes of a file buffer to detect its real MIME type.
 * Prevents uploading disguised HTML/SVG/executables with a .pdf or .png extension.
 */
export function detectMagicByteMime(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) return null;

  // PDF: "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validates an uploaded file buffer, declared MIME type, filename, and size.
 * Returns sanitized metadata and a randomized UUID storage key.
 */
export function validateAndPrepareDocumentUpload(params: {
  buffer: Buffer;
  originalFilename: string;
  declaredMimeType: string;
  maxBytes?: number;
}): {
  storageKey: string;
  sanitizedOriginalFilename: string;
  verifiedMimeType: AllowedMimeType;
  sizeBytes: number;
  sha256Hash: string;
} {
  const maxBytes =
    params.maxBytes ??
    parseInt(process.env.MAX_UPLOAD_BYTES ?? String(DEFAULT_MAX_UPLOAD_BYTES), 10);

  if (params.buffer.length === 0) {
    throw new Error("Uploaded file is empty");
  }
  if (params.buffer.length > maxBytes) {
    throw new Error(
      `File size (${params.buffer.length} bytes) exceeds limit (${maxBytes} bytes)`
    );
  }

  const detectedMime = detectMagicByteMime(params.buffer);
  if (!detectedMime) {
    throw new Error(
      "Unsupported or invalid file content signature. Allowed: PDF, JPEG, PNG, WEBP."
    );
  }

  if (
    params.declaredMimeType &&
    params.declaredMimeType !== "application/octet-stream" &&
    params.declaredMimeType !== detectedMime
  ) {
    throw new Error(
      `Declared MIME type (${params.declaredMimeType}) does not match file signature (${detectedMime})`
    );
  }

  const ext = ALLOWED_DOCUMENT_TYPES[detectedMime].ext;
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const sanitizedOriginalFilename = path
    .basename(params.originalFilename)
    .replace(/[^\w.\- äöüÄÖÜßçğıöşüÇĞİÖŞÜ]/g, "_")
    .slice(0, 200);

  const sha256Hash = crypto
    .createHash("sha256")
    .update(params.buffer)
    .digest("hex");

  return {
    storageKey,
    sanitizedOriginalFilename: sanitizedOriginalFilename || `document${ext}`,
    verifiedMimeType: detectedMime,
    sizeBytes: params.buffer.length,
    sha256Hash,
  };
}

/**
 * Resolves a storageKey strictly inside the configured private storage directory.
 * Throws if path traversal is attempted.
 */
export function resolveSafeStoragePath(
  storageKey: string,
  baseDir?: string
): string {
  const rootDir = path.resolve(
    baseDir ?? process.env.STORAGE_DIR ?? "./storage/uploads"
  );
  if (!/^[a-f0-9-]+\.(pdf|jpg|png|webp)$/i.test(storageKey)) {
    throw new Error("Invalid storage key format");
  }
  const resolved = path.resolve(rootDir, storageKey);
  if (!resolved.startsWith(rootDir + path.sep)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}
