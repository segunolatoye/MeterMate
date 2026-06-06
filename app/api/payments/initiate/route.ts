import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Payment } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { amount, paymentType, note } = await req.json();

    if (!amount || !paymentType) {
      return NextResponse.json({ message: 'Missing parameters: amount, paymentType' }, { status: 400 });
    }

    const db = await getDb();
    
    // Generate a secure transaction reference matching standard format
    const reference = `MATE-${caller.id.substring(0,6)}-${Date.now()}`;
    const paymentId = `pay-${Date.now()}`;

    const newPayment: Payment = {
      id: paymentId,
      tenant_id: caller.id,
      amount: Number(amount),
      payment_type: paymentType as 'electricity' | 'water' | 'deposit' | 'prepayment',
      payment_method: 'paystack_card',
      paystack_reference: reference,
      status: 'pending',
      note: note || `Initiated card checkout for ${paymentType}`,
      created_at: new Date().toISOString()
    };

    db.payments.push(newPayment);
    await saveDb(db);

    return NextResponse.json({ 
      success: true, 
      payment: newPayment,
      reference 
    });

  } catch (err: any) {
    console.error('Error initiating payment:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
