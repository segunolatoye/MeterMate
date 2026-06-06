import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { setSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Google account email is required.' }, { status: 400 });
    }

    const db = await getDb();
    const trimmedEmail = email.trim().toLowerCase();
    const user = db.profiles.find(p => p.email && p.email.toLowerCase() === trimmedEmail);

    if (!user) {
      return NextResponse.json({ 
        message: `No registered profile found matching "${email}". Please ask your administrator to register your occupancy first.`
      }, { status: 404 });
    }

    // Initialize session
    await setSessionUser(user.id);

    const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      redirectUrl
    });

  } catch (err: any) {
    console.error('Google login routing error:', err);
    return NextResponse.json({ message: 'Internal server error during Google login validation.' }, { status: 500 });
  }
}
