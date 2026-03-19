import { NextRequest, NextResponse } from 'next/server'
import { sql, addUserSitesTable } from '@/lib/db'
import { getUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, site_ids, password, role } = await req.json()

  if (password) {
    const hash = await bcrypt.hash(password, 12)
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${params.id}`
  }

  const primarySiteId = site_ids && site_ids.length > 0 ? site_ids[0] : null

  const [updated] = await sql`
    UPDATE users SET
      full_name = COALESCE(${full_name || null}, full_name),
      site_id = ${primarySiteId},
      role = COALESCE(${role || null}, role)
    WHERE id = ${params.id}
    RETURNING id, username, full_name, role, site_id, created_at
  `

  try { await addUserSitesTable() } catch {}

  if (site_ids !== undefined) {
    await sql`DELETE FROM user_sites WHERE user_id = ${params.id}`
    for (const siteId of (site_ids || [])) {
      await sql`INSERT INTO user_sites (user_id, site_id) VALUES (${params.id}, ${siteId}) ON CONFLICT DO NOTHING`
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (String(user.id) === params.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  await sql`DELETE FROM users WHERE id = ${params.id}`
  return NextResponse.json({ success: true })
}
