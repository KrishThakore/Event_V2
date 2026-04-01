import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const otpRecord = await prisma.otp_codes.findFirst({
      where: {
        email: normalizedEmail,
        code: String(code).trim(),
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP code" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.otp_codes.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
    });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(otpRecord.user_id, {
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
