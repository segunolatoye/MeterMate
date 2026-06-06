import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getTenantSummary } from '@/lib/calculations';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const { tenant_id, target_utility, amount } = await req.json();

    if (!tenant_id || !target_utility || !amount || amount <= 0) {
      return NextResponse.json({ message: 'Missing required parameters or invalid amount.' }, { status: 400 });
    }

    // Only allow caller to apply their own deposit, unless caller is admin
    if (caller.role !== 'admin' && caller.id !== tenant_id) {
      return NextResponse.json({ message: 'Forbidden. You do not have permission to apply this deposit.' }, { status: 403 });
    }

    const db = await getDb();
    const summary = getTenantSummary(db, tenant_id);

    if (!summary) {
      return NextResponse.json({ message: 'Tenant profile or summary not found.' }, { status: 404 });
    }

    const { depositHeld, electricityBalance, outstandingWaterAmount } = summary;

    if (amount > depositHeld) {
      return NextResponse.json({ message: `Insufficient escrow deposit. You only have ₦${depositHeld.toLocaleString()} held in escrow.` }, { status: 400 });
    }

    // Settle target utilities
    const transactionId = `txn-applied-${Date.now()}`;
    const depositDebitId = `dep-debit-${Date.now()}`;
    const paymentId = `pay-applied-${Date.now()}`;

    // 1. Create a negative deposit record to reduce held escrow
    db.deposits.push({
      id: depositDebitId,
      tenant_id,
      amount: -amount,
      refunded: false,
      note: `Applied ₦${amount.toLocaleString()} to settle ${target_utility}`,
      created_at: new Date().toISOString()
    });

    // Also decrement deposit_amount field in the tenant profile
    const profile = db.profiles.find(p => p.id === tenant_id);
    if (profile) {
      profile.deposit_amount = Math.max(0, (Number(profile.deposit_amount) || 0) - amount);
    }

    // 2. Create a fully confirmed payment of target utility using applied deposit
    db.payments.push({
      id: paymentId,
      tenant_id,
      amount: amount,
      payment_type: target_utility === 'water' ? 'water' : 'electricity',
      payment_method: 'manual',
      paystack_reference: `DEP_DRAWDOWN_${Date.now()}`,
      status: 'confirmed',
      confirmed_by: caller.id,
      note: `Paid using ₦${amount.toLocaleString()} from Escrow Deposit`,
      created_at: new Date().toISOString()
    });

    // 3. Reconcile specific utility balances
    if (target_utility === 'water') {
      // Settle oldest pending water contributions incrementally up to the applied amount
      let waterRemainingToPay = amount;
      const pendingWaterList = db.water_contributions
        .filter(wc => wc.tenant_id === tenant_id && wc.status === 'pending')
        .sort((a, b) => a.month.localeCompare(b.month)); // Oldest first

      for (const wc of pendingWaterList) {
        if (waterRemainingToPay >= wc.amount) {
          const targetWc = db.water_contributions.find(row => row.id === wc.id);
          if (targetWc) {
            targetWc.status = 'paid';
            targetWc.payment_id = paymentId;
            waterRemainingToPay -= wc.amount;
          }
        } else {
          break;
        }
      }
    } else {
      // For electricity: since electricity balance is simple totalPayments - amountOwed,
      // adding the confirmed purchase / prepayment payment (which we did in step 2)
      // naturally offsets electricity arrears and raises electricityBalance.
    }

    await saveDb(db);

    // 4. Create internal notification
    try {
      const notifyBody = `Applied ₦${amount.toLocaleString()} from your held Escrow Deposit to clear your outstanding ${target_utility} balance.`;
      const notificationId = 'notif_dep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      await setDoc(doc(firestoreDb, 'notifications', notificationId), {
        id: notificationId,
        title: 'Escrow Deposit Applied! 💼',
        body: notifyBody,
        url: '/dashboard',
        created_at: new Date().toISOString(),
        sender_id: caller.id,
        target: tenant_id
      });
    } catch (notifErr) {
      console.error('Failed to log deposit notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied ₦${amount.toLocaleString()} from deposit to settle ${target_utility} compliance.`,
      appliedAmount: amount
    });
  } catch (err: any) {
    console.error('Error applying deposit:', err);
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
