import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "akata-life",
      timestamp: new Date().toISOString(),
      timezone: "Europe/Berlin",
      hermesAgentApi: process.env.HERMES_AGENT_ENABLED !== "false",
    },
    { status: 200 }
  );
}
