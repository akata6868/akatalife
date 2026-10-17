import { NextResponse } from "next/server";
import { getCurrentSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const userCount = await prisma.user.count().catch(() => 0);
  const user = await getCurrentSessionUser();

  if (!user) {
    const cookieStore = await cookies();
    if (cookieStore.get(SESSION_COOKIE_NAME)) {
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
    return NextResponse.json(
      { authenticated: false, hasOwner: userCount > 0 },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      hasOwner: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200 }
  );
}
