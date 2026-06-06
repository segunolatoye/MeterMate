import { NextRequest, NextResponse } from 'next/server';
import { notifyUser } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    await notifyUser(userId, {
      title: 'MeterMate Active! 🎉',
      body: 'Real-time compound utility notifications are fully functional on this device.',
      url: '/dashboard'
    });

    return NextResponse.json({ success: true, message: 'Test notification queued successfully.' });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json({ error: 'Failed to dispatch test notification' }, { status: 500 });
  }
}
