import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { notifyAllOccupants } from '@/lib/notifications';
import { db } from '@/lib/db';


export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { title, body, url } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Both title and body are required.' }, { status: 400 });
    }

    const targetUrl = url || '/dashboard';

    // Broadcast Web Push
    await notifyAllOccupants({
      title,
      body,
      url: targetUrl
    });

    // Save notification to historical logs
    const notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const notificationItem = {
      id: notificationId,
      title,
      body,
      url: targetUrl,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      target: 'all'
    };

    await db.collection('notifications').doc(notificationId).set(notificationItem);

    return NextResponse.json({ 
      success: true, 
      message: 'Custom broadcast notification successfully sent and logged.',
      id: notificationId 
    });
  } catch (error: any) {
    console.error('Error in manual broadcast endpoint:', error);
    return NextResponse.json({ error: 'Failed to record and send broadcast notification' }, { status: 500 });
  }
}
