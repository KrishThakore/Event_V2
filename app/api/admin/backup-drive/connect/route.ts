import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BACKUP_SETTING_KEYS } from '@/lib/backup-settings';
import { getCanonicalOrigin } from '@/lib/canonical-origin';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const browserOrigin = getCanonicalOrigin(request, request.nextUrl.searchParams.get('origin'));

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin', browserOrigin));
  }

  const settings = await prisma.site_settings.findMany({
    where: {
      key: {
        in: [BACKUP_SETTING_KEYS.oauthClientId, BACKUP_SETTING_KEYS.oauthClientSecret],
      },
    },
  });

  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  const clientId = map.get(BACKUP_SETTING_KEYS.oauthClientId);
  const clientSecret = map.get(BACKUP_SETTING_KEYS.oauthClientSecret);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/admin-dashboard/settings?backupOAuth=missing-config', browserOrigin));
  }

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${browserOrigin}/api/admin/backup-drive/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email openid');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('backup_drive_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: browserOrigin.startsWith('https://'),
    path: '/',
    maxAge: 60 * 15,
  });
  response.cookies.set('backup_drive_oauth_origin', browserOrigin, {
    httpOnly: true,
    sameSite: 'lax',
    secure: browserOrigin.startsWith('https://'),
    path: '/',
    maxAge: 60 * 15,
  });

  return response;
}
