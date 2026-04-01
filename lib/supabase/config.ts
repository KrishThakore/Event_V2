const missing = (key: string) => {
  throw new Error(`${key} is not configured`);
};

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missing("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? missing("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSupabaseStorageBucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
    ?? process.env.SUPABASE_STORAGE_BUCKET
    ?? missing("SUPABASE_STORAGE_BUCKET");
}

export function getSupabaseStoragePublicUrl(objectPath: string) {
  const normalizedPath = objectPath.replace(/^\/+/, "");
  return `${getSupabaseUrl()}/storage/v1/object/public/${getSupabaseStorageBucket()}/${normalizedPath}`;
}
