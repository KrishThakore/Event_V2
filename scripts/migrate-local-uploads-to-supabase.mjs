import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";
import { createClient } from "@supabase/supabase-js";

const uploadsRoot = join(process.cwd(), "public", "uploads");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET;

if (!supabaseUrl || !serviceRoleKey || !bucket) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolute));
      continue;
    }

    files.push(absolute);
  }

  return files;
}

const files = await walk(uploadsRoot);
for (const file of files) {
  const fileStat = await stat(file);
  if (!fileStat.isFile()) {
    continue;
  }

  const objectPath = relative(uploadsRoot, file).replace(/\\/g, "/");
  const { error } = await supabase.storage.from(bucket).upload(objectPath, await readFile(file), {
    upsert: false,
    cacheControl: "31536000",
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  console.log(`Uploaded ${objectPath}`);
}
