import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, db as firestoreDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ message: 'Missing reference parameter.' }, { status: 400 });
    }

    const db = await getDb();
    
    // Find the payment record
    const paymentIndex = db.payments.findIndex(p => p.paystack_reference === reference && p.tenant_id === caller.id);

    if (paymentIndex === -1) {
      return NextResponse.json({ message: 'Payment record not found.' }, { status: 404 });
    }

    const payment = db.payments[paymentIndex];

    // Only allow cancellation of pending payments
    if (payment.status === 'pending') {
      // Delete the abandoned checkout to keep the ledger clean
      db.payments.splice(paymentIndex, 1);
      
      // Delete from firestore using Admin SDK
      await firestoreDb.collection('payments').doc(payment.id).delete();
      
      await saveDb(db);
      return NextResponse.json({ success: true, message: 'Abandoned transaction cleared.' });
    } else {
      return NextResponse.json({ success: false, message: 'Cannot cancel a completed or already failed transaction.' }, { status: 400 });
    }

  } catch (err: any) {
    console.error('Error cancelling payment:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
