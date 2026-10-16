import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret, verifyPassword } from "@/lib/auth/crypto";
import { createSession } from "@/lib/auth/session";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", message: "Ungültige Anmeldedaten." },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const rateLimitKey = `${ip}:${normalizedEmail}`;
  const limit = checkLoginRateLimit(rateLimitKey);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "RateLimited",
        message: `Zu viele Anmeldeversuche. Bitte warten Sie ${limit.retryAfterSeconds} Sekunden.`,
      },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    await prisma.auditEvent
      .create({
        data: {
          actorType: "USER",
          actorLabel: normalizedEmail,
          action: "LOGIN_FAILED",
          ipAddress: ip,
          userId: user?.id ?? null,
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        error: "InvalidCredentials",
        message: "E-Mail oder Passwort ist ungültig.",
      },
      { status: 401 }
    );
  }

  if (user.totpEnabled && user.totpSecretEncrypted) {
    if (!parsed.data.totpCode) {
      return NextResponse.json(
        {
          error: "MfaRequired",
          mfaRequired: true,
          message: "Bitte geben Sie Ihren 6-stelligen 2FA-Code ein.",
        },
        { status: 401 }
      );
    }

    const secret = decryptSecret(user.totpSecretEncrypted);
    const totp = new OTPAuth.TOTP({
      issuer: "Akata Life",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: parsed.data.totpCode, window: 1 });
    if (delta === null) {
      return NextResponse.json(
        { error: "InvalidMfaCode", message: "Ungültiger 2FA-Code." },
        { status: 401 }
      );
    }
  }

  resetLoginRateLimit(rateLimitKey);

  await createSession({
    userId: user.id,
    ipAddress: ip,
    userAgent: req.headers.get("user-agent"),
    mfaVerified: true,
  });

  await prisma.auditEvent.create({
    data: {
      actorType: "USER",
      actorLabel: user.email,
      action: "LOGIN_SUCCESS",
      ipAddress: ip,
      userId: user.id,
    },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
