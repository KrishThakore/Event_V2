import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BACKUP_SETTING_KEYS, upsertBackupSetting } from '@/lib/backup-settings';
import { getCanonicalOrigin } from '@/lib/canonical-origin';
import { prisma } from '@/lib/prisma';

async function loadOAuthClientConfig() {
  const settings = await prisma.site_settings.findMany({
    where: {
      key: {
        in: [BACKUP_SETTING_KEYS.oauthClientId, BACKUP_SETTING_KEYS.oauthClientSecret],
      },
    },
  });

  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  return {
    clientId: map.get(BACKUP_SETTING_KEYS.oauthClientId) || '',
    clientSecret: map.get(BACKUP_SETTING_KEYS.oauthClientSecret) || '',
  };
}

export async function GET(request: NextRequest) {
  const originCookie = request.cookies.get('backup_drive_oauth_origin')?.value;
  const appOrigin = getCanonicalOrigin(request, originCookie);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin', appOrigin));
  }

  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const stateCookie = request.cookies.get('backup_drive_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/admin-dashboard/settings?backupOAuth=${encodeURIComponent(error)}`, appOrigin));
  }

  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=invalid-state', appOrigin));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=missing-code', appOrigin));
  }

  const { clientId, clientSecret } = await loadOAuthClientConfig();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=missing-config', appOrigin));
  }

  const redirectUri = `${appOrigin}/api/admin/backup-drive/callback`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.redirect(new URL(`/admin-dashboard/settings?backupOAuth=${encodeURIComponent(`token-error:${text}`)}`, appOrigin));
  }

  const tokenData = await tokenResponse.json();
  const refreshToken = tokenData.refresh_token as string | undefined;
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=missing-access-token', appOrigin));
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) {
    const text = await userInfoResponse.text();
    return NextResponse.redirect(new URL(`/admin-dashboard/settings?backupOAuth=${encodeURIComponent(`userinfo-error:${text}`)}`, appOrigin));
  }

  const userInfo = await userInfoResponse.json();

  const updates = [
    upsertBackupSetting(BACKUP_SETTING_KEYS.oauthAccessToken, accessToken),
    upsertBackupSetting(BACKUP_SETTING_KEYS.driveAccountEmail, userInfo.email || ''),
  ];

  if (typeof tokenData.expires_in === 'number') {
    updates.push(
      upsertBackupSetting(
        BACKUP_SETTING_KEYS.oauthAccessTokenExpiry,
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      )
    );
  }

  if (refreshToken) {
    updates.push(upsertBackupSetting(BACKUP_SETTING_KEYS.oauthRefreshToken, refreshToken));
  }

  await Promise.all(updates);

  const response = NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=connected', appOrigin));
  response.cookies.set('backup_drive_oauth_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: appOrigin.startsWith('https://'),
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('backup_drive_oauth_origin', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: appOrigin.startsWith('https://'),
    path: '/',
    maxAge: 0,
  });

  return response;
}
