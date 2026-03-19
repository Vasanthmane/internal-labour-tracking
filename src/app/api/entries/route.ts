import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId    = searchParams.get('site_id')
  const from      = searchParams.get('from')
  const to        = searchParams.get('to')
  const search    = searchParams.get('search')
  const createdBy = searchParams.get('created_by')
  const limit     = parseInt(searchParams.get('limit') || '200')

  if (user.role === 'admin') {
    const conditions: string[] = ['1=1']
    const params: any[] = []

    if (siteId)    { params.push(parseInt(siteId));    conditions.push(`e.site_id = $${params.length}`) }
    if (from)      { params.push(from);                conditions.push(`e.entry_date >= $${params.length}::date`) }
    if (to)        { params.push(to);                  conditions.push(`e.entry_date <= $${params.length}::date`) }
    if (createdBy) { params.push(parseInt(createdBy)); conditions.push(`e.created_by = $${params.length}`) }
    if (search) {
      params.push(`%${search}%`)
      const p = params.length
      conditions.push(`(e.contractor_name ILIKE $${p} OR e.location ILIKE $${p} OR s.name ILIKE $${p} OR e.remarks ILIKE $${p})`)
    }

    params.push(limit)
    const entries = await sql(
      `SELECT e.*, s.name as site_name, u.username as created_by_username, u.full_name as created_by_name
       FROM labour_entries e
       JOIN sites s ON e.site_id = s.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.entry_date DESC, e.created_at DESC
       LIMIT $${params.length}`,
      params
    )
    return NextResponse.json(entries)
  } else {
    const conditions: string[] = [`e.site_id = $1`]
    const params: any[] = [user.siteId]

    if (from)   { params.push(from); conditions.push(`e.entry_date >= $${params.length}::date`) }
    if (to)     { params.push(to);   conditions.push(`e.entry_date <= $${params.length}::date`) }
    if (search) {
      params.push(`%${search}%`)
      const p = params.length
      conditions.push(`(e.contractor_name ILIKE $${p} OR e.location ILIKE $${p} OR e.remarks ILIKE $${p})`)
    }

    params.push(limit)
    const entries = await sql(
      `SELECT e.*, s.name as site_name, u.username as created_by_username
       FROM labour_entries e
       JOIN sites s ON e.site_id = s.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.entry_date DESC, e.created_at DESC
       LIMIT $${params.length}`,
      params
    )
    return NextResponse.json(entries)
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    site_id, entry_date, location, contractor_name,
    mason_count, helper_count, women_helper_count,
    mason_ot_count, mason_ot_hours,
    helper_ot_count, helper_ot_hours,
    women_ot_count, women_ot_hours,
    ot_details, payment_amount, advance_amount, remarks
  } = body

  const effectiveSiteId = user.role === 'admin' ? site_id : user.siteId
  if (!effectiveSiteId) return NextResponse.json({ error: 'No site assigned' }, { status: 400 })
  if (!entry_date) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  const result = await sql`
    INSERT INTO labour_entries (
      site_id, entry_date, location, contractor_name,
      mason_count, helper_count, women_helper_count,
      mason_ot_count, mason_ot_hours,
      helper_ot_count, helper_ot_hours,
      women_ot_count, women_ot_hours,
      ot_details, payment_amount, advance_amount, remarks, created_by
    ) VALUES (
      ${effectiveSiteId}, ${entry_date}::date, ${location || null}, ${contractor_name || null},
      ${mason_count || 0}, ${helper_count || 0}, ${women_helper_count || 0},
      ${mason_ot_count || 0}, ${mason_ot_hours || 0},
      ${helper_ot_count || 0}, ${helper_ot_hours || 0},
      ${women_ot_count || 0}, ${women_ot_hours || 0},
      ${ot_details || null}, ${payment_amount || 0}, ${advance_amount || 0},
      ${remarks || null}, ${user.id}
    )
    RETURNING *
  `
  return NextResponse.json(result[0], { status: 201 })
}
