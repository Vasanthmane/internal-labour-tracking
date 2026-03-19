import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS payment_records (
      id              SERIAL PRIMARY KEY,
      site_id         INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      contractor_name VARCHAR(200),
      payment_date    DATE NOT NULL,
      payment_type    VARCHAR(30) NOT NULL DEFAULT 'payment'
                      CHECK (payment_type IN ('payment','advance','ot_payment','adjustment')),
      amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes           TEXT,
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
}

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureTable()

  const { searchParams } = new URL(req.url)
  const siteId     = searchParams.get('site_id')
  const contractor = searchParams.get('contractor')
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')

  const conditions: string[] = ['1=1']
  const params: any[] = []

  if (siteId)     { params.push(parseInt(siteId)); conditions.push(`pr.site_id = $${params.length}`) }
  if (from)       { params.push(from); conditions.push(`pr.payment_date >= $${params.length}::date`) }
  if (to)         { params.push(to);   conditions.push(`pr.payment_date <= $${params.length}::date`) }
  if (contractor) {
    params.push(`%${contractor}%`)
    conditions.push(`pr.contractor_name ILIKE $${params.length}`)
  }

  const records = await sql(
    `SELECT pr.*, s.name as site_name, u.full_name as created_by_name
     FROM payment_records pr
     JOIN sites s ON pr.site_id = s.id
     LEFT JOIN users u ON pr.created_by = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pr.payment_date DESC, pr.created_at DESC`,
    params
  )

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureTable()

  const { site_id, contractor_name, payment_date, payment_type, amount, notes } = await req.json()
  if (!site_id || !payment_date || !amount) {
    return NextResponse.json({ error: 'site_id, payment_date, and amount are required' }, { status: 400 })
  }

  const result = await sql`
    INSERT INTO payment_records (site_id, contractor_name, payment_date, payment_type, amount, notes, created_by)
    VALUES (${site_id}, ${contractor_name || null}, ${payment_date}::date, ${payment_type || 'payment'}, ${amount}, ${notes || null}, ${user.id})
    RETURNING *
  `
  return NextResponse.json(result[0], { status: 201 })
}
