import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'admin') {
    const sites = await sql`
      SELECT s.*, 
        (SELECT COUNT(*) FROM users WHERE site_id = s.id AND role = 'manager') as manager_count,
        (SELECT COUNT(*) FROM labour_entries WHERE site_id = s.id) as entry_count,
        (SELECT SUM(mason_count + helper_count + women_helper_count) FROM labour_entries WHERE site_id = s.id AND entry_date = CURRENT_DATE) as workers_today
      FROM sites s
      ORDER BY s.created_at DESC
    `
    return NextResponse.json(sites)
  } else {
    const sites = await sql`SELECT * FROM sites WHERE id = ${user.siteId} AND is_active = true`
    return NextResponse.json(sites)
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const result = await sql`
    INSERT INTO sites (name, description) VALUES (${name.trim()}, ${description || null})
    RETURNING *
  `
  return NextResponse.json(result[0], { status: 201 })
}
