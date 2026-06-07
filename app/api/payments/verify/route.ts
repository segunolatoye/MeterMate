import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, getCurrentRate } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { verifyPaystackTransaction } from '@/lib/paystack';

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
    const payment = db.payments.find(p => p.paystack_reference === reference);

    if (!payment) {
      return NextResponse.json({ message: 'Payment record not found for this reference.' }, { status: 404 });
    }

    if (payment.status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'Payment already verified previously.', payment });
    }

    // Call Paystack verification helper (test-friendly layout)
    const verification = await verifyPaystackTransaction(reference);

    if (verification.success) {
      payment.status = 'confirmed';
      payment.amount = verification.amountPaid; // Update with actual verified amount
      
      const pType = payment.payment_type;
      const tId = payment.tenant_id;

      if (pType === 'water') {
        const pendingWaterList = db.water_contributions
          .filter(wc => wc.tenant_id === tId && wc.status === 'pending')
          .sort((a, b) => a.month.localeCompare(b.month)); // Oldest first

        let remainingAmount = verification.amountPaid;

        for (const pending of pendingWaterList) {
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
        const depId = `dep-${Date.now()}`;
        db.deposits.push({
          id: depId,
          tenant_id: tId,
          amount: verification.amountPaid,
          refunded: false,
          note: `Card funded deposit top-up`,
          created_at: new Date().toISOString()
        });
        
        const tenantProf = db.profiles.find(p => p.id === tId);
        if (tenantProf) {
          tenantProf.deposit_amount = (Number(tenantProf.deposit_amount) || 0) + verification.amountPaid;
        }
      } 
      else if (pType === 'electricity' || pType === 'prepayment') {
        const currentRate = await getCurrentRate();
        const unitsReceived = verification.amountPaid / currentRate;

        db.token_purchases.push({
          id: `purchase-auto-${Date.now()}`,
          tenant_id: tId,
          date: new Date().toISOString().split('T')[0],
          amount_paid: verification.amountPaid,
          units_received: unitsReceived,
          rate_at_time: currentRate,
          token_ref: 'AUTO-CREDIT',
          created_by: 'system',
          created_at: new Date().toISOString()
        });

        payment.note = `Prepaid Electricity: ${unitsReceived.toFixed(1)} kWh`;
      }

      await saveDb(db);
      return NextResponse.json({ success: true, message: 'Transaction verified and reconciled successfully.', payment });
    }

    // Verification failed on Paystack
    payment.status = 'failed';
    await saveDb(db);

    return NextResponse.json({ 
      success: false, 
      message: verification.message || 'Verification rejected by billing gateway.', 
      payment 
    }, { status: 400 });

  } catch (err: any) {
    console.error('Error verifying payment:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
