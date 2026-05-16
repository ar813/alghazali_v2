import { NextRequest, NextResponse } from 'next/server';
import serverClient from '@/sanity/lib/serverClient';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        const body = await req.json();
        const { sourceSession, targetSession, mapping, items } = body;

        // items is optional: Array<{ id: string, targetClass: string }>

        if (!sourceSession || !targetSession) {
            return NextResponse.json({ ok: false, error: 'sourceSession and targetSession are required' }, { status: 400 });
        }

        if (!items && (!mapping || typeof mapping !== 'object')) {
            return NextResponse.json({ ok: false, error: 'Either mapping or specific items are required' }, { status: 400 });
        }

        console.log(`[Promotion] Starting transfer from ${sourceSession} to ${targetSession}`);

        let totalCreated = 0;
        const transaction = serverClient.transaction();

        if (items && Array.isArray(items) && items.length > 0) {
            // --- Manual Mode: Specific Students ---
            console.log(`[Promotion] Processing ${items.length} specific students`);
            
            // Fetch students by IDs
            const ids = items.map(item => item.id);
            const students = await serverClient.fetch(`*[_type == "student" && _id in $ids]`, { ids });
            
            const itemMap = new Map(items.map(i => [i.id, i]));

            for (const student of students) {
                const item = itemMap.get(student._id);
                if (!item) continue;

                const newDoc = {
                    ...student,
                    _id: undefined,
                    session: targetSession,
                    admissionFor: item.targetClass,
                    rollNumber: item.rollNumber || student.rollNumber, // Support custom roll number
                };
                transaction.create(newDoc);
                totalCreated++;
            }
        } else {
            // --- Bulk Mode: Class Mapping ---
            const classesToTransfer = Object.keys(mapping);
            for (const fromClass of classesToTransfer) {
                const toClass = mapping[fromClass];
                if (!toClass) continue;

                const query = `*[_type == "student" && (session == $source || (!defined(session) && $source == "2025-2026")) && admissionFor == $cls]{
                    _id, _type, fullName, fatherName, fatherCnic, dob, rollNumber, grNumber, 
                    gender, nationality, medicalCondition, cnicOrBform, email, phoneNumber, 
                    whatsappNumber, address, formerEducation, previousInstitute, lastExamPercentage,
                    guardianName, guardianContact, guardianCnic, guardianRelation, photo,
                    issueDate, expiryDate
                }`;

                const students = await serverClient.fetch(query, { source: sourceSession, cls: fromClass });

                for (const student of students) {
                    const newDoc = {
                        ...student,
                        _id: undefined,
                        session: targetSession,
                        admissionFor: toClass,
                    };
                    transaction.create(newDoc);
                    totalCreated++;
                }
            }
        }

        if (totalCreated === 0) {
            return NextResponse.json({ ok: true, message: 'No students found to transfer', count: 0 });
        }

        await transaction.commit();

        return NextResponse.json({
            ok: true,
            message: `Successfully transferred ${totalCreated} students.`,
            count: totalCreated
        });

    } catch (error: any) {
        console.error('[Promotion API Error]:', error);
        return NextResponse.json({ ok: false, error: error.message || 'Failed to transfer students' }, { status: 500 });
    }
}
