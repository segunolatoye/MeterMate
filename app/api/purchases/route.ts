import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { TokenPurchase } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Only admins can register token purchases.' }, { status: 401 });
    }

    const { tenant_id, date, amount_paid, units_received, token_ref } = await req.json();

    if (!tenant_id || !date || !amount_paid || !units_received || !token_ref) {
      return NextResponse.json({ message: 'Required fields missing: tenant_id, date, amount_paid, units_received, token_ref' }, { status: 400 });
    }

    const db = await getDb();
    const tenant = db.profiles.find(p => p.id === tenant_id);
    if (!tenant) {
      return NextResponse.json({ message: 'Target tenant profile not found.' }, { status: 404 });
    }

    const numAmount = Number(amount_paid);
    const numUnits = Number(units_received);
    const rate_at_time = numUnits > 0 ? numAmount / numUnits : 120; // Auto-calculated!

    const purchaseId = `purchase-${Date.now()}`;
    const newPurchase: TokenPurchase = {
      id: purchaseId,
      tenant_id,
      date,
      amount_paid: numAmount,
      units_received: numUnits,
      rate_at_time,
      token_ref: token_ref.trim(),
      created_by: caller.id,
      created_at: new Date().toISOString()
    };

    // Log the token purchase
    db.token_purchases.push(newPurchase);

    // Also register a confirmed matching payment log in the ledger so balances stay consistent
    db.payments.push({
      id: `pay-tok-${Date.now()}`,
      tenant_id,
      amount: numAmount,
      payment_type: 'electricity',
      payment_method: 'manual',
      paystack_reference: `TOK_REF_${token_ref.trim().replace(/\s+/g, '')}`,
      status: 'confirmed',
      confirmed_by: caller.id,
      note: `Confirmed Token Purchase: ${numUnits} kWh (Token: ${token_ref})`,
      created_at: new Date(date).toISOString() // alignment
    });

    await saveDb(db);

    return NextResponse.json({ success: true, purchase: newPurchase });

  } catch (err: any) {
    console.error('Error logging purchase:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
