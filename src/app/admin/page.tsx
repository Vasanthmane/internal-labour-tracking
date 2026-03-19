'use client'
import { useEffect, useState, useCallback } from 'react'
import { Building2, Users, HardHat, IndianRupee, TrendingUp, AlertTriangle, ArrowUpRight, Activity, RefreshCw } from 'lucide-react'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'
import { formatINR, formatDate } from '@/lib/utils'

function getRange(preset: string) {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  if (preset === 'today')  return { from: fmt(today), to: fmt(today) }
  if (preset === 'week')   { const m = new Date(today); m.setDate(today.getDate()-today.getDay()+1); return { from: fmt(m), to: fmt(today) } }
  if (preset === 'month')  return { from: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`, to: fmt(today) }
  return { from: '2024-01-01', to: fmt(today) }
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('month')
  const [from, setFrom] = useState(() => getRange('month').from)
  const [to, setTo] = useState(() => getRange('month').to)
  const [filterSite, setFilterSite] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true)
    const p = new URLSearchParams({ from, to })
    if (filterSite) p.set('site_id', filterSite)
    const d = await fetch('/api/dashboard?' + p).then(r => r.json())
    setData(d)
    setLoading(false); setRefreshing(false)
  }, [from, to, filterSite])

  useEffect(() => { fetch('/api/sites').then(r => r.json()).then(setSites) }, [])
  useEffect(() => { load() }, [load])

  function applyPreset(p: string) {
    setPreset(p); const r = getRange(p); setFrom(r.from); setTo(r.to)
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="skeleton h-9 w-64 rounded-xl" />
      <div className="flex gap-3"><div className="skeleton h-9 w-80 rounded-lg"/><div className="skeleton h-9 w-40 rounded-lg"/></div>
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
      <div className="grid grid-cols-5 gap-4"><div className="col-span-3 skeleton h-72 rounded-xl"/><div className="col-span-2 skeleton h-72 rounded-xl"/></div>
    </div>
  )

  const t = data?.totals
  const sites2: any[] = data?.siteSummary || []
  const recent: any[] = data?.recentEntries || []
  const silent: any[] = data?.silentSites || []
  const contractors: any[] = data?.topContractors || []
  const trend: any[] = data?.trend || []
  const maxWorkers = Math.max(...sites2.map((s: any) => Number(s.workers_today)), 1)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time construction labour analytics"
        action={
          <button onClick={() => load(true)} className="btn btn-secondary btn-sm gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-3 mb-5 anim-up d1 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {['today','week','month','all'].map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`filter-pill ${preset === p ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('') }} className="input input-sm" style={{ width: '140px' }} />
          <span className="text-faint text-xs">→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('') }} className="input input-sm" style={{ width: '140px' }} />
        </div>
        <div className="w-px h-6 bg-border" />
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="input input-sm" style={{ width: '160px' }}>
          <option value="">All Sites</option>
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(filterSite || from !== getRange('month').from) && (
          <button onClick={() => { setFilterSite(''); applyPreset('month') }}
            className="text-xs font-semibold" style={{ color: 'var(--amber-dk)' }}>Clear</button>
        )}
      </div>

      {/* Alert: silent sites */}
      {silent.length > 0 && (
        <div className="alert alert-warning mb-4 anim-up d2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>No entries today:</strong> {silent.map((s: any) => s.name).join(', ')}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Sites"       value={t?.total_sites || 0}          icon={<Building2 className="w-4 h-4"/>} delay={0} />
        <StatCard label="Total Users"       value={t?.total_users || 0}          icon={<Users className="w-4 h-4"/>} delay={40} />
        <StatCard label="Workers Today"     value={t?.workers_today || 0}        icon={<HardHat className="w-4 h-4"/>} accent="amber" delay={80} sub="across all sites" />
        <StatCard label="Payments (Period)" value={formatINR(t?.total_payment)}  icon={<IndianRupee className="w-4 h-4"/>} accent="green" delay={120} sub={`+${formatINR(t?.total_advance)} advance`} />
      </div>

      {/* Labour mandays row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { l: 'Mason Man-Days',  v: t?.total_mason, emoji: '🧱', color: 'var(--blue)',  bg: 'var(--blue-bg)' },
          { l: 'Helper Man-Days', v: t?.total_helper, emoji: '🦺', color: 'var(--green)', bg: 'var(--green-bg)' },
          { l: 'Women Man-Days',  v: t?.total_women, emoji: '👩', color: 'var(--amber)',  bg: 'var(--amber-bg)' },
          { l: 'Total Entries',   v: t?.total_entries, emoji: '📋', color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(({ l, v, emoji, color, bg }, i) => (
          <div key={l} className={`card p-4 anim-up d${i+1}`} style={{ background: bg, borderColor: `${color}22` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{emoji}</span>
              <span className="kpi-label">{l}</span>
            </div>
            <div className="stat-number text-2xl" style={{ color }}>{v || 0}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* Site performance */}
        <div className="col-span-3 card anim-up d3">
          <div className="section-header">
            <div><div className="section-title">Site Performance</div><div className="section-sub">{from} → {to}</div></div>
            <a href="/admin/sites" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--amber-dk)' }}>
              Manage <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
            {sites2.length === 0 ? <p className="text-sm text-muted text-center py-8">No data</p> : sites2.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-s2 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'var(--amber)' }}>
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.name}</span>
                    <span className="text-xs font-bold" style={{ color: Number(s.workers_today) > 0 ? 'var(--green)' : 'var(--faint)' }}>
                      {s.workers_today} today
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="progress flex-1" style={{ height: '4px' }}>
                      <div className="progress-fill" style={{ width: `${(Number(s.workers_today)/maxWorkers)*100}%` }} />
                    </div>
                    <span className="text-xs text-muted shrink-0">{formatINR(s.payment)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--ink2)' }}>
                    🧱{s.mason_days} 🦺{s.helper_days} 👩{s.women_days}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top contractors */}
        <div className="col-span-2 card anim-up d4">
          <div className="section-header">
            <div><div className="section-title">Top Contractors</div><div className="section-sub">By payments this period</div></div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {contractors.length === 0 ? <p className="text-sm text-muted text-center py-8">No data</p>
              : contractors.map((c: any, i) => (
              <div key={c.contractor_name} className="px-4 py-3 hover:bg-s2 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: i === 0 ? 'var(--amber)' : 'var(--border2)' }}>{i+1}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{c.contractor_name}</span>
                  </div>
                  <span className="text-xs font-bold text-green">{formatINR(c.paid)}</span>
                </div>
                <div className="text-xs text-muted ml-7">🧱{c.mason} 🦺{c.helper} 👩{c.women} · {c.entries} entries</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live feed */}
      <div className="card anim-up d5">
        <div className="section-header">
          <div><div className="section-title">Recent Activity</div><div className="section-sub">Latest entries across all sites</div></div>
          <a href="/admin/entries" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--amber-dk)' }}>
            All entries <ArrowUpRight className="w-3 h-3"/>
          </a>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Date</th><th>Site</th><th>Contractor</th>
              <th className="text-center">M</th><th className="text-center">H</th><th className="text-center">W</th>
              <th>Location</th><th className="text-right">Payment</th><th className="text-right">Advance</th><th>Logged By</th>
            </tr></thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-muted">No entries in this period</td></tr>
              ) : recent.map((e: any) => (
                <tr key={e.id}>
                  <td className="td-num text-xs">{formatDate(e.entry_date)}</td>
                  <td><span className="badge badge-amber">{e.site_name}</span></td>
                  <td className="font-medium text-sm">{e.contractor_name || '—'}</td>
                  <td className="text-center"><span className="tag" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>{e.mason_count}</span></td>
                  <td className="text-center"><span className="tag" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>{e.helper_count}</span></td>
                  <td className="text-center"><span className="tag" style={{ background: 'var(--amber-bg)', color: 'var(--amber-dk)' }}>{e.women_helper_count}</span></td>
                  <td className="text-muted text-xs">{e.location || '—'}</td>
                  <td className="text-right td-num text-green text-sm">{Number(e.payment_amount)>0 ? formatINR(e.payment_amount) : '—'}</td>
                  <td className="text-right td-num text-muted text-sm">{Number(e.advance_amount)>0 ? formatINR(e.advance_amount) : '—'}</td>
                  <td className="text-xs text-muted">{e.by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
