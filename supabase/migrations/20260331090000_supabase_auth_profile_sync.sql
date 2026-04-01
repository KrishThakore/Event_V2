create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_id_fkey'
  ) then
    alter table public.profiles drop constraint profiles_id_fkey;
  end if;
end $$;

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
