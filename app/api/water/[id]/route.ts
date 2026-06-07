import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json(); // e.g. "pending", "paid", "waived"

    if (!status || !['pending', 'paid', 'waived'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status parameter provided.' }, { status: 400 });
    }

    const db = await getDb();
    const contrib = db.water_contributions.find(c => c.id === id);

    if (!contrib) {
      return NextResponse.json({ message: 'Water contribution record not found.' }, { status: 404 });
    }

    const oldStatus = contrib.status;
    contrib.status = status as 'pending' | 'paid' | 'waived';

    await saveDb(db);

    return NextResponse.json({ 
      success: true, 
      message: `Adjusted water log status to ${status}.`,
      contribution: contrib
    });

  } catch (err: any) {
    console.error('Error patching water status:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
