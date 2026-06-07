import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { id } = await params;

    const db = await getDb();
    const readingIndex = db.meter_readings.findIndex(r => r.id === id);

    if (readingIndex === -1) {
      return NextResponse.json({ message: 'Target reading record not found.' }, { status: 404 });
    }

    db.meter_readings.splice(readingIndex, 1);
    await saveDb(db);

    return NextResponse.json({ success: true, message: 'Meter reading deleted successfully.' });

  } catch (err: any) {
    console.error('Error deleting meter reading:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
