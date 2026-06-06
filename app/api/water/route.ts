import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const db = await getDb();
    
    // Admins see all logs, occupants see only their own contributions
    let contributions = db.water_contributions;
    if (caller.role !== 'admin') {
      contributions = db.water_contributions.filter(c => c.tenant_id === caller.id);
    }

    return NextResponse.json({ success: true, contributions });

  } catch (err: any) {
    console.error('Error fetching general water stats:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 550 });
  }
}
