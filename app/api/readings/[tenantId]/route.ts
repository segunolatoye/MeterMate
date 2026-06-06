import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { tenantId } = await params;

    // Reject non-admin accessing another person's record
    if (caller.role !== 'admin' && caller.id !== tenantId) {
      return NextResponse.json({ message: 'Forbidden. You do not have permission to view these logs.' }, { status: 403 });
    }

    const db = await getDb();
    const readings = db.meter_readings
      .filter(r => r.tenant_id === tenantId)
      .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());

    return NextResponse.json({ success: true, readings });

  } catch (err: any) {
    console.error('Error fetching tenant readings:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
