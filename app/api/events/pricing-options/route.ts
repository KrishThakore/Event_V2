import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json([]);

  const options = await prisma.event_pricing_options.findMany({
    where: { event_id: { in: ids } },
    select: { event_id: true, price: true },
    orderBy: { price: 'asc' }
  });

  return NextResponse.json(
    options.map(o => ({ event_id: o.event_id, price: Number(o.price) })),
    {
      headers: {
        // Cache pricing data: browser caches 60s, CDN serves stale for up to 5min
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    }
  );
}
