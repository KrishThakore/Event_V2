import { NextResponse } from "next/server";
import { getSupabaseStoragePublicUrl } from "@/lib/supabase/config";

function resolveObjectPath(segments: string[]) {
  return segments
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .join("/");
}

export async function GET(
  _request: Request,
  context: { params: { path?: string[] } },
) {
  const objectPath = resolveObjectPath(context.params.path ?? []);
  if (!objectPath) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(getSupabaseStoragePublicUrl(objectPath), {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function HEAD(
  _request: Request,
  context: { params: { path?: string[] } },
) {
  const objectPath = resolveObjectPath(context.params.path ?? []);
  if (!objectPath) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(getSupabaseStoragePublicUrl(objectPath), {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
