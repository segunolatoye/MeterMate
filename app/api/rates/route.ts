import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ElectricityRate } from '@/lib/types';

// GET: Return all rate logs
export async function GET(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    }

    const db = await getDb();
    const sortedRates = [...db.electricity_rates].sort((a, b) => 
      new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    );

    return NextResponse.json({ success: true, rates: sortedRates });
  } catch (err: any) {
    console.error('Error fetching rates:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Register a new tariff rate
export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { rate_per_kwh, effective_from, note } = await req.json();

    if (!rate_per_kwh || !effective_from) {
      return NextResponse.json({ message: 'Required parameters missing: rate_per_kwh, effective_from' }, { status: 400 });
    }

    const db = await getDb();
    const newRate: ElectricityRate = {
      id: `rate-${Date.now()}`,
      rate_per_kwh: Number(rate_per_kwh),
      effective_from,
      note: note?.trim() || 'Tariff alignment update',
      created_by: caller.id,
      created_at: new Date().toISOString()
    };

    db.electricity_rates.push(newRate);
    await saveDb(db);

    return NextResponse.json({ success: true, rate: newRate });

  } catch (err: any) {
    console.error('Error logging rate:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
