import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/settings?key=default_qfix_link
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  try {
    const setting = await prisma.site_settings.findUnique({
      where: { key }
    });

    return NextResponse.json({
      key,
      value: setting?.value || '',
      updated_at: setting?.updated_at || null
    });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value !== 'string') {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    const setting = await prisma.site_settings.upsert({
      where: { key },
      update: { value, updated_at: new Date() },
      create: { key, value }
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
