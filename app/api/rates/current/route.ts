import { NextRequest, NextResponse } from 'next/server';
import { getCurrentRate } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const caller = await getSessionUser();
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized session.' }, { status: 401 });
    }

    const currentRate = getCurrentRate();
    return NextResponse.json({ success: true, rate: currentRate });
  } catch (err: any) {
    console.error('Error fetching current rate:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
