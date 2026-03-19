import { NextRequest, NextResponse } from 'next/server'
import { sql, addUserSitesTable } from '@/lib/db'
import { getUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try { await addUserSitesTable() } catch {}

  const users = await sql`
    SELECT u.id, u.username, u.full_name, u.role, u.site_id, u.created_at,
      s.name as site_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', s2.id, 'name', s2.name))
         FROM user_sites us2 JOIN sites s2 ON us2.site_id = s2.id
         WHERE us2.user_id = u.id),
        '[]'::json
      ) as sites_json
    FROM users u
    LEFT JOIN sites s ON u.site_id = s.id
    WHERE u.id != ${user.id}
    ORDER BY u.role, u.created_at DESC
  `

  // Enrich with site arrays
  const enriched = users.map((u: any) => ({
    ...u,
    site_ids: (u.sites_json || []).map((s: any) => s.id),
    site_names: (u.sites_json || []).map((s: any) => s.name),
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, password, full_name, site_ids = [], role = 'manager' } = await req.json()
  if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const existing = await sql`SELECT id FROM users WHERE username = ${username.trim()}`
  if (existing.length > 0) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  const primarySiteId = site_ids[0] || null

  const [newUser] = await sql`
    INSERT INTO users (username, password_hash, full_name, role, site_id)
    VALUES (${username.trim()}, ${hash}, ${full_name || null}, ${role}, ${primarySiteId})
    RETURNING id, username, full_name, role, site_id, created_at
  `

  try { await addUserSitesTable() } catch {}

  if (site_ids.length > 0) {
    for (const siteId of site_ids) {
      await sql`INSERT INTO user_sites (user_id, site_id) VALUES (${newUser.id}, ${siteId}) ON CONFLICT DO NOTHING`
    }
  }

  return NextResponse.json(newUser, { status: 201 })
}
