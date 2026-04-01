-- Event Management: Supabase one-time setup
-- Run this whole file in the Supabase SQL Editor.
-- It is written to be idempotent, so re-running it is safe.

begin;

create extension if not exists pgcrypto;

-- =========================
-- Core tables
-- =========================

create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null,
  email text unique,
  phone_number text,
  university text,
  role text not null default 'student',
  disabled boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer not null,
  is_unlimited boolean default false,
  show_capacity boolean default true,
  is_registration_open boolean default true,
  price numeric(10,2) default 0,
  is_paid boolean,
  pricing_type text default 'free',
  pricing_dropdown_label text,
  event_type text default 'free',
  pricing_tiers jsonb default '[]'::jsonb,
  image_url text,
  visibility text default 'public',
  status text default 'draft',
  currency text default 'INR',
  qfix_link text,
  use_custom_qfix_link boolean default false,
  use_dual_region_pricing boolean default false,
  dual_region_label text default 'Where are you from?',
  region_labels jsonb default '[]'::jsonb,
  price_inr numeric(10,2),
  price_usd numeric(10,2),
  created_by uuid,
  assigned_organizer uuid,
  created_at timestamptz default now()
);

create table if not exists public.event_form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  label text not null,
  field_type text not null,
  required boolean default false,
  options jsonb,
  disabled boolean default false,
  disabled_by uuid,
  disabled_at timestamptz,
  overridden_by uuid,
  overridden_at timestamptz,
  original_required boolean,
  condition jsonb default 'null'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.event_pricing_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  label text not null,
  price numeric(10,2) not null,
  currency text default 'INR',
  price_inr numeric(10,2),
  price_usd numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  user_id uuid,
  status text not null,
  entry_code text unique,
  pricing_type text default 'free',
  pricing_option_id uuid,
  paid_amount numeric(10,2) default 0,
  currency text default 'INR',
  payment_method text default 'razorpay',
  payment_proof_url text,
  verification_status text,
  rejection_reason text,
  verified_by uuid,
  verified_at timestamptz,
  phone_number text,
  university text,
  created_at timestamptz default now(),
  constraint registrations_event_user_unique unique (event_id, user_id)
);

create table if not exists public.registration_responses (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid,
  field_id uuid,
  value text
);

create table if not exists public.registration_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null,
  tier_id text not null,
  tier_name text not null,
  tier_price numeric(10,2) not null,
  payment_id text,
  order_id text,
  amount integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric(10,2) not null,
  status text not null,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique not null,
  scanned_by_id uuid,
  scanned_by_role text,
  checked_in_at timestamptz default now()
);

create table if not exists public.event_scanner_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  scanner_id uuid not null,
  assigned_by uuid,
  created_at timestamptz default now(),
  constraint event_scanner_assignments_event_scanner_unique unique (event_id, scanner_id)
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists public.organizer_logs (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists public.event_emails (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  sent_by text not null,
  sender_role text not null,
  subject text not null,
  body_html text not null,
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.razorpay_sync_hub_records (
  id uuid primary key default gen_random_uuid(),
  razorpay_payment_id text not null unique,
  razorpay_order_id text,
  razorpay_signature text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status text not null,
  method text,
  description text,
  email text,
  contact text,
  notes jsonb,
  fee numeric(10,2),
  tax numeric(10,2),
  error_code text,
  error_description text,
  acquirer_data jsonb,
  vpa text,
  card_id text,
  bank text,
  wallet text,
  razorpay_created_at timestamptz not null,
  synced_at timestamptz not null default now(),
  raw_response jsonb not null,
  registration_id uuid,
  event_id uuid,
  user_id uuid,
  reconciled boolean not null default false,
  reconciled_at timestamptz
);

-- =========================
-- Foreign keys
-- =========================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_created_by_fkey') then
    alter table public.events add constraint events_created_by_fkey
      foreign key (created_by) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_assigned_organizer_fkey') then
    alter table public.events add constraint events_assigned_organizer_fkey
      foreign key (assigned_organizer) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_form_fields_event_id_fkey') then
    alter table public.event_form_fields add constraint event_form_fields_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_form_fields_disabled_by_fkey') then
    alter table public.event_form_fields add constraint event_form_fields_disabled_by_fkey
      foreign key (disabled_by) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_form_fields_overridden_by_fkey') then
    alter table public.event_form_fields add constraint event_form_fields_overridden_by_fkey
      foreign key (overridden_by) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_pricing_options_event_id_fkey') then
    alter table public.event_pricing_options add constraint event_pricing_options_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registrations_event_id_fkey') then
    alter table public.registrations add constraint registrations_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registrations_user_id_fkey') then
    alter table public.registrations add constraint registrations_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registrations_pricing_option_id_fkey') then
    alter table public.registrations add constraint registrations_pricing_option_id_fkey
      foreign key (pricing_option_id) references public.event_pricing_options(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registration_responses_registration_id_fkey') then
    alter table public.registration_responses add constraint registration_responses_registration_id_fkey
      foreign key (registration_id) references public.registrations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registration_responses_field_id_fkey') then
    alter table public.registration_responses add constraint registration_responses_field_id_fkey
      foreign key (field_id) references public.event_form_fields(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registration_pricing_tiers_registration_id_fkey') then
    alter table public.registration_pricing_tiers add constraint registration_pricing_tiers_registration_id_fkey
      foreign key (registration_id) references public.registrations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_registration_id_fkey') then
    alter table public.payments add constraint payments_registration_id_fkey
      foreign key (registration_id) references public.registrations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_registration_id_fkey') then
    alter table public.attendance add constraint attendance_registration_id_fkey
      foreign key (registration_id) references public.registrations(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_scanned_by_id_fkey') then
    alter table public.attendance add constraint attendance_scanned_by_id_fkey
      foreign key (scanned_by_id) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_scanner_assignments_event_id_fkey') then
    alter table public.event_scanner_assignments add constraint event_scanner_assignments_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_scanner_assignments_scanner_id_fkey') then
    alter table public.event_scanner_assignments add constraint event_scanner_assignments_scanner_id_fkey
      foreign key (scanner_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_scanner_assignments_assigned_by_fkey') then
    alter table public.event_scanner_assignments add constraint event_scanner_assignments_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'admin_logs_admin_id_fkey') then
    alter table public.admin_logs add constraint admin_logs_admin_id_fkey
      foreign key (admin_id) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'organizer_logs_organizer_id_fkey') then
    alter table public.organizer_logs add constraint organizer_logs_organizer_id_fkey
      foreign key (organizer_id) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'event_emails_event_id_fkey') then
    alter table public.event_emails add constraint event_emails_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;
end $$;

-- =========================
-- Indexes
-- =========================

create index if not exists idx_events_event_date on public.events(event_date);
create index if not exists idx_events_assigned_organizer on public.events(assigned_organizer);
create index if not exists idx_events_visibility on public.events(visibility);
create index if not exists idx_events_event_type on public.events(event_type);

create index if not exists idx_event_pricing_options_event_id on public.event_pricing_options(event_id);
create index if not exists idx_event_pricing_options_price on public.event_pricing_options(price);

create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_status on public.registrations(status);
create index if not exists idx_registrations_entry_code on public.registrations(entry_code);
create index if not exists idx_registrations_verification_status on public.registrations(verification_status);

create index if not exists idx_registration_pricing_tiers_registration_id on public.registration_pricing_tiers(registration_id);
create index if not exists idx_registration_pricing_tiers_payment_id on public.registration_pricing_tiers(payment_id);

create index if not exists idx_payments_status on public.payments(status);

create index if not exists idx_event_scanner_assignments_scanner_id on public.event_scanner_assignments(scanner_id);
create index if not exists idx_event_scanner_assignments_event_id on public.event_scanner_assignments(event_id);

create index if not exists idx_organizer_logs_organizer_id on public.organizer_logs(organizer_id);
create index if not exists idx_organizer_logs_created_at on public.organizer_logs(created_at);

create index if not exists idx_event_emails_event_id on public.event_emails(event_id);
create index if not exists idx_event_emails_sent_by on public.event_emails(sent_by);
create index if not exists idx_event_emails_sent_at on public.event_emails(sent_at);

create index if not exists idx_razorpay_sync_payment_id on public.razorpay_sync_hub_records(razorpay_payment_id);
create index if not exists idx_razorpay_sync_order_id on public.razorpay_sync_hub_records(razorpay_order_id);
create index if not exists idx_razorpay_sync_registration_id on public.razorpay_sync_hub_records(registration_id);
create index if not exists idx_razorpay_sync_event_id on public.razorpay_sync_hub_records(event_id);

-- =========================
-- Auth -> profiles sync
-- =========================

create or replace function public.handle_auth_user_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone_number,
    university,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    nullif(new.raw_user_meta_data ->> 'university', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'student')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
    university = coalesce(excluded.university, public.profiles.university),
    role = coalesce(excluded.role, public.profiles.role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_upsert on auth.users;

create trigger on_auth_user_upsert
after insert or update on auth.users
for each row
execute function public.handle_auth_user_upsert();

insert into public.profiles (
  id,
  full_name,
  email,
  phone_number,
  university,
  role
)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  au.email,
  nullif(au.raw_user_meta_data ->> 'phone_number', ''),
  nullif(au.raw_user_meta_data ->> 'university', ''),
  coalesce(nullif(au.raw_user_meta_data ->> 'role', ''), 'student')
from auth.users au
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
  university = coalesce(excluded.university, public.profiles.university),
  role = coalesce(excluded.role, public.profiles.role);

-- =========================
-- Storage bucket for public asset URLs
-- =========================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-assets',
  'event-assets',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can view event assets'
  ) then
    create policy "Public can view event assets"
    on storage.objects
    for select
    using (bucket_id = 'event-assets');
  end if;
end $$;

commit;
