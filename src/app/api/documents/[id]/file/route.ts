import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { resolveSafeStoragePath } from "@/lib/storage/documents";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const doc = await prisma.document.findFirst({
    where: { id, userId: actor.userId, archivedAt: null },
  });

  if (!doc) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  let filePath: string;
  try {
    filePath = resolveSafeStoragePath(doc.storageKey);
  } catch {
    return NextResponse.json({ error: "InvalidStorageKey" }, { status: 400 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch {
    return NextResponse.json(
      { error: "FileMissingOnDisk" },
      { status: 404 }
    );
  }

  const downloadMode =
    new URL(req.url).searchParams.get("download") === "1"
      ? "attachment"
      : "inline";

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(fileBuffer.length),
      "Content-Disposition": `${downloadMode}; filename="${encodeURIComponent(doc.originalFilename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
