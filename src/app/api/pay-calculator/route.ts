import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')
  const siteId     = searchParams.get('site_id')
  const contractor = searchParams.get('contractor')

  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

  const safe = (s: string) => s.replace(/'/g, "''")
  const baseWhere = `entry_date BETWEEN '${safe(from)}'::date AND '${safe(to)}'::date`
  const siteFilter = siteId ? `AND site_id = ${parseInt(siteId)}` : ''
  const contractorFilter = contractor ? `AND contractor_name ILIKE '%${safe(contractor)}%'` : ''
  const fullWhere = `${baseWhere} ${siteFilter} ${contractorFilter}`

  // Main totals including OT columns (with fallback for old DBs without OT columns)
  const [totals] = await query(`
    SELECT
      COALESCE(SUM(mason_count),0)        as total_mason,
      COALESCE(SUM(helper_count),0)       as total_helper,
      COALESCE(SUM(women_helper_count),0) as total_women,
      COALESCE(SUM(payment_amount),0)     as total_paid,
      COALESCE(SUM(advance_amount),0)     as total_advance,
      COUNT(*)                            as total_entries,
      COALESCE(SUM(COALESCE(mason_ot_count,0)),0)   as total_mason_ot_count,
      COALESCE(SUM(COALESCE(mason_ot_hours,0)),0)   as total_mason_ot_hours,
      COALESCE(SUM(COALESCE(helper_ot_count,0)),0)  as total_helper_ot_count,
      COALESCE(SUM(COALESCE(helper_ot_hours,0)),0)  as total_helper_ot_hours,
      COALESCE(SUM(COALESCE(women_ot_count,0)),0)   as total_women_ot_count,
      COALESCE(SUM(COALESCE(women_ot_hours,0)),0)   as total_women_ot_hours
    FROM labour_entries WHERE ${fullWhere}
  `)

  const bySite = await query(`
    SELECT s.id, s.name as site_name,
      COALESCE(SUM(e.mason_count),0)        as mason_days,
      COALESCE(SUM(e.helper_count),0)       as helper_days,
      COALESCE(SUM(e.women_helper_count),0) as women_days,
      COALESCE(SUM(e.payment_amount),0)     as actual_paid,
      COALESCE(SUM(e.advance_amount),0)     as advance_paid,
      COALESCE(SUM(COALESCE(e.mason_ot_count,0)*COALESCE(e.mason_ot_hours,0)),0)  as mason_ot_total,
      COALESCE(SUM(COALESCE(e.helper_ot_count,0)*COALESCE(e.helper_ot_hours,0)),0) as helper_ot_total,
      COALESCE(SUM(COALESCE(e.women_ot_count,0)*COALESCE(e.women_ot_hours,0)),0)  as women_ot_total
    FROM sites s
    LEFT JOIN labour_entries e ON e.site_id = s.id AND ${fullWhere}
    WHERE s.is_active = true ${siteId ? `AND s.id = ${parseInt(siteId)}` : ''}
    GROUP BY s.id, s.name
    HAVING COALESCE(SUM(e.mason_count),0)+COALESCE(SUM(e.helper_count),0)+COALESCE(SUM(e.women_helper_count),0) > 0
    ORDER BY (COALESCE(SUM(e.mason_count),0)+COALESCE(SUM(e.helper_count),0)) DESC
  `)

  const byContractor = await query(`
    SELECT
      COALESCE(e.contractor_name,'Unknown') as contractor_name,
      s.name as site_name, s.id as site_id,
      COALESCE(SUM(e.mason_count),0)        as mason_days,
      COALESCE(SUM(e.helper_count),0)       as helper_days,
      COALESCE(SUM(e.women_helper_count),0) as women_days,
      COALESCE(SUM(e.payment_amount),0)     as actual_paid,
      COALESCE(SUM(e.advance_amount),0)     as advance_paid,
      COALESCE(SUM(COALESCE(e.mason_ot_count,0)*COALESCE(e.mason_ot_hours,0)),0)  as mason_ot_total,
      COALESCE(SUM(COALESCE(e.helper_ot_count,0)*COALESCE(e.helper_ot_hours,0)),0) as helper_ot_total,
      COALESCE(SUM(COALESCE(e.women_ot_count,0)*COALESCE(e.women_ot_hours,0)),0)  as women_ot_total
    FROM labour_entries e
    JOIN sites s ON e.site_id = s.id
    WHERE ${fullWhere}
    GROUP BY e.contractor_name, s.name, s.id
    ORDER BY (SUM(e.mason_count)+SUM(e.helper_count)+SUM(e.women_helper_count)) DESC
  `)

  const contractors = await query(`
    SELECT DISTINCT COALESCE(contractor_name,'Unknown') as contractor_name
    FROM labour_entries WHERE ${fullWhere} ORDER BY contractor_name
  `)

  return NextResponse.json({ totals, bySite, byContractor, contractors })
}
