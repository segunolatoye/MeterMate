import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, getCurrentRate } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { tenant_id, amount, payment_type, note } = await req.json();

    if (!tenant_id || !amount || !payment_type) {
      return NextResponse.json({ message: 'Missing parameters: tenant_id, amount, payment_type' }, { status: 400 });
    }

    if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
      return NextResponse.json({ message: 'Payment amount must be a positive number.' }, { status: 400 });
    }

    const db = await getDb();
    const tenant = db.profiles.find(p => p.id === tenant_id);
    if (!tenant) {
      return NextResponse.json({ message: 'Target tenant profile not found.' }, { status: 404 });
    }

    const numAmount = Number(amount);
    const payId = `pay-man-${Date.now()}`;
    const ref = `MANUAL_CASH_${Date.now().toString().substring(5)}`;

    // Create confirmed manual payment
    db.payments.push({
      id: payId,
      tenant_id,
      amount: numAmount,
      payment_type: payment_type as 'electricity' | 'water' | 'deposit' | 'prepayment',
      payment_method: 'manual',
      paystack_reference: ref,
      status: 'confirmed',
      confirmed_by: caller.id,
      note: note || `Manual Cash Payment: ${payment_type}`,
      created_at: new Date().toISOString()
    });

    // Side-effects
    if (payment_type === 'water') {
      const oldestPending = db.water_contributions
        .filter(wc => wc.tenant_id === tenant_id && wc.status === 'pending')
        .sort((a, b) => a.month.localeCompare(b.month));

      let remainingAmount = numAmount;
      for (const pending of oldestPending) {
        if (remainingAmount >= pending.amount) {
          const targetWc = db.water_contributions.find(wc => wc.id === pending.id);
          if (targetWc) {
            targetWc.status = 'paid';
            targetWc.payment_id = payId;
            remainingAmount -= pending.amount;
          }
        }
      }

      if (remainingAmount > 0) {
        // Push remainder to escrow
        const depId = `dep-${Date.now()}`;
        db.deposits.push({
          id: depId,
          tenant_id,
          amount: remainingAmount,
          refunded: false,
          note: `Auto-credited excess water payment overage`,
          created_at: new Date().toISOString()
        });
        
        const tenantProf = db.profiles.find(p => p.id === tenant_id);
        if (tenantProf) {
          tenantProf.deposit_amount = (Number(tenantProf.deposit_amount) || 0) + remainingAmount;
        }
      }
    } 
    else if (payment_type === 'deposit') {
      db.deposits.push({
        id: `dep-${Date.now()}`,
        tenant_id,
        amount: numAmount,
        refunded: false,
        note: note || `Manual cash security deposit`,
        created_at: new Date().toISOString()
      });

      tenant.deposit_amount = (Number(tenant.deposit_amount) || 0) + numAmount;
    } 
    else if (payment_type === 'electricity' || payment_type === 'prepayment') {
      const currentRate = await getCurrentRate();
      const unitsReceived = numAmount / currentRate;

      db.token_purchases.push({
        id: `purchase-auto-man-${Date.now()}`,
        tenant_id,
        date: new Date().toISOString().split('T')[0],
        amount_paid: numAmount,
        units_received: unitsReceived,
        rate_at_time: currentRate,
        token_ref: 'AUTO-CREDIT',
        created_by: caller.id,
        created_at: new Date().toISOString()
      });
    }

    await saveDb(db);

    // Notify the tenant about the manual payment confirmation
    try {
      await notifyUser(tenant_id, {
        title: 'Payment Confirmed! ✅',
        body: `Your manual ${payment_type} payment of ₦${numAmount.toLocaleString('en-NG')} has been confirmed by the admin.`,
        url: '/dashboard'
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }

    return NextResponse.json({ success: true, message: 'Manual payment successfully logged and ledger updated.' });

  } catch (err: any) {
    console.error('Error logging manual payment:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 550 });
  }
}
