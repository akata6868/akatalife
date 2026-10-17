import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  generateSecureToken,
  hashPassword,
  sha256Hex,
} from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import { ensureDefaultCategoriesForUser } from "@/lib/finance/default-categories";

const SetupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        {
          error: "SetupAlreadyCompleted",
          message:
            "Initial owner setup has already been completed. Public registration is disabled.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = SetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "ValidationError",
          message: "Bitte prüfen Sie Name, E-Mail und Passwort (mind. 10 Zeichen).",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash,
        role: "OWNER",
        locale: "de",
        theme: "system",
        totpEnabled: false,
      },
    });

    await ensureDefaultCategoriesForUser(user.id);

    // Create initial Hermes Agent API key in DB
    const rawHermesKey = `akata_hermes_${generateSecureToken(24)}`;
    await prisma.agentApiKey.create({
      data: {
        name: "Hermes Agent Primary Key",
        keyPrefix: rawHermesKey.slice(0, 18),
        keyHash: sha256Hex(rawHermesKey),
        scopes: ["*"],
        active: true,
        userId: user.id,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorType: "USER",
        actorLabel: user.email,
        action: "OWNER_SETUP_COMPLETED",
        entityType: "User",
        entityId: user.id,
        userId: user.id,
      },
    });

    await createSession({
      userId: user.id,
      ipAddress: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
      mfaVerified: true,
    });

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        hermesAgentApiKey: rawHermesKey,
        note: "Save hermesAgentApiKey now. It is hashed with SHA-256 in the database and will not be shown in plaintext again.",
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "SetupFailed",
        message:
          err instanceof Error ? err.message : "Owner-Setup fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
