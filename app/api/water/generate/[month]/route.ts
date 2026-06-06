import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { WaterContribution } from '@/lib/types';

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
    
    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ message: 'Validation Error: Month must be in YYYY-MM format.' }, { status: 400 });
    }

    const db = await getDb();
    const eligibleTenants = db.profiles.filter(
      p => p.role === 'electricity_tenant' || p.role === 'water_only_tenant'
    );

    let generatedCount = 0;
    let skippedCount = 0;

    eligibleTenants.forEach(tenant => {
      const exists = db.water_contributions.some(
        wc => wc.tenant_id === tenant.id && wc.month === month
      );

      if (!exists) {
        const newContrib: WaterContribution = {
          id: `water-${Date.now()}-${tenant.id}-${month}`,
          tenant_id: tenant.id,
          month,
          amount: 3000,
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
      await saveDb(db);
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
