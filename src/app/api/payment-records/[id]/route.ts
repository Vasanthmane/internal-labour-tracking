import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { site_id, contractor_name, payment_date, payment_type, amount, notes } = await req.json()

  const result = await sql`
    UPDATE payment_records SET
      site_id         = COALESCE(${site_id || null}, site_id),
      contractor_name = ${contractor_name || null},
      payment_date    = COALESCE(${payment_date || null}::date, payment_date),
      payment_type    = COALESCE(${payment_type || null}, payment_type),
      amount          = COALESCE(${amount !== undefined ? amount : null}, amount),
      notes           = ${notes || null}
    WHERE id = ${params.id}
    RETURNING *
  `
  if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await sql`DELETE FROM payment_records WHERE id = ${params.id}`
  return NextResponse.json({ success: true })
}
