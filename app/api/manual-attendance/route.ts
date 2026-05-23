import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Manual Attendance API
 *
 * We store records directly in Firestore from the client (via the component),
 * but expose a lightweight server endpoint for any future server-side reporting.
 *
 * For now, GET/POST is handled directly on the client using the firebase SDK
 * (same pattern as AdminMobileAttendance). This route acts as a health-check
 * and can be extended to generate server-side Excel exports later.
 */

export async function GET(request: Request) {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    return NextResponse.json({ ok: true, message: 'Manual Attendance API is active.' });
}

export async function POST(request: Request) {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    try {
        const body = await request.json();
        if (!body.month || !body.klass || !body.session) {
            return NextResponse.json({ ok: false, error: 'month, klass and session are required' }, { status: 400 });
        }
        // Actual write happens client-side via Firestore SDK (same as mobile attendance).
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
