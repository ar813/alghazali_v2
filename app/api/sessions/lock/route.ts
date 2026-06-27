import { NextRequest, NextResponse } from 'next/server';
import serverClient from '@/sanity/lib/serverClient';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';
import { dbAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// GET — fetch all locked sessions
export async function GET(_req: NextRequest) {
    try {
        const query = `*[_type == "sessionMeta" && locked == true].sessionName`;
        const locked: string[] = await serverClient.fetch(query);
        return NextResponse.json({ ok: true, locked: locked || [] });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

// POST — toggle lock on a session (super-admin only)
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        // Only super-admin can lock/unlock
        const uid = user.localId || user.uid;
        const userDoc = await dbAdmin.collection('users').doc(uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'super_admin') {
            return NextResponse.json({ ok: false, error: 'Super Admin access required.' }, { status: 403 });
        }

        const { sessionName, locked } = await req.json();
        if (!sessionName || typeof locked !== 'boolean') {
            return NextResponse.json({ ok: false, error: 'sessionName and locked (boolean) are required.' }, { status: 400 });
        }

        // Find sessionMeta doc, create if it doesn't exist
        const metaQuery = `*[_type == "sessionMeta" && sessionName == $sessionName][0]._id`;
        let docId: string | null = await serverClient.fetch(metaQuery, { sessionName });

        if (!docId) {
            // Auto-create the sessionMeta doc so we can lock it
            const newDoc = {
                _type: 'sessionMeta',
                _id: `session-${sessionName.replace(/[^a-zA-Z0-9-]/g, '-')}`,
                sessionName,
                createdAt: new Date().toISOString(),
                createdBy: uid,
            };
            const created = await serverClient.createOrReplace(newDoc);
            docId = created._id;
        }

        await serverClient.patch(docId).set({ locked }).commit();

        return NextResponse.json({ ok: true, sessionName, locked });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
