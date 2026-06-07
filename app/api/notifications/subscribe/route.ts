import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription, endpoint, p256dh, auth } = body;

    let subEndpoint = endpoint;
    let subP256dh = p256dh;
    let subAuth = auth;

    if (subscription) {
      subEndpoint = subscription.endpoint;
      subP256dh = subscription.keys?.p256dh;
      subAuth = subscription.keys?.auth;
    }

    if (!subEndpoint || !subP256dh || !subAuth) {
      return NextResponse.json({ error: 'Missing push subscription parameters (endpoint, p256dh, or auth)' }, { status: 400 });
    }

    // Hash or base64-encode endpoint to create a unique yet idempotent subscription document ID
    const subscriptionId = Buffer.from(subEndpoint)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-100);

    const subscriptionItem = {
      id: subscriptionId,
      user_id: userId || 'anonymous',
      endpoint: subEndpoint,
      p256dh: subP256dh,
      auth: subAuth,
      created_at: new Date().toISOString()
    };

    // Save the subscription to Firestore
    const docRef = db.collection('push_subscriptions').doc(subscriptionId);
    await docRef.set(subscriptionItem);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription successfully configured.',
      subscriptionId 
    });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to record push subscription details' }, { status: 500 });
  }
}
