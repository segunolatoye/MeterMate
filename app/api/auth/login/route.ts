import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import * as admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ message: 'Firebase ID Token is required.' }, { status: 400 });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email?.trim().toLowerCase();
    
    const db = await getDb();
    // Look up the user profile using the Firebase Auth email
    const user = db.profiles.find(p => p.email && p.email.toLowerCase() === email);

    if (!user) {
      return NextResponse.json({ message: 'User profile not found in database.' }, { status: 404 });
    }

    // Set authenticated session cookie
    await createSession(idToken);

    const redirectUrl = '/dashboard';

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
    console.error('Login routing error:', err);
    return NextResponse.json({ message: 'Authentication failed. Invalid or expired token.' }, { status: 401 });
  }
}
