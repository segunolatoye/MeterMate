import { getDb } from './db';
import { Profile } from './types';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'metermate_session_id';

export async function getSessionUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionId) return null;

    const db = await getDb();
    const user = db.profiles.find(p => p.id === sessionId);
    return user || null;
  } catch (err) {
    console.error('Error fetching session user:', err);
    return null;
  }
}

export async function setSessionUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: userId,
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
