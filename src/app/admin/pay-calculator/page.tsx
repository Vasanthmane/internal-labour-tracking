'use client'
import { useEffect, useState, useCallback } from 'react'
import { Calculator, RefreshCw, Download, Plus, Minus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { formatINR } from '@/lib/utils'

function getRange(p: string) {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  if (p === 'today') return { from: fmt(today), to: fmt(today) }
  if (p === 'week')  { const m = new Date(today); m.setDate(today.getDate()-today.getDay()+1); return { from: fmt(m), to: fmt(today) } }
  if (p === 'month') return { from: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`, to: fmt(today) }
  return { from: '2024-01-01', to: fmt(today) }
}

interface ManualRow { id: number; label: string; mason: number; helper: number; women: number }

// OT helper
const DAILY = { mason: 900, helper: 750, women: 700 }
const hrRate = (d: number) => d / 8

export default function PayCalculatorPage() {
  const [sites, setSites] = useState<any[]>([])
  const [from, setFrom] = useState(() => getRange('month').from)
  const [to, setTo] = useState(() => getRange('month').to)
  const [siteId, setSiteId] = useState('')
  const [contractor, setContractor] = useState('')
  const [preset, setPreset] = useState('month')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState({ mason: 900, helper: 750, women: 700 })

  // Manual mode
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ id: 1, label: 'Entry 1', mason: 0, helper: 0, women: 0 }])

  useEffect(() => { fetch('/api/sites').then(r => r.json()).then(setSites) }, [])

  const fetchData = useCallback(async () => {
    if (!from || !to) return
    setLoading(true)
    const p = new URLSearchParams({ from, to })
    if (siteId) p.set('site_id', siteId)
    if (contractor) p.set('contractor', contractor)
    const r = await fetch('/api/pay-calculator?' + p)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }, [from, to, siteId, contractor])

  useEffect(() => { if (mode === 'auto') fetchData() }, [fetchData, mode])

  function applyPreset(p: string) { setPreset(p); const r = getRange(p); setFrom(r.from); setTo(r.to) }
  function addManualRow() {
    const id = Math.max(...manualRows.map(r => r.id)) + 1
    setManualRows(rows => [...rows, { id, label: `Entry ${id}`, mason: 0, helper: 0, women: 0 }])
  }
  function updateRow(id: number, field: string, value: any) { setManualRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r)) }
  function removeRow(id: number) { if (manualRows.length === 1) return; setManualRows(rows => rows.filter(r => r.id !== id)) }

  const autoT = data?.totals
  const manualTotals = {
    mason: manualRows.reduce((s, r) => s + r.mason, 0),
    helper: manualRows.reduce((s, r) => s + r.helper, 0),
    women: manualRows.reduce((s, r) => s + r.women, 0),
  }

  const mason  = mode === 'auto' ? Number(autoT?.total_mason  || 0) : manualTotals.mason
  const helper = mode === 'auto' ? Number(autoT?.total_helper || 0) : manualTotals.helper
  const women  = mode === 'auto' ? Number(autoT?.total_women  || 0) : manualTotals.women

  const masonWages  = mason  * rates.mason
  const helperWages = helper * rates.helper
  const womenWages  = women  * rates.women
  const totalWages  = masonWages + helperWages + womenWages
  const alreadyPaid = Number(autoT?.total_paid || 0)
  const totalAdvance = Number(autoT?.total_advance || 0)
  const totalPaidAll = alreadyPaid + totalAdvance
  const balance = totalWages - totalPaidAll

  // OT calculations from auto data
  const masonOTHrs   = Number(autoT?.total_mason_ot_hours  || 0)
  const helperOTHrs  = Number(autoT?.total_helper_ot_hours || 0)
  const womenOTHrs   = Number(autoT?.total_women_ot_hours  || 0)
  const masonOTCnt   = Number(autoT?.total_mason_ot_count  || 0)
  const helperOTCnt  = Number(autoT?.total_helper_ot_count || 0)
  const womenOTCnt   = Number(autoT?.total_women_ot_count  || 0)
  const masonOTAmt   = masonOTCnt  * masonOTHrs  * hrRate(DAILY.mason)
  const helperOTAmt  = helperOTCnt * helperOTHrs * hrRate(DAILY.helper)
  const womenOTAmt   = womenOTCnt  * womenOTHrs  * hrRate(DAILY.women)
  const totalOTAmt   = masonOTAmt + helperOTAmt + womenOTAmt
  const grandTotal   = totalWages + totalOTAmt

  const bySite: any[]       = data?.bySite || []
  const byContractor: any[] = data?.byContractor || []
  const contractors: any[]  = data?.contractors || []

  function calcWages(m: number, h: number, w: number) { return m * rates.mason + h * rates.helper + w * rates.women }
  function calcOT(row: any) {
    const mOT = Number(row.mason_ot_total||0)  * hrRate(DAILY.mason)
    const hOT = Number(row.helper_ot_total||0) * hrRate(DAILY.helper)
    const wOT = Number(row.women_ot_total||0)  * hrRate(DAILY.women)
    return mOT + hOT + wOT
  }

  function exportCSV() {
    if (!byContractor.length) return
    const headers = ['Contractor','Site','Mason Days','Helper Days','Women Days','Regular Wages','OT Amount','Total Expected','Actual Paid','Balance']
    const rows = byContractor.map((c: any) => {
      const wages = calcWages(Number(c.mason_days), Number(c.helper_days), Number(c.women_days))
      const ot = calcOT(c)
      const total = wages + ot
      const paid = Number(c.actual_paid) + Number(c.advance_paid)
      return [c.contractor_name, c.site_name, c.mason_days, c.helper_days, c.women_days, wages, ot, total, paid, total - paid]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `pay-report-${from}-to-${to}.csv`; a.click()
  }

  return (
    <div>
      <PageHeader
        title="Pay Calculator"
        subtitle="Calculate regular wages + OT. Switch between Auto (from DB) and Manual input."
        action={
          <button onClick={exportCSV} className="btn btn-secondary btn-sm gap-2">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 mb-5 anim-up">
        <div className="tabs" style={{ width: '300px' }}>
          <button className={`tab ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>📊 Auto (from Database)</button>
          <button className={`tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>✏️ Manual Input</button>
        </div>
        <span className="text-xs text-muted">
          {mode === 'auto' ? 'Pulls actual man-days + OT from your entries' : 'Enter days manually to calculate wages'}
        </span>
      </div>

      {/* Filters (auto mode) */}
      {mode === 'auto' && (
        <div className="card p-3 mb-5 anim-up d1 flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {['today','week','month','all'].map(p => (
              <button key={p} onClick={() => applyPreset(p)} className={`filter-pill ${preset === p ? 'active' : ''}`} style={{ padding: '5px 12px', fontSize: '12px' }}>
                {p.charAt(0).toUpperCase()+p.slice(1)}
              </button>
            ))}
          </div>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('') }} className="input input-sm" style={{ width: '140px' }} />
          <span className="text-faint text-xs">→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('') }} className="input input-sm" style={{ width: '140px' }} />
          <select value={siteId} onChange={e => setSiteId(e.target.value)} className="input input-sm" style={{ width: '150px' }}>
            <option value="">All Sites</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={contractor} onChange={e => setContractor(e.target.value)} className="input input-sm" style={{ width: '160px' }}>
            <option value="">All Contractors</option>
            {contractors.map((c: any) => <option key={c.contractor_name} value={c.contractor_name}>{c.contractor_name}</option>)}
          </select>
          <button onClick={() => fetchData()} className="btn btn-secondary btn-sm gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      )}

      {/* Rates */}
      <div className="card mb-5 anim-up d2">
        <div className="section-header">
          <div><div className="section-title">Daily Rates (₹ per person per day)</div><div className="section-sub">OT rate = daily rate ÷ 8 hrs · Change anytime</div></div>
        </div>
        <div className="grid grid-cols-3 gap-0" style={{ padding: '20px' }}>
          {[
            { key: 'mason', label: 'Mason Rate', emoji: '🧱', color: 'var(--blue)' },
            { key: 'helper', label: 'Helper Rate', emoji: '🦺', color: 'var(--green)' },
            { key: 'women', label: 'Women Helper Rate', emoji: '👩', color: 'var(--amber-dk)' },
          ].map(({ key, label, emoji, color }, i) => (
            <div key={key} className={`p-4 ${i < 2 ? 'border-r' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>₹</span>
                <input type="number" min="0" value={rates[key as keyof typeof rates]}
                  onChange={e => setRates(r => ({ ...r, [key]: Number(e.target.value) }))}
                  className="input font-bold text-lg" style={{ color, fontVariantNumeric: 'tabular-nums' }} />
                <span className="text-xs text-muted font-medium">/day</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--faint)' }}>
                OT = ₹{(rates[key as keyof typeof rates] / 8).toFixed(0)}/hr
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual rows */}
      {mode === 'manual' && (
        <div className="card mb-5 anim-up d3">
          <div className="section-header">
            <div><div className="section-title">Manual Day Entry</div><div className="section-sub">Enter man-days for each row</div></div>
            <button onClick={addManualRow} className="btn btn-secondary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Row</button>
          </div>
          <div className="p-4 space-y-2">
            {manualRows.map(row => (
              <div key={row.id} className="grid grid-cols-5 gap-3 p-3 rounded-xl" style={{ background: 'var(--s2)' }}>
                <div>
                  <div className="text-xs font-bold text-muted uppercase mb-1">Label</div>
                  <input value={row.label} onChange={e => updateRow(row.id, 'label', e.target.value)} className="input input-sm" placeholder="e.g. Contractor" />
                </div>
                {[
                  { k: 'mason', label: '🧱 Mason Days', color: 'var(--blue)' },
                  { k: 'helper', label: '🦺 Helper Days', color: 'var(--green)' },
                  { k: 'women', label: '👩 Women Days', color: 'var(--amber-dk)' },
                ].map(({ k, label, color }) => (
                  <div key={k}>
                    <div className="text-xs font-bold text-muted uppercase mb-1">{label}</div>
                    <input type="number" min="0" value={row[k as keyof ManualRow] as number}
                      onChange={e => updateRow(row.id, k, parseInt(e.target.value)||0)}
                      className="input input-sm font-bold" style={{ color }} />
                  </div>
                ))}
                <div className="flex items-end">
                  <div className="w-full">
                    <div className="text-xs font-bold text-muted uppercase mb-1">Wages</div>
                    <div className="text-sm font-bold text-amber" style={{ padding: '7px 0' }}>
                      {formatINR(calcWages(row.mason, row.helper, row.women))}
                    </div>
                  </div>
                  {manualRows.length > 1 && (
                    <button onClick={() => removeRow(row.id)} className="btn btn-ghost btn-icon btn-danger ml-2 mb-0.5"><Minus className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular wages summary */}
      <div className="card mb-5 anim-up d4">
        <div className="section-header"><div><div className="section-title">Regular Wages (Man-Days × Rate)</div></div></div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Mason', days: mason, wages: masonWages, rateKey: 'mason', emoji: '🧱', color: 'var(--blue)', bg: 'var(--blue-bg)' },
              { label: 'Helper', days: helper, wages: helperWages, rateKey: 'helper', emoji: '🦺', color: 'var(--green)', bg: 'var(--green-bg)' },
              { label: 'Women Helper', days: women, wages: womenWages, rateKey: 'women', emoji: '👩', color: 'var(--amber-dk)', bg: 'var(--amber-bg)' },
            ].map(({ label, days, wages, rateKey, emoji, color, bg }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: bg, border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2"><span className="text-xl">{emoji}</span><span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span></div>
                <div className="stat-number text-3xl mb-1" style={{ color }}>{days}</div>
                <div className="text-xs text-muted mb-3">{days} days × ₹{rates[rateKey as keyof typeof rates]}</div>
                <div className="divider mb-3" />
                <div className="text-right font-bold text-base" style={{ color }}>{formatINR(wages)}</div>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(217,119,6,0.06)', border: '2px solid rgba(217,119,6,0.2)' }}>
              <div className="text-xs font-bold uppercase tracking-wider text-amber mb-2">Regular Wages Total</div>
              <div className="stat-number text-3xl" style={{ color: 'var(--amber-dk)' }}>{formatINR(totalWages)}</div>
              <div className="text-xs text-muted mt-1">{mason}M + {helper}H + {women}W days</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Already Paid {mode === 'auto' && <span className="badge badge-muted ml-1" style={{ fontSize: '9px' }}>from records</span>}
              </div>
              {mode === 'auto' && alreadyPaid > 0 ? (
                <>
                  <div className="stat-number text-2xl text-ink">{formatINR(alreadyPaid)}</div>
                  {totalAdvance > 0 && <div className="text-xs text-muted mt-1">+ {formatINR(totalAdvance)} advance</div>}
                </>
              ) : <div className="stat-number text-2xl text-muted">—</div>}
            </div>
            <div className="rounded-xl p-4 text-center" style={{
              background: balance > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(22,163,74,0.05)',
              border: `2px solid ${balance > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
            }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                Balance (Regular)
              </div>
              <div className="stat-number text-3xl" style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                {formatINR(Math.abs(balance))}
              </div>
              <div className="text-xs mt-1" style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                {balance > 0 ? 'Outstanding' : balance < 0 ? 'Overpaid' : 'Settled ✓'}
              </div>
              {mode === 'auto' && totalWages > 0 && (
                <div className="progress mt-2 progress-green"><div className="progress-fill" style={{ width: `${Math.min(100, (totalPaidAll/totalWages)*100)}%` }} /></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OT Summary (auto mode only, only if OT exists) */}
      {mode === 'auto' && totalOTAmt > 0 && (
        <div className="card mb-5 anim-up d5">
          <div className="section-header">
            <div><div className="section-title">Overtime (OT) Summary</div><div className="section-sub">OT rate = daily rate ÷ 8 hrs × count × hours</div></div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Mason OT', cnt: masonOTCnt, hrs: masonOTHrs, amt: masonOTAmt, daily: DAILY.mason, emoji: '🧱', color: 'var(--blue)', bg: 'var(--blue-bg)' },
                { label: 'Helper OT', cnt: helperOTCnt, hrs: helperOTHrs, amt: helperOTAmt, daily: DAILY.helper, emoji: '🦺', color: 'var(--green)', bg: 'var(--green-bg)' },
                { label: 'Women OT', cnt: womenOTCnt, hrs: womenOTHrs, amt: womenOTAmt, daily: DAILY.women, emoji: '👩', color: 'var(--amber-dk)', bg: 'var(--amber-bg)' },
              ].filter(r => r.cnt > 0 || r.hrs > 0).map(({ label, cnt, hrs, amt, daily, emoji, color, bg }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: bg, border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2"><span className="text-xl">{emoji}</span><span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span></div>
                  <div className="text-xs text-muted mb-1">{cnt} workers × {hrs.toFixed(1)} hrs</div>
                  <div className="text-xs text-muted mb-3">@ ₹{hrRate(daily).toFixed(0)}/hr (₹{daily}/8)</div>
                  <div className="divider mb-3" />
                  <div className="text-right font-bold text-base" style={{ color }}>{formatINR(amt)}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(124,58,237,0.06)', border: '2px solid rgba(124,58,237,0.2)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--purple-dk)' }}>Total OT Wages</div>
                <div className="stat-number text-3xl" style={{ color: 'var(--purple-dk)' }}>{formatINR(totalOTAmt)}</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg,rgba(22,163,74,0.08),rgba(245,158,11,0.06))', border: '2px solid rgba(22,163,74,0.2)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--green-dk)' }}>Grand Total (Regular + OT)</div>
                <div className="stat-number text-3xl" style={{ color: 'var(--green-dk)' }}>{formatINR(grandTotal)}</div>
                <div className="text-xs text-muted mt-1">{formatINR(totalWages)} + {formatINR(totalOTAmt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Site-wise table */}
      {mode === 'auto' && bySite.length > 0 && (
        <div className="card mb-5 anim-up d5">
          <div className="section-header"><div className="section-title">Site-wise Breakdown</div></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr>
                <th>Site</th>
                <th className="text-center">Mason Days</th><th className="text-center">Helper Days</th><th className="text-center">Women Days</th>
                <th className="text-right">Regular Wages</th><th className="text-right">OT Wages</th>
                <th className="text-right">Expected</th><th className="text-right">Paid</th><th className="text-right">Balance</th>
              </tr></thead>
              <tbody>
                {bySite.map((s: any) => {
                  const reg = calcWages(Number(s.mason_days), Number(s.helper_days), Number(s.women_days))
                  const ot  = calcOT(s)
                  const total = reg + ot
                  const diff = total - Number(s.actual_paid) - Number(s.advance_paid)
                  return (
                    <tr key={s.id}>
                      <td><span className="badge badge-amber">{s.site_name}</span></td>
                      <td className="text-center td-num text-blue">{s.mason_days}</td>
                      <td className="text-center td-num text-green">{s.helper_days}</td>
                      <td className="text-center td-num text-amber">{s.women_days}</td>
                      <td className="text-right td-num">{formatINR(reg)}</td>
                      <td className="text-right td-num" style={{ color: ot > 0 ? 'var(--purple-dk)' : 'var(--faint)' }}>{ot > 0 ? formatINR(ot) : '—'}</td>
                      <td className="text-right td-num font-bold text-amber">{formatINR(total)}</td>
                      <td className="text-right td-num text-muted">{Number(s.actual_paid)>0 ? formatINR(Number(s.actual_paid)+Number(s.advance_paid)) : '—'}</td>
                      <td className="text-right td-num font-bold" style={{ color: diff>0 ? 'var(--red)' : 'var(--green)' }}>{formatINR(Math.abs(diff))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contractor cards */}
      {mode === 'auto' && byContractor.length > 0 && (
        <div className="anim-up d6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-base" style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: 'var(--ink)' }}>
              Contractor-wise · {byContractor.length} contractors
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {byContractor.map((c: any, i) => {
              const reg  = calcWages(Number(c.mason_days), Number(c.helper_days), Number(c.women_days))
              const ot   = calcOT(c)
              const wages = reg + ot
              const paid = Number(c.actual_paid) + Number(c.advance_paid)
              const diff = wages - paid
              const pct  = wages > 0 ? (paid / wages) * 100 : 0
              return (
                <div key={`${c.contractor_name}-${c.site_id}`} className="card p-4 card-hover anim-up" style={{ animationDelay: `${i*30}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{c.contractor_name}</div>
                      <span className="badge badge-amber mt-1" style={{ fontSize: '10px' }}>{c.site_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="kpi-label">Expected</div>
                      <div className="font-bold text-amber" style={{ fontSize: '15px' }}>{formatINR(wages)}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-3">
                    {Number(c.mason_days)>0  && <div className="flex justify-between"><span className="text-muted">🧱 {c.mason_days}d × ₹{rates.mason}</span><span className="font-bold text-blue">{formatINR(Number(c.mason_days)*rates.mason)}</span></div>}
                    {Number(c.helper_days)>0 && <div className="flex justify-between"><span className="text-muted">🦺 {c.helper_days}d × ₹{rates.helper}</span><span className="font-bold text-green">{formatINR(Number(c.helper_days)*rates.helper)}</span></div>}
                    {Number(c.women_days)>0  && <div className="flex justify-between"><span className="text-muted">👩 {c.women_days}d × ₹{rates.women}</span><span className="font-bold text-amber">{formatINR(Number(c.women_days)*rates.women)}</span></div>}
                    {ot > 0 && <div className="flex justify-between"><span className="text-muted">⏱ OT wages</span><span className="font-bold" style={{ color: 'var(--purple-dk)' }}>{formatINR(ot)}</span></div>}
                  </div>

                  <div className="divider mb-3" />

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted font-medium">Paid</span>
                      <span className="font-bold text-green">{paid > 0 ? formatINR(paid) : '—'}</span>
                    </div>
                    {Number(c.advance_paid)>0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">  incl. advance</span>
                        <span className="text-muted">{formatINR(c.advance_paid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="font-bold" style={{ color: diff>0 ? 'var(--red)' : 'var(--green)' }}>Balance</span>
                      <span className="font-black" style={{ color: diff>0 ? 'var(--red)' : 'var(--green)' }}>
                        {diff===0 ? '✓ Settled' : `${diff>0?'Owes':'Overpaid'} ${formatINR(Math.abs(diff))}`}
                      </span>
                    </div>
                  </div>

                  {wages > 0 && <div className="progress progress-green mt-3"><div className="progress-fill" style={{ width: `${Math.min(100,pct)}%` }} /></div>}
                  {wages > 0 && <div className="text-right text-xs text-muted mt-1">{Math.round(pct)}% paid</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'auto' && !loading && byContractor.length === 0 && (
        <div className="card p-16 text-center">
          <Calculator className="w-10 h-10 mx-auto mb-3 text-faint" />
          <p className="text-muted font-medium">Select filters above and click Refresh to see wage calculations</p>
        </div>
      )}
    </div>
  )
}
