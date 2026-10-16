import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSecureToken, sha256Hex } from "./crypto";
import { authenticateHermesAgent, AuthenticatedActor } from "./agent-auth";

export const SESSION_COOKIE_NAME = "akatalife_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function createSession(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  mfaVerified?: boolean;
}) {
  const rawToken = generateSecureToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId: params.userId,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      mfaVerified: params.mfaVerified ?? false,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { rawToken, expiresAt };
}

export async function getCurrentSessionUser() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) return null;

    const tokenHash = sha256Hex(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const tokenHash = sha256Hex(rawToken);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Authenticates either a Hermes Agent API request (Bearer key) OR an active Owner browser session.
 */
export async function authenticateRequestActor(
  req: NextRequest | Request
): Promise<AuthenticatedActor | null> {
  const hermesActor = await authenticateHermesAgent(req);
  if (hermesActor) {
    return hermesActor;
  }

  const user = await getCurrentSessionUser();
  if (user) {
    return {
      actorType: "USER",
      actorLabel: user.email,
      userId: user.id,
      scopes: ["*"],
    };
  }

  return null;
}
