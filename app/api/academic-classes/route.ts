import { NextRequest, NextResponse } from 'next/server'
import serverClient from '@/sanity/lib/serverClient'

export async function GET(req: NextRequest) {
  try {
    const query = `*[_type == "academicClass"] | order(order asc)`
    const data = await serverClient.fetch(query)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('Fetch classes error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to fetch classes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Server is missing SANITY_API_WRITE_TOKEN' }, { status: 500 })
    }
    const body = await req.json()
    const { name, code, group, monthlyFee, admissionFeeNew, admissionFeeOld, annualFee, order, isPopular } = body

    if (!name || !code || typeof monthlyFee !== 'number' || typeof admissionFeeNew !== 'number' || typeof admissionFeeOld !== 'number') {
      return NextResponse.json({ ok: false, error: 'Name, code, monthlyFee, admissionFeeNew, and admissionFeeOld are required' }, { status: 400 })
    }

    const doc = {
      _type: 'academicClass',
      name,
      code,
      group: group || 'General',
      monthlyFee,
      admissionFeeNew,
      admissionFeeOld,
      annualFee: annualFee || 0,
      order: order || 0,
      isPopular: isPopular || false
    }

    const created = await serverClient.create(doc)
    return NextResponse.json({ ok: true, action: 'created', id: created._id, data: created })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to create class' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Server is missing SANITY_API_WRITE_TOKEN' }, { status: 500 })
    }
    const body = await req.json()
    const { id, patch } = body
    if (!id || !patch) {
      return NextResponse.json({ ok: false, error: 'id and patch are required' }, { status: 400 })
    }

    const res = await serverClient.patch(id).set(patch).commit()
    return NextResponse.json({ ok: true, res })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to update class' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Server is missing SANITY_API_WRITE_TOKEN' }, { status: 500 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })
    }
    const res = await serverClient.delete(id)
    return NextResponse.json({ ok: true, res })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to delete class' }, { status: 500 })
  }
}
