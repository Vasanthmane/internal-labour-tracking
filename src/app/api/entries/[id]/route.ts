import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

// Check if a site incharge can still edit this entry (within 24 hours)
function canManagerEdit(entry: any): boolean {
  const created = new Date(entry.created_at)
  const now = new Date()
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch current entry to check ownership and time
  const existing = await sql`SELECT * FROM labour_entries WHERE id = ${params.id}`
  if (existing.length === 0) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const entry = existing[0]

  // Site incharge restriction: only own entries within 24 hours
  if (user.role === 'manager') {
    if (entry.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own entries' }, { status: 403 })
    }
    if (!canManagerEdit(entry)) {
      return NextResponse.json({ error: 'Entries can only be edited within 24 hours of creation' }, { status: 403 })
    }
  }

  const body = await req.json()
  const {
    entry_date, location, contractor_name,
    mason_count, helper_count, women_helper_count,
    mason_ot_count, mason_ot_hours,
    helper_ot_count, helper_ot_hours,
    women_ot_count, women_ot_hours,
    ot_details, payment_amount, advance_amount, remarks
  } = body

  const result = await sql`
    UPDATE labour_entries SET
      entry_date         = COALESCE(${entry_date || null}::date, entry_date),
      location           = ${location || null},
      contractor_name    = ${contractor_name || null},
      mason_count        = COALESCE(${mason_count !== undefined ? mason_count : null}, mason_count),
      helper_count       = COALESCE(${helper_count !== undefined ? helper_count : null}, helper_count),
      women_helper_count = COALESCE(${women_helper_count !== undefined ? women_helper_count : null}, women_helper_count),
      mason_ot_count     = COALESCE(${mason_ot_count !== undefined ? mason_ot_count : null}, COALESCE(mason_ot_count, 0)),
      mason_ot_hours     = COALESCE(${mason_ot_hours !== undefined ? mason_ot_hours : null}, COALESCE(mason_ot_hours, 0)),
      helper_ot_count    = COALESCE(${helper_ot_count !== undefined ? helper_ot_count : null}, COALESCE(helper_ot_count, 0)),
      helper_ot_hours    = COALESCE(${helper_ot_hours !== undefined ? helper_ot_hours : null}, COALESCE(helper_ot_hours, 0)),
      women_ot_count     = COALESCE(${women_ot_count !== undefined ? women_ot_count : null}, COALESCE(women_ot_count, 0)),
      women_ot_hours     = COALESCE(${women_ot_hours !== undefined ? women_ot_hours : null}, COALESCE(women_ot_hours, 0)),
      ot_details         = ${ot_details || null},
      payment_amount     = COALESCE(${payment_amount !== undefined ? payment_amount : null}, payment_amount),
      advance_amount     = COALESCE(${advance_amount !== undefined ? advance_amount : null}, advance_amount),
      remarks            = ${remarks || null}
    WHERE id = ${params.id}
    RETURNING *
  `
  return NextResponse.json(result[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch entry
  const existing = await sql`SELECT * FROM labour_entries WHERE id = ${params.id}`
  if (existing.length === 0) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const entry = existing[0]

  // Site incharge restriction
  if (user.role === 'manager') {
    if (entry.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own entries' }, { status: 403 })
    }
    if (!canManagerEdit(entry)) {
      return NextResponse.json({ error: 'Entries can only be deleted within 24 hours of creation' }, { status: 403 })
    }
  }

  await sql`DELETE FROM labour_entries WHERE id = ${params.id}`
  return NextResponse.json({ success: true })
}
