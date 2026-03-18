import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, clearTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (user) {
      await logAudit({
        userId: user.userId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: user.userId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
    }

    const response = NextResponse.json({ success: true });
    return clearTokenCookie(response);
  } catch (err) {
    console.error('Logout error:', err);
    // Clear cookie even on error
    const response = NextResponse.json({ success: true });
    return clearTokenCookie(response);
  }
}
