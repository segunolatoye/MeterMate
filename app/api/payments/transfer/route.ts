import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Payment } from '@/lib/types';
import { notifyAdmins } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { amount, paymentType, transferDate, note } = await req.json();

    if (!amount || !paymentType) {
      return NextResponse.json({ message: 'Required fields missing: amount, paymentType' }, { status: 400 });
    }

    const db = await getDb();
    
    // Generate a reference code to match transfers
    const reference = `TX_TRANS_${Date.now()}`;
    const paymentId = `pay-transfer-${Date.now()}`;

    const newPayment: Payment = {
      id: paymentId,
      tenant_id: caller.id,
      amount: Number(amount),
      payment_type: paymentType as 'electricity' | 'water' | 'deposit' | 'prepayment',
      payment_method: 'paystack_transfer',
      paystack_reference: reference,
      status: 'pending',
      note: note || `Manual bank transfer submitted on ${transferDate}`,
      created_at: new Date().toISOString()
    };

    db.payments.push(newPayment);
    await saveDb(db);

    // Notify admins about the new payment log
    try {
      await notifyAdmins({
        title: 'New Payment Logged! 💰',
        body: `${caller.full_name || 'A tenant'} just logged a ${paymentType} payment of ₦${Number(amount).toLocaleString('en-NG')}.`,
        url: '/admin/payments'
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    return NextResponse.json({ success: true, payment: newPayment });

  } catch (err: any) {
    console.error('Error listing transfer:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
