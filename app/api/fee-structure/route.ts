import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from '@/sanity/env'

const token = process.env.SANITY_API_WRITE_TOKEN

if (!token) {
  console.warn('SANITY_API_WRITE_TOKEN is not set. Write requests to /api/fee-structure will fail.')
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

// GET — Fetch all fee structures
export async function GET() {
  try {
    const data = await client.fetch(
      `*[_type == "feeStructure"] | order(order asc) {
        _id,
        classGroup,
        classesIncluded,
        classCodes,
        admissionFee,
        monthlyTuition,
        annualCharges,
        order
      }`
    )
    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('Fee structure GET error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST — Create a new fee structure
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { classGroup, classesIncluded, classCodes, admissionFee, monthlyTuition, annualCharges, order } = body

    if (!classGroup || admissionFee == null || monthlyTuition == null) {
      return NextResponse.json({ ok: false, error: 'classGroup, admissionFee, and monthlyTuition are required' }, { status: 400 })
    }

    const doc = {
      _type: 'feeStructure',
      classGroup,
      classesIncluded: classesIncluded || '',
      classCodes: classCodes || [],
      admissionFee: Number(admissionFee),
      monthlyTuition: Number(monthlyTuition),
      annualCharges: annualCharges ? Number(annualCharges) : undefined,
      order: order ? Number(order) : 0,
    }

    const result = await client.create(doc)
    return NextResponse.json({ ok: true, data: result })
  } catch (error: any) {
    console.error('Fee structure POST error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// PATCH — Update an existing fee structure
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, patch } = body

    if (!id || !patch) {
      return NextResponse.json({ ok: false, error: 'id and patch are required' }, { status: 400 })
    }

    // Build clean patch object
    const sanitizedPatch: Record<string, any> = {}
    if (patch.classGroup !== undefined) sanitizedPatch.classGroup = patch.classGroup
    if (patch.classesIncluded !== undefined) sanitizedPatch.classesIncluded = patch.classesIncluded
    if (patch.classCodes !== undefined) sanitizedPatch.classCodes = patch.classCodes
    if (patch.admissionFee !== undefined) sanitizedPatch.admissionFee = Number(patch.admissionFee)
    if (patch.monthlyTuition !== undefined) sanitizedPatch.monthlyTuition = Number(patch.monthlyTuition)
    if (patch.annualCharges !== undefined) sanitizedPatch.annualCharges = Number(patch.annualCharges)
    if (patch.order !== undefined) sanitizedPatch.order = Number(patch.order)

    const result = await client.patch(id).set(sanitizedPatch).commit()
    return NextResponse.json({ ok: true, data: result })
  } catch (error: any) {
    console.error('Fee structure PATCH error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// DELETE — Delete a fee structure
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })
    }

    await client.delete(id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Fee structure DELETE error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
