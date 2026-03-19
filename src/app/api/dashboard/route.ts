import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from =
    searchParams.get('from') ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
  const to =
    searchParams.get('to') || new Date().toISOString().split('T')[0]

  const siteId =
    user.role === 'manager' ? user.siteId?.toString() : searchParams.get('site_id')

  const parsedSiteId = siteId ? parseInt(siteId, 10) : null

  const eDateFilter = `e.entry_date BETWEEN '${from}'::date AND '${to}'::date`
  const eSiteFilter = parsedSiteId ? `AND e.site_id = ${parsedSiteId}` : ''

  const plainDateFilter = `entry_date BETWEEN '${from}'::date AND '${to}'::date`
  const plainSiteFilter = parsedSiteId ? `AND site_id = ${parsedSiteId}` : ''

  if (user.role === 'admin') {
    const totalsRows = await query(`
      SELECT
        (SELECT COUNT(*) FROM sites WHERE is_active = true) AS total_sites,
        (SELECT COUNT(*) FROM users WHERE role IN ('admin','manager')) AS total_users,
        COALESCE(SUM(e.mason_count + e.helper_count + e.women_helper_count)
          FILTER (WHERE e.entry_date = CURRENT_DATE ${eSiteFilter}), 0) AS workers_today,
        COALESCE(SUM(e.payment_amount)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}), 0) AS total_payment,
        COALESCE(SUM(e.advance_amount)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}), 0) AS total_advance,
        COALESCE(SUM(e.mason_count)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}), 0) AS total_mason,
        COALESCE(SUM(e.helper_count)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}), 0) AS total_helper,
        COALESCE(SUM(e.women_helper_count)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}), 0) AS total_women,
        COUNT(e.id)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}) AS total_entries,
        COUNT(DISTINCT e.site_id)
          FILTER (WHERE ${eDateFilter} ${eSiteFilter}) AS active_sites_period
      FROM labour_entries e
    `)

    const totals = totalsRows[0] || {
      total_sites: 0,
      total_users: 0,
      workers_today: 0,
      total_payment: 0,
      total_advance: 0,
      total_mason: 0,
      total_helper: 0,
      total_women: 0,
      total_entries: 0,
      active_sites_period: 0,
    }

    const silentSites = await query(`
      SELECT s.id, s.name
      FROM sites s
      WHERE s.is_active = true
        AND s.id NOT IN (
          SELECT DISTINCT site_id
          FROM labour_entries
          WHERE entry_date = CURRENT_DATE
        )
        ${parsedSiteId ? `AND s.id = ${parsedSiteId}` : ''}
      ORDER BY s.name
    `)

    const siteSummary = await query(`
      SELECT
        s.id,
        s.name,
        s.is_active,
        COALESCE(SUM(e.mason_count + e.helper_count + e.women_helper_count)
          FILTER (WHERE e.entry_date = CURRENT_DATE), 0) AS workers_today,
        COALESCE(SUM(e.mason_count)
          FILTER (WHERE ${eDateFilter}), 0) AS mason_days,
        COALESCE(SUM(e.helper_count)
          FILTER (WHERE ${eDateFilter}), 0) AS helper_days,
        COALESCE(SUM(e.women_helper_count)
          FILTER (WHERE ${eDateFilter}), 0) AS women_days,
        COALESCE(SUM(e.payment_amount)
          FILTER (WHERE ${eDateFilter}), 0) AS payment,
        COALESCE(SUM(e.advance_amount)
          FILTER (WHERE ${eDateFilter}), 0) AS advance,
        COUNT(e.id)
          FILTER (WHERE ${eDateFilter}) AS entry_count
      FROM sites s
      LEFT JOIN labour_entries e ON e.site_id = s.id
      WHERE s.is_active = true
        ${parsedSiteId ? `AND s.id = ${parsedSiteId}` : ''}
      GROUP BY s.id, s.name, s.is_active
      ORDER BY workers_today DESC, payment DESC
    `)

    const trend = await query(`
      SELECT
        entry_date::text AS date,
        SUM(mason_count + helper_count + women_helper_count) AS workers,
        SUM(payment_amount) AS payment
      FROM labour_entries
      WHERE entry_date >= CURRENT_DATE - INTERVAL '13 days'
        ${plainSiteFilter}
      GROUP BY entry_date
      ORDER BY entry_date
    `)

    const topContractors = await query(`
      SELECT
        contractor_name,
        SUM(mason_count) AS mason,
        SUM(helper_count) AS helper,
        SUM(women_helper_count) AS women,
        SUM(payment_amount) AS paid,
        SUM(advance_amount) AS advance,
        COUNT(*) AS entries
      FROM labour_entries
      WHERE ${plainDateFilter} ${plainSiteFilter}
        AND contractor_name IS NOT NULL
      GROUP BY contractor_name
      ORDER BY paid DESC
      LIMIT 5
    `)

    const recentEntries = await query(`
      SELECT
        e.*,
        s.name AS site_name,
        u.full_name AS by_name
      FROM labour_entries e
      JOIN sites s ON e.site_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE ${eDateFilter} ${eSiteFilter}
      ORDER BY e.created_at DESC
      LIMIT 8
    `)

    return NextResponse.json({
      totals,
      siteSummary,
      silentSites,
      trend,
      topContractors,
      recentEntries,
    })
  }

  const managerTotalsRows = await query(`
    SELECT
      COALESCE(SUM(
        CASE
          WHEN entry_date = CURRENT_DATE
          THEN mason_count + helper_count + women_helper_count
          ELSE 0
        END
      ), 0) AS workers_today,
      COALESCE(SUM(payment_amount), 0) AS total_payment,
      COALESCE(SUM(advance_amount), 0) AS total_advance,
      COALESCE(SUM(mason_count), 0) AS total_mason,
      COALESCE(SUM(helper_count), 0) AS total_helper,
      COALESCE(SUM(women_helper_count), 0) AS total_women,
      COUNT(*) AS total_entries
    FROM labour_entries
    WHERE site_id = ${user.siteId}
      AND entry_date BETWEEN '${from}'::date AND '${to}'::date
  `)

  const totals = managerTotalsRows[0] || {
    workers_today: 0,
    total_payment: 0,
    total_advance: 0,
    total_mason: 0,
    total_helper: 0,
    total_women: 0,
    total_entries: 0,
  }

  const recentEntries = await query(`
    SELECT
      e.*,
      s.name AS site_name
    FROM labour_entries e
    JOIN sites s ON e.site_id = s.id
    WHERE e.site_id = ${user.siteId}
    ORDER BY e.entry_date DESC, e.created_at DESC
    LIMIT 10
  `)

  const contractors = await query(`
    SELECT
      contractor_name,
      SUM(mason_count) AS mason,
      SUM(helper_count) AS helper,
      SUM(women_helper_count) AS women,
      SUM(payment_amount) AS paid,
      SUM(advance_amount) AS advance
    FROM labour_entries
    WHERE site_id = ${user.siteId}
      AND entry_date BETWEEN '${from}'::date AND '${to}'::date
      AND contractor_name IS NOT NULL
    GROUP BY contractor_name
    ORDER BY paid DESC
  `)

  return NextResponse.json({
    totals,
    recentEntries,
    contractors,
  })
}
