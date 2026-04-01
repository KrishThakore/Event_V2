import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/auth";

export async function GET() {
  const session = await getRouteSession();
  return NextResponse.json(session);
}
