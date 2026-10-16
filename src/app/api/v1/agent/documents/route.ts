import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import {
  resolveSafeStoragePath,
  validateAndPrepareDocumentUpload,
} from "@/lib/storage/documents";
import { formatEurCents, parseEurToCents } from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const contractId = searchParams.get("contractId") ?? undefined;
  const q = searchParams.get("q")?.trim();

  const documents = await prisma.document.findMany({
    where: {
      userId: actor.userId,
      archivedAt: null,
      ...(category ? { category: category as never } : {}),
      ...(contractId ? { contractId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { originalFilename: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      contract: { select: { id: true, provider: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      ...d,
      amountFormattedDe:
        d.amountCents !== null ? formatEurCents(d.amountCents, "de") : null,
      issueDateFormattedDe: formatDateDe(d.issueDate),
      dueDateFormattedDe: formatDateDe(d.dueDate),
      createdAtFormattedDe: formatDateDe(d.createdAt),
      downloadUrl: `/api/documents/${d.id}/file`,
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let buffer: Buffer;
  let originalFilename = "document.pdf";
  let declaredMimeType = "application/pdf";
  let title = "";
  let category = "OTHER";
  let contractId: string | null = null;
  let issueDate: Date | null = null;
  let dueDate: Date | null = null;
  let amountCents: number | null = null;
  let notes: string | null = null;
  let tags: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "ValidationError", message: "Missing file in form data." },
        { status: 400 }
      );
    }
    buffer = Buffer.from(await file.arrayBuffer());
    originalFilename = file.name;
    declaredMimeType = file.type;
    title = String(form.get("title") || file.name);
    category = String(form.get("category") || "OTHER");
    contractId = form.get("contractId") ? String(form.get("contractId")) : null;
    if (form.get("issueDate")) issueDate = new Date(String(form.get("issueDate")));
    if (form.get("dueDate")) dueDate = new Date(String(form.get("dueDate")));
    if (form.get("amountEur")) {
      amountCents = parseEurToCents(String(form.get("amountEur")));
    }
    notes = form.get("notes") ? String(form.get("notes")) : null;
  } else {
    // JSON payload (ideal for Hermes Agent base64 upload)
    const body = await req.json().catch(() => null);
    if (!body || !body.fileBase64) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message:
            "Provide multipart/form-data with 'file' or JSON with 'fileBase64'.",
        },
        { status: 400 }
      );
    }
    buffer = Buffer.from(String(body.fileBase64), "base64");
    originalFilename = String(body.originalFilename || "document.pdf");
    declaredMimeType = String(body.mimeType || "application/pdf");
    title = String(body.title || originalFilename);
    category = String(body.category || "OTHER");
    contractId = body.contractId ? String(body.contractId) : null;
    if (body.issueDate) issueDate = new Date(String(body.issueDate));
    if (body.dueDate) dueDate = new Date(String(body.dueDate));
    if (typeof body.amountCents === "number") {
      amountCents = body.amountCents;
    } else if (body.amountEur !== undefined) {
      amountCents = parseEurToCents(body.amountEur);
    }
    notes = body.notes ? String(body.notes) : null;
    if (Array.isArray(body.tags)) {
      tags = body.tags.map(String);
    }
  }

  let prepared;
  try {
    prepared = validateAndPrepareDocumentUpload({
      buffer,
      originalFilename,
      declaredMimeType,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "InvalidDocumentFile",
        message: err instanceof Error ? err.message : "File validation failed",
      },
      { status: 400 }
    );
  }

  const targetPath = resolveSafeStoragePath(prepared.storageKey);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer, { mode: 0o600 });

  const document = await prisma.document.create({
    data: {
      title: title.trim() || prepared.sanitizedOriginalFilename,
      originalFilename: prepared.sanitizedOriginalFilename,
      storageKey: prepared.storageKey,
      category: category as never,
      mimeType: prepared.verifiedMimeType,
      sizeBytes: prepared.sizeBytes,
      sha256Hash: prepared.sha256Hash,
      issueDate,
      dueDate,
      amountCents,
      tags,
      notes,
      contractId,
      userId: actor.userId,
    },
  });

  await recordAuditEvent({
    actor,
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      title: document.title,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      sha256Hash: document.sha256Hash,
    },
  });

  return NextResponse.json(
    {
      document: {
        ...document,
        downloadUrl: `/api/documents/${document.id}/file`,
      },
    },
    { status: 201 }
  );
}
