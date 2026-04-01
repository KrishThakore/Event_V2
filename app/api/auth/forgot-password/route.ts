import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetOTP } from "@/lib/email-templates";
import { BRAND_EMAIL_FROM_NAME, BRAND_NAME } from "@/lib/brand";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const profile = await prisma.profiles.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ success: true });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.password_reset_tokens.create({
      data: {
        user_id: profile.id,
        token: otp,
        expires_at: expiresAt,
      },
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${BRAND_EMAIL_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: `Reset your ${BRAND_NAME} password`,
      html: generatePasswordResetOTP(otp),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
