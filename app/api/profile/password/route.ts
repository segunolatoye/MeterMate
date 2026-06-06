import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json({ message: 'New password must be at least 4 characters.' }, { status: 400 });
    }

    const db = await getDb();
    const profileIdx = db.profiles.findIndex(p => p.id === caller.id);

    if (profileIdx === -1) {
      return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
    }

    const profile = db.profiles[profileIdx];

    // Verify current password. If they haven't explicitly set a password, check default values:
    // 12345 for occupants and password123 for administrator.
    const defaultPassword = profile.role === 'admin' ? 'password123' : '12345';
    const expectedPassword = profile.password || defaultPassword;

    if (currentPassword && currentPassword !== expectedPassword) {
      return NextResponse.json({ message: 'Incorrect current password provided.' }, { status: 400 });
    }

    // Verify new password doesn't equal old one
    if (newPassword.trim() === expectedPassword) {
      return NextResponse.json({ message: 'New password cannot be the same as your old password.' }, { status: 452 });
    }

    // Save password
    profile.password = newPassword.trim();

    await saveDb(db);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });

  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
