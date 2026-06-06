import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Profile } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized access.' }, { status: 401 });
    }

    const { email, full_name, role, room_label, phone } = await req.json();

    if (!email || !full_name || !role || !room_label) {
      return NextResponse.json({ message: 'Required fields missing: email, full_name, role, room_label' }, { status: 400 });
    }

    const db = await getDb();
    const exists = db.profiles.some(p => p.email && p.email.toLowerCase() === email.toLowerCase().trim());
    if (exists) {
      return NextResponse.json({ message: 'A profile with this email address already exists.' }, { status: 409 });
    }

    const id = `tenant-${Date.now()}`;
    const newProfile: Profile = {
      id,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      phone: phone?.trim() || '',
      role: role as 'electricity_tenant' | 'water_only_tenant',
      room_label: room_label.trim(),
      meter_id: role === 'electricity_tenant' ? `MTR-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      deposit_amount: 0,
      created_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // Seed water contributions
    const months = ['2026-04', '2026-05', '2026-06'];
    months.forEach((m, idx) => {
      db.water_contributions.push({
        id: `water-gen-${id}-${m}`,
        tenant_id: id,
        month: m,
        amount: 3000,
        status: idx === 2 ? 'pending' : 'paid',
        created_at: new Date().toISOString()
      });
    });

    if (role === 'electricity_tenant') {
      db.meter_readings.push({
        id: `reading-init-${id}`,
        tenant_id: id,
        reading_date: new Date().toISOString().split('T')[0],
        reading_kwh: 100,
        notes: "Baseline registered reading on invite",
        created_by: caller.id,
        created_at: new Date().toISOString()
      });
    }

    await saveDb(db);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/login?inviteEmail=${encodeURIComponent(newProfile.email)}`;

    return NextResponse.json({
      success: true,
      message: 'Invite link generated successfully.',
      inviteLink,
      profile: newProfile
    });

  } catch (err: any) {
    console.error('Error issuing invite:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
