import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getTenantSummary } from '@/lib/calculations';
import { Profile } from '@/lib/types';

// GET: List all tenants with calculated utility status
export async function GET(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized access.' }, { status: 401 });
    }

    const db = await getDb();
    const tenants = db.profiles.filter(p => p.role !== 'admin');

    const calculatedTenants = tenants.map(tenant => {
      const summary = getTenantSummary(db, tenant.id);
      return {
        ...tenant,
        summary: summary || null,
      };
    });

    return NextResponse.json({ success: true, tenants: calculatedTenants });
  } catch (err: any) {
    console.error('Error fetching tenants:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Admin creates a new tenant account
export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized access.' }, { status: 401 });
    }

    const { 
      full_name, 
      email, 
      phone, 
      role, 
      room_label, 
      meter_id, 
      deposit_amount,
      initial_reading
    } = await req.json();

    if (!full_name || !email || !role || !room_label) {
      return NextResponse.json({ message: 'Required fields missing: full_name, email, role, room_label' }, { status: 400 });
    }

    const db = await getDb();

    // Check if email already registered
    const exists = db.profiles.some(p => p.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      return NextResponse.json({ message: 'A profile with this email address already exists.' }, { status: 409 });
    }

    const newTenantId = `tenant-${Date.now()}`;
    const newProfile: Profile = {
      id: newTenantId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      phone: phone?.trim() || '',
      role: role as 'electricity_tenant' | 'water_only_tenant',
      room_label: room_label.trim(),
      meter_id: role === 'electricity_tenant' ? (meter_id?.trim() || `MTR-${Math.floor(10000 + Math.random() * 90000)}`) : undefined,
      deposit_amount: Number(deposit_amount) || 0,
      created_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // If there is a deposit, record a deposit entry & a confirmed manual deposit payment
    if (Number(deposit_amount) > 0) {
      const depId = `dep-${Date.now()}`;
      const payId = `pay-dep-${Date.now()}`;

      db.deposits.push({
        id: depId,
        tenant_id: newTenantId,
        amount: Number(deposit_amount),
        refunded: false,
        note: `Initial security deposit for ${room_label}`,
        created_at: new Date().toISOString(),
      });

      db.payments.push({
        id: payId,
        tenant_id: newTenantId,
        amount: Number(deposit_amount),
        payment_type: 'deposit',
        payment_method: 'manual',
        paystack_reference: `MANUAL_INIT_DEP_${newTenantId}`,
        status: 'confirmed',
        confirmed_by: caller.id,
        note: `Initial recorded deposit for room matching ${room_label}`,
        created_at: new Date().toISOString(),
      });
    }

    // Automatically seed some initial water_contributions for the new user for past months
    // to give them starting rows
    const months = ['2026-04', '2026-05', '2026-06'];
    months.forEach((m, idx) => {
      db.water_contributions.push({
        id: `water-gen-${newTenantId}-${m}`,
        tenant_id: newTenantId,
        month: m,
        amount: 3000,
        status: idx === 2 ? 'pending' : 'paid', // current month June is pending, others paid
        created_at: new Date().toISOString()
      });
    });

    // If electricity tenant, seed a starting baseline meter reading so usage counts from it
    if (role === 'electricity_tenant') {
      db.meter_readings.push({
        id: `reading-init-${newTenantId}`,
        tenant_id: newTenantId,
        reading_date: new Date().toISOString(),
        reading_kwh: Number(initial_reading) || 0,
        notes: "Baseline registered reading upon creation",
        created_by: caller.id,
        created_at: new Date().toISOString()
      });
    }

    await saveDb(db);

    return NextResponse.json({ success: true, profile: newProfile });

  } catch (err: any) {
    console.error('Error creating tenant:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
