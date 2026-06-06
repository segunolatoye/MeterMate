import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getTenantSummary } from '@/lib/calculations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { id } = await params;

    // A tenant is restricted to checking only their own summary unless admin is querying
    if (caller.role !== 'admin' && caller.id !== id) {
      return NextResponse.json({ message: 'Forbidden. You do not have permission to view this billing summary.' }, { status: 403 });
    }

    const db = await getDb();
    const summary = getTenantSummary(db, id);

    if (!summary) {
      return NextResponse.json({ message: 'Tenant profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, summary });

  } catch (err: any) {
    console.error('Error fetching tenant summary:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
