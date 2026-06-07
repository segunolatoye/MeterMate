import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, getCurrentRate, db as firestoreDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';


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
    const { action } = await req.json(); // e.g. "confirm" or "reject"

    const db = await getDb();
    const payment = db.payments.find(p => p.id === id);

    if (!payment) {
      return NextResponse.json({ message: 'Target payment record not found.' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ message: 'This payment has already been audited or resolved.' }, { status: 400 });
    }

    if (action === 'reject') {
      payment.status = 'failed';
      payment.note = `${payment.note} | Rejected by Admin (${caller.full_name})`;
      await saveDb(db);
      return NextResponse.json({ success: true, message: 'Transfer receipt rejected.', payment });
    }

    // Action is Confirm
    payment.status = 'confirmed';
    payment.confirmed_by = caller.id;
    payment.note = `${payment.note} | Confirmed by Admin (${caller.full_name})`;

    const pType = payment.payment_type;
    const tId = payment.tenant_id;

    // Apply ledger updates
    if (pType === 'water') {
      const oldestPendingWater = db.water_contributions
        .filter(wc => wc.tenant_id === tId && wc.status === 'pending')
        .sort((a, b) => a.month.localeCompare(b.month));

      let remainingAmount = payment.amount;
      for (const pending of oldestPendingWater) {
        if (remainingAmount >= pending.amount) {
          const targetWc = db.water_contributions.find(wc => wc.id === pending.id);
          if (targetWc) {
            targetWc.status = 'paid';
            targetWc.payment_id = payment.id;
            remainingAmount -= pending.amount;
          }
        }
      }

      if (remainingAmount > 0) {
        // Push remainder to escrow
        const depId = `dep-${Date.now()}`;
        db.deposits.push({
          id: depId,
          tenant_id: tId,
          amount: remainingAmount,
          refunded: false,
          note: `Auto-credited excess water payment overage`,
          created_at: new Date().toISOString()
        });
        
        const tenantProf = db.profiles.find(p => p.id === tId);
        if (tenantProf) {
          tenantProf.deposit_amount = (Number(tenantProf.deposit_amount) || 0) + remainingAmount;
        }
      }
    } 
    else if (pType === 'deposit') {
      db.deposits.push({
        id: `dep-${Date.now()}`,
        tenant_id: tId,
        amount: payment.amount,
        refunded: false,
        note: `Manual confirmed bank transfer deposit`,
        created_at: new Date().toISOString()
      });

      const tenantProf = db.profiles.find(p => p.id === tId);
      if (tenantProf) {
        tenantProf.deposit_amount = (Number(tenantProf.deposit_amount) || 0) + payment.amount;
      }
    } 
    else if (pType === 'electricity' || pType === 'prepayment') {
      const currentRate = await getCurrentRate();
      const unitsReceived = payment.amount / currentRate;

      db.token_purchases.push({
        id: `purchase-auto-tran-${Date.now()}`,
        tenant_id: tId,
        date: new Date().toISOString().split('T')[0],
        amount_paid: payment.amount,
        units_received: unitsReceived,
        rate_at_time: currentRate,
        token_ref: 'AUTO-CREDIT',
        created_by: caller.id,
        created_at: new Date().toISOString()
      });

      payment.note = `${payment.note} | Prepaid Electricity: ${unitsReceived.toFixed(1)} kWh`;
    }

    await saveDb(db);

    // Notify the tenant about their confirmed payment
    try {
      const typeLabel = pType === 'electricity' ? 'electricity' : pType === 'water' ? 'water levy' : pType === 'deposit' ? 'deposit' : 'prepayment';
      let notifyBody = `Your payment of ₦${payment.amount.toLocaleString()} for ${typeLabel} has been confirmed.`;
      if (pType === 'electricity' || pType === 'prepayment') {
        notifyBody += ' Your prepaid electricity balance has been credited!';
      } else if (pType === 'water') {
        notifyBody += ' Your water contribution has been updated to Paid.';
      }

      await notifyUser(tId, {
        title: 'Payment Confirmed! ✅',
        body: notifyBody,
        url: '/dashboard'
      });

      // Save notification to historical logs
      const notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      await firestoreDb.collection('notifications').doc(notificationId).set({
        id: notificationId,
        title: 'Payment Confirmed! ✅',
        body: notifyBody,
        url: '/dashboard',
        created_at: new Date().toISOString(),
        sender_id: caller.id,
        target: tId
      });
    } catch (notifyErr) {
      console.error('Failed to dispatch payment confirmation notification:', notifyErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Transfer payment has been audited, confirmed, and utilities adjusted.', 
      payment 
    });

  } catch (err: any) {
    console.error('Error confirming payment:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
