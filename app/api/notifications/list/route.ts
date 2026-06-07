import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';


export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const snap = await db.collection('notifications').get();
    const notifications = snap.docs.map(doc => doc.data());

    // Filter notifications: broadcasted to everyone, or specific to this user
    const filtered = notifications.filter(notif => 
      notif.target === 'all' || notif.target === user.id
    );

    // Sort by descending timestamp (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, notifications: filtered });
  } catch (error: any) {
    console.error('Error listing notifications:', error);
    return NextResponse.json({ error: 'Failed to retrieve notification log' }, { status: 500 });
  }
}
