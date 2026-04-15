export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  bin: "application/octet-stream",
};

/**
 * GET /api/uploads/[...path] — Serve uploaded files from /tmp/uploads (production fallback)
 * In production (Docker/Cloud Run), the public/ directory is read-only.
 * Files uploaded via the local fallback are stored in /tmp/uploads.
 */
export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = join("/tmp/uploads", ...params.path);

  // Security: prevent path traversal
  if (!filePath.startsWith("/tmp/uploads/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() || "bin";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
