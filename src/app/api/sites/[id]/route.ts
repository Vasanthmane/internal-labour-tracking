import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, is_active } = await req.json()
  const result = await sql`
    UPDATE sites SET
      name = COALESCE(${name || null}, name),
      description = COALESCE(${description !== undefined ? description : null}, description),
      is_active = COALESCE(${is_active !== undefined ? is_active : null}, is_active)
    WHERE id = ${params.id}
    RETURNING *
  `
  return NextResponse.json(result[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await sql`DELETE FROM sites WHERE id = ${params.id}`
  return NextResponse.json({ success: true })
}
