import { prisma } from '@/lib/prisma';

export const BACKUP_SETTING_KEYS = {
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
  daemonRunning: 'backup_google_drive_daemon_running',
  daemonStartedAt: 'backup_google_drive_daemon_started_at',
  daemonHeartbeatAt: 'backup_google_drive_daemon_heartbeat_at',
  lastRunAt: 'backup_google_drive_last_run_at',
  lastBackupName: 'backup_google_drive_last_backup_name',
  lastStatus: 'backup_google_drive_last_status',
  lastError: 'backup_google_drive_last_error',
} as const;

export function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === 'true';
}

export function parseInterval(value: string | undefined, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function sanitizeFolderUrl(url: unknown) {
  return typeof url === 'string' ? url.trim() : '';
}

export function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function loadBackupSettingsFromDb() {
  const settings = await prisma.site_settings.findMany({
    where: {
      key: {
        in: Object.values(BACKUP_SETTING_KEYS),
      },
    },
  });

  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  const daemonHeartbeatAt = map.get(BACKUP_SETTING_KEYS.daemonHeartbeatAt) || '';
  const daemonHeartbeatMs = daemonHeartbeatAt ? new Date(daemonHeartbeatAt).getTime() : NaN;
  const daemonRunning =
    parseBoolean(map.get(BACKUP_SETTING_KEYS.daemonRunning), false) &&
    Number.isFinite(daemonHeartbeatMs) &&
    Date.now() - daemonHeartbeatMs < 180_000;

  return {
    enabled: parseBoolean(map.get(BACKUP_SETTING_KEYS.enabled), false),
    intervalMinutes: parseInterval(map.get(BACKUP_SETTING_KEYS.intervalMinutes), 30),
    folderUrl: map.get(BACKUP_SETTING_KEYS.folderUrl) || '',
    backupFolderId: map.get(BACKUP_SETTING_KEYS.backupFolderId) || '',
    oauthClientId: map.get(BACKUP_SETTING_KEYS.oauthClientId) || '',
    hasOAuthClientSecret: Boolean(map.get(BACKUP_SETTING_KEYS.oauthClientSecret)),
    hasDriveConnection: Boolean(map.get(BACKUP_SETTING_KEYS.oauthRefreshToken)),
    driveAccountEmail: map.get(BACKUP_SETTING_KEYS.driveAccountEmail) || '',
    workerRunning: parseBoolean(map.get(BACKUP_SETTING_KEYS.workerRunning), false),
    workerPhase: map.get(BACKUP_SETTING_KEYS.workerPhase) || '',
    workerStartedAt: map.get(BACKUP_SETTING_KEYS.workerStartedAt) || '',
    daemonRunning,
    daemonStartedAt: map.get(BACKUP_SETTING_KEYS.daemonStartedAt) || '',
    daemonHeartbeatAt,
    lastRunAt: map.get(BACKUP_SETTING_KEYS.lastRunAt) || '',
    lastBackupName: map.get(BACKUP_SETTING_KEYS.lastBackupName) || '',
    lastStatus: map.get(BACKUP_SETTING_KEYS.lastStatus) || '',
    lastError: map.get(BACKUP_SETTING_KEYS.lastError) || '',
  };
}

export async function upsertBackupSetting(key: string, value: string) {
  return prisma.site_settings.upsert({
    where: { key },
    update: { value, updated_at: new Date() },
    create: { key, value },
  });
}
