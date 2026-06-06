import { NextResponse } from 'next/server';
import { getOrGenerateVapidKeys } from '@/lib/notifications';

export async function GET() {
  try {
    const keys = await getOrGenerateVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error: any) {
    console.error('Error in VAPID API:', error);
    return NextResponse.json({ error: 'Failed to retrieve or generate VAPID keys' }, { status: 500 });
  }
}
