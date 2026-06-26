import { NextRequest, NextResponse } from 'next/server'
import serverClient from '@/sanity/lib/serverClient'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Server is missing SANITY_API_WRITE_TOKEN' }, { status: 500 })
    }

    const body = await req.json()
    const { month, year, session, dueDate } = body

    if (!month || !year || !session || !dueDate) {
      return NextResponse.json({ ok: false, error: 'Month, year, session, and due date are required' }, { status: 400 })
    }

    // 1. Fetch all academic classes
    const academicClasses = await serverClient.fetch(`*[_type == "academicClass"]`)
    
    // 2. Fetch all students in the session
    const students = await serverClient.fetch(`*[_type == "student" && session == $session]`, { session })

    if (!students.length) {
      return NextResponse.json({ ok: false, error: 'No students found for this session' }, { status: 404 })
    }

    // Fetch existing fees for this month/year/session to avoid duplicates
    const existingFees = await serverClient.fetch(
      `*[_type == "fee" && month == $month && year == $year && session == $session]{ "studentId": student._ref }`,
      { month, year, session }
    )
    const existingStudentIds = new Set(existingFees.map((f: any) => f.studentId))

    // Fetch all unpaid/partial fees to calculate arrears
    // We will sum (payableAmount - amountPaid) for each student's previous dues
    const pastUnpaidFees = await serverClient.fetch(
      `*[_type == "fee" && status in ["unpaid", "partial"] && session == $session && !(month == $month && year == $year)] {
         "studentId": student._ref,
         payableAmount,
         amountPaid
      }`,
      { session, month, year }
    )

    const arrearsByStudent: Record<string, number> = {}
    pastUnpaidFees.forEach((f: any) => {
      if (!f.studentId) return;
      const due = (f.payableAmount || 0) - (f.amountPaid || 0)
      if (due > 0) {
        arrearsByStudent[f.studentId] = (arrearsByStudent[f.studentId] || 0) + due
      }
    })

    let generatedCount = 0
    let skippedCount = 0

    let tx = serverClient.transaction()
    let txCount = 0

    for (const student of students) {
      if (existingStudentIds.has(student._id)) {
        skippedCount++
        continue
      }

      // Find academic class structure for student's class
      const structure = academicClasses.find((ac: any) => 
        ac.code === student.admissionFor
      )

      const monthlyTuition = structure?.monthlyFee || 0
      const concession = student.feeConcession || 0
      const arrears = arrearsByStudent[student._id] || 0
      
      const payableAmount = Math.max(0, monthlyTuition + arrears - concession)

      const doc = {
        _type: 'fee',
        student: { _type: 'reference', _ref: student._id },
        className: student.admissionFor,
        month,
        year,
        payableAmount,
        amountPaid: 0,
        status: 'unpaid',
        feeType: 'monthly',
        concession,
        arrears,
        lateFine: 0,
        dueDate,
        session
      }

      tx = tx.create(doc)
      txCount++
      generatedCount++

      // Sanity transactions have a limit of 100 mutations per transaction usually, so we batch them.
      if (txCount >= 50) {
        await tx.commit()
        tx = serverClient.transaction()
        txCount = 0
      }
    }

    if (txCount > 0) {
      await tx.commit()
    }

    return NextResponse.json({ 
      ok: true, 
      generated: generatedCount, 
      skipped: skippedCount 
    })

  } catch (err: any) {
    console.error('Fee generation error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to generate fees' }, { status: 500 })
  }
}
