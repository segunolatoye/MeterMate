import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { MeterReading } from '@/lib/types';

// POST: Log a new meter reading (admin only)
export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Only admins can register meter readings.' }, { status: 401 });
    }

    const { tenant_id, reading_date, reading_kwh, notes } = await req.json();

    if (!tenant_id || !reading_date || !reading_kwh) {
      return NextResponse.json({ message: 'Required fields missing: tenant_id, reading_date, reading_kwh' }, { status: 400 });
    }

    const db = await getDb();
    const tenant = db.profiles.find(p => p.id === tenant_id);
    if (!tenant) {
      return NextResponse.json({ message: 'Target tenant profile not found.' }, { status: 404 });
    }

    // Ensure reading value is positive and logically greater than or equal to previous reading
    const newKwh = Number(reading_kwh);
    const existingReadings = db.meter_readings.filter(r => r.tenant_id === tenant_id);
    if (existingReadings.length > 0) {
      const sorted = [...existingReadings].sort((a, b) => b.reading_kwh - a.reading_kwh);
      const highestPrev = sorted[0].reading_kwh;
      if (newKwh < highestPrev) {
        return NextResponse.json({ 
          message: `Validation Error: Reading (${newKwh} kWh) cannot be lesser than the previous recorded reading of ${highestPrev} kWh.` 
        }, { status: 400 });
      }
    }

    const readingId = `reading_${tenant_id}_${reading_date}`;
    const newReading: MeterReading = {
      id: readingId,
      tenant_id,
      reading_date,
      reading_kwh: newKwh,
      notes: notes?.trim() || '',
      created_by: caller.id,
      created_at: new Date().toISOString()
    };

    db.meter_readings.push(newReading);
    await saveDb(db);

    return NextResponse.json({ success: true, reading: newReading });

  } catch (err: any) {
    console.error('Error logging reading:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
