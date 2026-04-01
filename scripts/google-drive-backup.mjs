import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { mkdir, rm, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { spawn } from 'child_process';
import { loadEnvFile } from 'node:process';

for (const envFileName of ['.env', '.env.local']) {
  const envFilePath = resolve(process.cwd(), envFileName);
  try {
    loadEnvFile(envFilePath);
  } catch {
    // Ignore missing env files so the script can still rely on process env in production.
  }
}

const prisma = new PrismaClient();

const ROOT_FOLDER_NAME = 'event-management-backups';
const BACKUP_DIR = resolve(process.cwd(), 'tmp', 'backups');
const SETTING_KEYS = {
  enabled: 'backup_google_drive_enabled',
  intervalMinutes: 'backup_google_drive_interval_minutes',
  folderUrl: 'backup_google_drive_folder_url',
  backupFolderId: 'backup_google_drive_backup_folder_id',
  oauthClientId: 'backup_google_drive_oauth_client_id',
  oauthClientSecret: 'backup_google_drive_oauth_client_secret',
  oauthRefreshToken: 'backup_google_drive_oauth_refresh_token',
  oauthAccessToken: 'backup_google_drive_oauth_access_token',
  oauthAccessTokenExpiry: 'backup_google_drive_oauth_access_token_expiry',
  driveAccountEmail: 'backup_google_drive_account_email',
  workerRunning: 'backup_google_drive_worker_running',
  workerPhase: 'backup_google_drive_worker_phase',
  workerStartedAt: 'backup_google_drive_worker_started_at',
  lastRunAt: 'backup_google_drive_last_run_at',
  lastBackupName: 'backup_google_drive_last_backup_name',
  lastStatus: 'backup_google_drive_last_status',
  lastError: 'backup_google_drive_last_error',
};

function parseBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return value === 'true';
}

function parseInterval(value, fallback = 30) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timestampForFile(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function extractFolderId(folderUrl) {
  if (!folderUrl) return null;

  const trimmed = folderUrl.trim();
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function setSetting(key, value) {
  await prisma.site_settings.upsert({
    where: { key },
    update: { value, updated_at: new Date() },
    create: { key, value },
  });
}

async function setWorkerState({ running, phase, startedAt }) {
  const updates = [
    setSetting(SETTING_KEYS.workerRunning, running ? 'true' : 'false'),
    setSetting(SETTING_KEYS.workerPhase, phase),
  ];

  if (startedAt) {
    updates.push(setSetting(SETTING_KEYS.workerStartedAt, startedAt));
  }

  await Promise.all(updates);
}

async function loadSettings() {
  const settings = await prisma.site_settings.findMany({
    where: {
      key: {
        in: Object.values(SETTING_KEYS),
      },
    },
  });

  const map = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    enabled: parseBoolean(map.get(SETTING_KEYS.enabled), false),
    intervalMinutes: parseInterval(map.get(SETTING_KEYS.intervalMinutes), 30),
    folderUrl: map.get(SETTING_KEYS.folderUrl) || '',
    backupFolderId: map.get(SETTING_KEYS.backupFolderId) || '',
    oauthClientId: map.get(SETTING_KEYS.oauthClientId) || '',
    oauthClientSecret: map.get(SETTING_KEYS.oauthClientSecret) || '',
    oauthRefreshToken: map.get(SETTING_KEYS.oauthRefreshToken) || '',
    lastRunAt: map.get(SETTING_KEYS.lastRunAt) || '',
  };
}

function shouldRun(lastRunAt, intervalMinutes, force) {
  if (force) return true;
  if (!lastRunAt) return true;

  const lastRun = new Date(lastRunAt);
  if (Number.isNaN(lastRun.getTime())) return true;

  const nextRunAt = lastRun.getTime() + intervalMinutes * 60 * 1000;
  return Date.now() >= nextRunAt;
}

async function getAccessToken(oauthClientId, oauthClientSecret, oauthRefreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: oauthClientId,
      client_secret: oauthClientSecret,
      refresh_token: oauthRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh Google access token: ${text}`);
  }

  const data = await response.json();
  if (data.access_token) {
    await Promise.all([
      setSetting(SETTING_KEYS.oauthAccessToken, data.access_token),
      ...(typeof data.expires_in === 'number'
        ? [
            setSetting(
              SETTING_KEYS.oauthAccessTokenExpiry,
              new Date(Date.now() + data.expires_in * 1000).toISOString()
            ),
          ]
        : []),
    ]);
  }

  return data.access_token;
}

async function driveRequest(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive request failed: ${text}`);
  }

  return response;
}

async function getDriveFileById(token, fileId) {
  if (!fileId) return null;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,parents`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive request failed: ${text}`);
  }

  return response.json();
}

async function ensureDriveFolder(token, name, parentId, existingFolderId) {
  if (existingFolderId) {
    const existing = await getDriveFileById(token, existingFolderId);
    if (existing?.id && existing.mimeType === 'application/vnd.google-apps.folder') {
      return existing.id;
    }
  }

  const queryParts = [
    "trashed = false",
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${name.replace(/'/g, "\\'")}'`,
  ];

  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryParts.join(' and '))}&fields=files(id,name)`;
  const listResponse = await driveRequest(token, listUrl);
  const listData = await listResponse.json();

  if (listData.files?.length) {
    return listData.files[0].id;
  }

  const createResponse = await driveRequest(token, 'https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });

  const createData = await createResponse.json();
  return createData.id;
}

async function uploadFileToDrive(token, filePath, fileName, parentId) {
  const metadataResponse = await driveRequest(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/sql',
    },
    body: JSON.stringify({
      name: fileName,
      mimeType: 'application/sql',
      parents: [parentId],
    }),
  });

  const uploadUrl = metadataResponse.headers.get('location');
  if (!uploadUrl) {
    throw new Error('Google Drive did not return an upload URL');
  }

  const fileStats = await stat(filePath);
  const uploadResponse = await driveRequest(token, uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(fileStats.size),
      'Content-Type': 'application/sql',
    },
    body: createReadStream(filePath),
    duplex: 'half',
  });

  const uploadData = await uploadResponse.json();
  return uploadData;
}

async function runPgDump(filePath) {
  const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured for the backup worker');
  }

  await mkdir(dirname(filePath), { recursive: true });

  const args = [
    '--dbname',
    databaseUrl,
    '--format=plain',
    '--clean',
    '--if-exists',
    '--create',
    '--blobs',
    '--encoding=UTF8',
    '--file',
    filePath,
  ];

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(pgDumpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(stderr || `pg_dump exited with code ${code}`));
    });
  });
}

async function main() {
  const force = process.argv.includes('--force');
  const settings = await loadSettings();

  if (!settings.enabled) {
    console.log('Google Drive backups are disabled. Skipping.');
    return;
  }

  if (!settings.oauthClientId || !settings.oauthClientSecret || !settings.oauthRefreshToken) {
    console.log('No Google Drive OAuth connection configured. Skipping.');
    return;
  }

  if (!shouldRun(settings.lastRunAt, settings.intervalMinutes, force)) {
    console.log('Backup interval has not elapsed yet. Skipping.');
    return;
  }

  const timestamp = timestampForFile();
  const backupFileName = `event-management-backup-${timestamp}.sql`;
  const backupFilePath = join(BACKUP_DIR, backupFileName);

  try {
    await setWorkerState({
      running: true,
      phase: 'starting',
      startedAt: new Date().toISOString(),
    });

    console.log(`Starting database backup: ${backupFileName}`);
    await setWorkerState({ running: true, phase: 'creating_sql_dump' });
    await runPgDump(backupFilePath);

    await setWorkerState({ running: true, phase: 'authorizing_google_drive' });
    const token = await getAccessToken(settings.oauthClientId, settings.oauthClientSecret, settings.oauthRefreshToken);
    const targetParentFolderId = extractFolderId(settings.folderUrl);
    await setWorkerState({ running: true, phase: 'ensuring_backup_folder' });
    const backupFolderId = await ensureDriveFolder(token, ROOT_FOLDER_NAME, targetParentFolderId, settings.backupFolderId);
    await setSetting(SETTING_KEYS.backupFolderId, backupFolderId);
    await setWorkerState({ running: true, phase: 'uploading_backup_file' });
    await uploadFileToDrive(token, backupFilePath, backupFileName, backupFolderId);
    await setWorkerState({ running: true, phase: 'finalizing' });

    await Promise.all([
      setSetting(SETTING_KEYS.lastRunAt, new Date().toISOString()),
      setSetting(SETTING_KEYS.lastBackupName, backupFileName),
      setSetting(SETTING_KEYS.lastStatus, 'SUCCESS'),
      setSetting(SETTING_KEYS.lastError, ''),
    ]);

    await rm(backupFilePath, { force: true });
    await setWorkerState({ running: false, phase: 'idle' });
    console.log(`Backup uploaded successfully: ${backupFileName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backup error';
    await Promise.all([
      setSetting(SETTING_KEYS.lastStatus, 'FAILED'),
      setSetting(SETTING_KEYS.lastError, message),
      setSetting(SETTING_KEYS.workerRunning, 'false'),
      setSetting(SETTING_KEYS.workerPhase, 'failed'),
    ]);
    console.error(`Backup failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
