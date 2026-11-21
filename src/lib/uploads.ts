import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Admin uploads (doc 08): allow-listed types checked by extension, MIME and file signature, ≤ 5 MB,
// random file names, stored in UPLOAD_DIR (outside the app), served read-only by /uploads/[...path].
// Private files (payment proofs, docs/10 V9) go to PRIVATE_DIR instead and are only served to admins.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const KINDS = {
  jpg: { mime: ["image/jpeg"], magic: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: ["image/png"], magic: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { mime: ["image/webp"], magic: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  pdf: { mime: ["application/pdf"], magic: (b: Buffer) => b.toString("ascii", 0, 5) === "%PDF-" },
} as const;
type Kind = keyof typeof KINDS;

/** Validates and stores an uploaded file. Returns its public path (/uploads/<folder>/<random>.<ext>) or an error. */
export const privateDir = () => resolve(/*turbopackIgnore: true*/ process.env.PRIVATE_DIR ?? "./data/private");

export async function saveUpload(
  file: unknown,
  folder: "products" | "coa" | "payment-proofs",
  allowed: Kind[],
): Promise<{ path: string; name: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "The file is larger than 5 MB." };
  const ext = file.name.toLowerCase().split(".").pop() === "jpeg" ? "jpg" : (file.name.toLowerCase().split(".").pop() as Kind);
  if (!allowed.includes(ext)) return { error: `Allowed types: ${allowed.join(", ")}.` };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = KINDS[ext];
  if (!(kind.mime as readonly string[]).includes(file.type) || !kind.magic(buf)) return { error: "The file content does not match its type." };

  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  const root = folder === "payment-proofs" ? privateDir() : resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
  const dir = join(root, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(/*turbopackIgnore: true*/ dir, name), buf, { flag: "wx" });
  return { path: `/uploads/${folder}/${name}`, name };
}
