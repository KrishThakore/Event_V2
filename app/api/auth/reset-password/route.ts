import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: "Missing email, OTP, or password" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const profile = await prisma.profiles.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resetToken = await prisma.password_reset_tokens.findFirst({
      where: {
        user_id: profile.id,
        token: String(otp).trim(),
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset code" }, { status: 400 });
    }

    const update = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password,
      email_confirm: true,
    });

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 400 });
    }

    await prisma.password_reset_tokens.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
