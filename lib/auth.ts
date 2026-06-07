import { getDb } from './db';
import { Profile } from './types';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const SESSION_COOKIE_NAME = 'metermate_session_id';

export async function getSessionUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    if (!decodedClaims) return null;

    const db = await getDb();
    const email = decodedClaims.email?.trim().toLowerCase();
    const user = db.profiles.find(p => p.email && p.email.toLowerCase() === email);
    return user || null;
  } catch (err: any) {
    if (err && (
      err.digest === 'DYNAMIC_SERVER_USAGE' ||
      err.message?.includes('Dynamic server usage') ||
      err.name === 'DynamicServerError'
    )) {
      throw err;
    }
    console.error('Error fetching session user:', err);
    return null;
  }
}

export async function createSession(idToken: string): Promise<void> {
  const expiresIn = 60 * 60 * 24 * 7 * 1000; // 1 week
  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
  const cookieStore = await cookies();
  
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    path: '/',
    secure: true, // Must be true when sameSite is none
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: 'none', // Allow cookie persistence inside cross-origin development iframes
  });
}

export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Check if a session belongs to an admin
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === 'admin';
}
