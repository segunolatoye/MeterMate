import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json(); // e.g. "pending", "paid", "waived"

    if (!status || !['pending', 'paid', 'waived'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status parameter provided.' }, { status: 400 });
    }

    const db = await getDb();
    const contrib = db.water_contributions.find(c => c.id === id);

    if (!contrib) {
      return NextResponse.json({ message: 'Water contribution record not found.' }, { status: 404 });
    }

    const oldStatus = contrib.status;
    contrib.status = status as 'pending' | 'paid' | 'waived';

    // If changing from pending to paid manually, log a confirmed payment to mirror it
    if (oldStatus !== 'paid' && status === 'paid') {
      const payId = `pay-water-man-${Date.now()}`;
      db.payments.push({
        id: payId,
        tenant_id: contrib.tenant_id,
        amount: contrib.amount,
        payment_type: 'water',
        payment_method: 'manual',
        paystack_reference: `MAN_WA_${contrib.id.substring(0, 10)}`,
        status: 'confirmed',
        confirmed_by: caller.id,
        note: `Admin marked water month ${contrib.month} as Paid (Manual cash)`,
        created_at: new Date().toISOString()
      });
      contrib.payment_id = payId;
    }

    await saveDb(db);

    return NextResponse.json({ 
      success: true, 
      message: `Adjusted water log status to ${status}.`,
      contribution: contrib
    });

  } catch (err: any) {
    console.error('Error patching water status:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
