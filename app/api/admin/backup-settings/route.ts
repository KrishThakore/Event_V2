import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  BACKUP_SETTING_KEYS,
  loadBackupSettingsFromDb,
  parseInterval,
  sanitizeFolderUrl,
  sanitizeString,
  upsertBackupSetting,
} from '@/lib/backup-settings';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      backup: await loadBackupSettingsFromDb(),
    });
  } catch (error: any) {
    console.error('Backup settings GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load backup settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const enabled = Boolean(body?.enabled);
    const folderUrl = sanitizeFolderUrl(body?.folderUrl);
    const oauthClientId = sanitizeString(body?.oauthClientId);
    const oauthClientSecret = sanitizeString(body?.oauthClientSecret);

    const intervalMinutes = Number(body?.intervalMinutes);
    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 10080) {
      return NextResponse.json({ success: false, error: 'Backup interval must be between 1 and 10080 minutes' }, { status: 400 });
    }

    const updates: Array<{ key: string; value: string }> = [
      { key: BACKUP_SETTING_KEYS.enabled, value: enabled ? 'true' : 'false' },
      { key: BACKUP_SETTING_KEYS.intervalMinutes, value: String(intervalMinutes) },
      { key: BACKUP_SETTING_KEYS.folderUrl, value: folderUrl },
    ];

    if (oauthClientId) {
      updates.push({ key: BACKUP_SETTING_KEYS.oauthClientId, value: oauthClientId });
    }

    if (oauthClientSecret) {
      updates.push({ key: BACKUP_SETTING_KEYS.oauthClientSecret, value: oauthClientSecret });
    }

    await Promise.all(
      updates.map((entry) => upsertBackupSetting(entry.key, entry.value))
    );

    return NextResponse.json({
      success: true,
      backup: await loadBackupSettingsFromDb(),
    });
  } catch (error: any) {
    console.error('Backup settings PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save backup settings' }, { status: 500 });
  }
}
