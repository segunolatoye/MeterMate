import { NextRequest, NextResponse } from 'next/server';
import { clearSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await clearSessionUser();
    return NextResponse.json({ success: true, message: 'Session terminated successfully.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ message: 'Internal server error during logout.' }, { status: 500 });
  }
}
