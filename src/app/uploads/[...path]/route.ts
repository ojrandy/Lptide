import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

// Serves admin-managed files (product images, COAs) from UPLOAD_DIR, outside the build output (doc 08).
// Read-only, allow-listed extensions, no directory listing, path traversal rejected.
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path } = await ctx.params;
  const root = resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
  const file = resolve(root, ...path);
  const type = TYPES[extname(file).toLowerCase()];
  if (!type || !file.startsWith(root + sep)) return new Response("Not found", { status: 404 });

  try {
    if (!(await stat(file)).isFile()) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "Content-Type": type,
        // Uploaded files get random names, so a URL never changes content.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(type === "application/pdf" ? { "Content-Disposition": "inline" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
