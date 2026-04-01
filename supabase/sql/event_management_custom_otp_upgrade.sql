-- Run this after the main setup SQL if you want custom SMTP OTP mails
-- instead of Supabase magic-link / built-in auth emails.

begin;

create extension if not exists pgcrypto;

create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_codes_email_code on public.otp_codes(email, code);
create index if not exists idx_otp_codes_expires_at on public.otp_codes(expires_at);
create index if not exists idx_otp_codes_user_id on public.otp_codes(user_id);

create index if not exists idx_password_reset_tokens_token on public.password_reset_tokens(token);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);

commit;
