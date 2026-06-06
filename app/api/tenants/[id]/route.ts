import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, deleteProfile } from '@/lib/db';
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
    const { full_name, email, phone, meter_id } = await req.json();

    if (!full_name || !email) {
      return NextResponse.json({ message: 'Required parameters missing: full_name, email' }, { status: 400 });
    }

    const db = await getDb();
    const profileIndex = db.profiles.findIndex(p => p.id === id);

    if (profileIndex === -1) {
      return NextResponse.json({ message: 'Occupant profile not found.' }, { status: 404 });
    }

    const profile = db.profiles[profileIndex];

    // Check email uniqueness if email has changed
    if (profile.email && profile.email.toLowerCase() !== email.toLowerCase().trim()) {
      const emailExists = db.profiles.some(p => p.id !== id && p.email && p.email.toLowerCase() === email.toLowerCase().trim());
      if (emailExists) {
        return NextResponse.json({ message: 'Another profile with this email address already exists.' }, { status: 409 });
      }
    }

    // Apply updates
    profile.full_name = full_name.trim();
    profile.email = email.trim().toLowerCase();
    profile.phone = phone?.trim() || '';
    
    if (profile.role === 'electricity_tenant') {
      profile.meter_id = meter_id?.trim() || '';
    }

    await saveDb(db);

    return NextResponse.json({ success: true, profile });

  } catch (err: any) {
    console.error('Error updating tenant profile:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

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
    await deleteProfile(id);

    return NextResponse.json({ success: true, message: 'Occupant deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting tenant profile:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
