import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, db as firestoreDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { WaterContribution } from '@/lib/types';
import { notifyAllOccupants } from '@/lib/notifications';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const caller = await getSessionUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    const { month } = await params; // e.g. "2026-06"
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount) || 3000;
    const deadline = body.deadline || '';
    
    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ message: 'Validation Error: Month must be in YYYY-MM format.' }, { status: 400 });
    }

    const db = await getDb();
    const eligibleTenants = db.profiles.filter(
      p => p.role === 'electricity_tenant' || p.role === 'water_only_tenant' || p.role === 'admin'
    );

    let generatedCount = 0;
    let skippedCount = 0;

    eligibleTenants.forEach(tenant => {
      const exists = db.water_contributions.some(
        wc => wc.tenant_id === tenant.id && wc.month === month
      );

      if (!exists) {
        const newContrib: WaterContribution = {
          id: `water_${tenant.id}_${month}`,
          tenant_id: tenant.id,
          month,
          amount,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        db.water_contributions.push(newContrib);
        generatedCount++;
      } else {
        skippedCount++;
      }
    });

    if (generatedCount > 0) {
      // Update global settings with the new notice
      let setting = db.settings.find(s => s.id === 'global_settings');
      if (!setting) {
        setting = { id: 'global_settings' };
        db.settings.push(setting);
      }

      // Safe month name format
      const parts = month.split('-');
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      setting.waterNoticeMessage = `Water Pump Levy of ₦${amount.toLocaleString('en-NG')} is due for ${monthLabel}.`;
      setting.waterNoticeDeadline = deadline;
      setting.updated_at = new Date().toISOString();

      await saveDb(db);

      // Notify all occupants about the new water levy
      try {
        const notifyBody = `The water levy of ₦${amount.toLocaleString('en-NG')} for ${monthLabel} has been posted. Please log in to complete your payment by ${deadline || 'the deadline'}.`;

        await notifyAllOccupants({
          title: 'New Water Levy Posted! 💧',
          body: notifyBody,
          url: '/dashboard'
        });

        // Save notification to historical logs
        const notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        await setDoc(doc(firestoreDb, 'notifications', notificationId), {
          id: notificationId,
          title: 'New Water Levy Posted! 💧',
          body: notifyBody,
          url: '/dashboard',
          created_at: new Date().toISOString(),
          sender_id: caller.id,
          target: 'all'
        });
      } catch (notifyErr) {
        console.error('Failed to notify occupants about new water levy:', notifyErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Completed water levy generation for ${month}.`,
      generatedCount,
      skippedCount
    });

  } catch (err: any) {
    console.error('Error generating water entries:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
