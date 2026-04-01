import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { generateOTPEmailTemplate } from "@/lib/email-templates";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRAND_EMAIL_FROM_NAME, BRAND_NAME } from "@/lib/brand";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phoneNumber, university } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingProfile = await prisma.profiles.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingProfile) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        phone_number: phoneNumber ?? null,
        university: university ?? null,
        role: "student",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unable to create user" }, { status: 500 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp_codes.create({
      data: {
        user_id: userId,
        email: normalizedEmail,
        code: otp,
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
      from: `"${BRAND_EMAIL_FROM_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: `Verify your ${BRAND_NAME} account`,
      html: generateOTPEmailTemplate(otp, false),
    });

    return NextResponse.json({
      success: true,
      requiresVerification: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
