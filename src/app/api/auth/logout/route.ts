import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function POST() {
  await revokeCurrentSession();
  return NextResponse.json({ status: "logged_out" }, { status: 200 });
}
