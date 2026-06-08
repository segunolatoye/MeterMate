import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { MeterReading } from '@/lib/types';
import { notifyUser } from '@/lib/notifications';

// POST: Log multiple meter readings at once (admin only)
export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Only admins can register meter readings.' }, { status: 401 });
    }

    const { reading_date, notes, readings } = await req.json();

    if (!reading_date || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ message: 'Required fields missing: reading_date or valid readings array' }, { status: 400 });
    }

    const db = await getDb();
    const newRecords: MeterReading[] = [];
    const notificationPromises: Promise<any>[] = [];

    // Validate and build all records
    for (const item of readings) {
      const { tenant_id, reading_kwh } = item;
      
      if (!tenant_id || reading_kwh === undefined || reading_kwh === null || reading_kwh === '') {
        continue; // Skip incomplete records
      }

      const tenant = db.profiles.find(p => p.id === tenant_id);
      if (!tenant || tenant.role !== 'electricity_tenant') {
        continue; // Skip invalid tenants
      }

      const newKwh = Number(reading_kwh);
      const existingReadings = db.meter_readings.filter(r => r.tenant_id === tenant_id);
      
      if (existingReadings.length > 0) {
        const sorted = [...existingReadings].sort((a, b) => b.reading_kwh - a.reading_kwh);
        const highestPrev = sorted[0].reading_kwh;
        if (newKwh < highestPrev) {
          return NextResponse.json({ 
            message: `Validation Error for ${tenant.room_label}: Reading (${newKwh} kWh) cannot be lesser than their previous reading of ${highestPrev} kWh.` 
          }, { status: 400 });
        }
      }

      // Generate a truly unique ID using crypto.randomUUID or Date.now + random to prevent collisions
      // Since it's a loop running synchronously, Date.now() might be the same for all elements,
      // so we append the tenant ID and a random string.
      const uniqueSuffix = Math.random().toString(36).substring(2, 9);
      const readingId = `reading_${tenant_id}_${Date.now()}_${uniqueSuffix}`;

      const newReading: MeterReading = {
        id: readingId,
        tenant_id,
        reading_date,
        reading_kwh: newKwh,
        notes: notes?.trim() || '',
        created_by: caller.id,
        created_at: new Date().toISOString()
      };

      newRecords.push(newReading);

      // Queue push notification
      if (tenant_id !== 'WATER_PUMP') {
        notificationPromises.push(
          notifyUser(tenant_id, {
            title: 'New Sub-Meter Reading',
            body: `A new electricity reading of ${newKwh} kWh has been logged for your unit.`,
            url: '/dashboard/history'
          }).catch(console.error)
        );
      }
    }

    if (newRecords.length === 0) {
      return NextResponse.json({ message: 'No valid readings were provided to save.' }, { status: 400 });
    }

    // Push all new records to db
    db.meter_readings.push(...newRecords);
    await saveDb(db);

    // Fire notifications asynchronously without awaiting
    Promise.all(notificationPromises);

    return NextResponse.json({ success: true, count: newRecords.length });

  } catch (err: any) {
    console.error('Error in bulk logging readings:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
