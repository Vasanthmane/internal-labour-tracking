'use client'
import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Download, Pencil, Trash2, Plus, Search, Filter } from 'lucide-react'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import { Toast, useToast } from '@/components/Toast'
import { formatINR, formatDate } from '@/lib/utils'
import EntryForm from '@/components/EntryForm'

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterManager, setFilterManager] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { toast, showToast, hideToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterSite) p.set('site_id', filterSite)
    if (filterFrom) p.set('from', filterFrom)
    if (filterTo) p.set('to', filterTo)
    if (filterManager) p.set('created_by', filterManager)
    if (search) p.set('search', search)
    p.set('limit', '300')
    const r = await fetch('/api/entries?' + p)
    setEntries(await r.json())
    setLoading(false)
  }, [filterSite, filterFrom, filterTo, filterManager, search])

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(setSites)
    fetch('/api/managers').then(r => r.json()).then(d => setManagers(Array.isArray(d) ? d : []))
    load()
  }, [load])

  async function handleDelete(id: number) {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    await load(); showToast('Entry deleted')
  }

  function exportCSV() {
    const headers = ['Date','Site','Location','Contractor','Mason','Helper','Women','Mason OT Cnt','Mason OT Hrs','Helper OT Cnt','Helper OT Hrs','Women OT Cnt','Women OT Hrs','OT Notes','Payment','Advance','Remarks','Logged By']
    const rows = entries.map(e => [
      e.entry_date, e.site_name, e.location||'', e.contractor_name||'',
      e.mason_count, e.helper_count, e.women_helper_count,
      e.mason_ot_count||0, e.mason_ot_hours||0,
      e.helper_ot_count||0, e.helper_ot_hours||0,
      e.women_ot_count||0, e.women_ot_hours||0,
      e.ot_details||'', e.payment_amount, e.advance_amount, e.remarks||'', e.created_by_username||'',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'entries.csv'; a.click()
  }

  const totalWorkers = entries.reduce((s, e) => s + (e.mason_count||0) + (e.helper_count||0) + (e.women_helper_count||0), 0)
  const totalPayment = entries.reduce((s, e) => s + Number(e.payment_amount||0), 0)
  const totalAdvance = entries.reduce((s, e) => s + Number(e.advance_amount||0), 0)

  // OT totals (with fallback for missing columns)
  const totalOTAmount = entries.reduce((s, e) => {
    const mOT = (e.mason_ot_count||0) * (e.mason_ot_hours||0) * (900/8)
    const hOT = (e.helper_ot_count||0) * (e.helper_ot_hours||0) * (750/8)
    const wOT = (e.women_ot_count||0) * (e.women_ot_hours||0) * (700/8)
    return s + mOT + hOT + wOT
  }, 0)

  return (
    <div>
      <PageHeader
        title="All Entries"
        subtitle={`${entries.length} records`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportCSV} className="btn btn-secondary gap-2 px-4 py-2.5 text-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => { setEditing(null); setShowAdd(true) }} className="btn btn-primary gap-2 px-4 py-2.5 text-sm">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-5">
        <div className="filter-label mb-3"><Filter className="w-4 h-4" /> Filters & Search</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2 input-with-icon">
            <Search className="input-icon" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field w-full" placeholder="Search contractor, location, site..." />
          </div>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="input-field">
            <option value="">All Sites</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterManager} onChange={e => setFilterManager(e.target.value)} className="input-field">
            <option value="">All Users</option>
            {managers.map((m: any) => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field" />
        </div>
        <div className="table-topbar mt-3 px-0">
          <button onClick={() => { setSearch(''); setFilterSite(''); setFilterFrom(''); setFilterTo(''); setFilterManager('') }}
            className="text-xs font-bold hover:underline" style={{ color: 'var(--amber-deep)' }}>
            Clear all filters
          </button>
          {entries.length > 0 && (
            <div className="metric-inline">
              <span>Workers: <strong>{totalWorkers}</strong></span>
              <span>Payments: <strong className="text-green">{formatINR(totalPayment)}</strong></span>
              <span>Advance: <strong>{formatINR(totalAdvance)}</strong></span>
              {totalOTAmount > 0 && <span>OT: <strong className="text-amber">{formatINR(totalOTAmount)}</strong></span>}
            </div>
          )}
        </div>
      </div>

      <div className="card page-table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Site</th><th>Location</th><th>Contractor</th>
                <th className="text-center">M</th><th className="text-center">H</th><th className="text-center">W</th>
                <th>OT</th><th className="text-right">Payment</th><th className="text-right">Advance</th>
                <th>Logged By</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => <tr key={i}><td colSpan={12}><div className="h-10 rounded-xl skeleton my-1" /></td></tr>)
              ) : entries.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-14 text-muted">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No entries found</p>
                </td></tr>
              ) : entries.map((e, i) => {
                const hasOT = (e.mason_ot_count||0) > 0 || (e.helper_ot_count||0) > 0 || (e.women_ot_count||0) > 0
                return (
                  <tr key={e.id} className="page-enter" style={{ animationDelay: `${Math.min(i * 10, 200)}ms` }}>
                    <td className="text-sm font-bold whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td><span className="badge badge-amber">{e.site_name}</span></td>
                    <td className="text-muted text-sm">{e.location || '—'}</td>
                    <td className="font-bold text-sm">{e.contractor_name || '—'}</td>
                    <td className="text-center"><span className="badge badge-blue">{e.mason_count}</span></td>
                    <td className="text-center"><span className="badge badge-green">{e.helper_count}</span></td>
                    <td className="text-center"><span className="badge badge-amber">{e.women_helper_count}</span></td>
                    <td className="text-xs text-muted max-w-[110px]">
                      {hasOT ? (
                        <span className="badge badge-purple" style={{ fontSize: '10px' }}>OT ✓</span>
                      ) : (e.ot_details || '—')}
                    </td>
                    <td className="text-right font-bold text-green text-sm">{Number(e.payment_amount) > 0 ? formatINR(e.payment_amount) : '—'}</td>
                    <td className="text-right text-muted text-sm">{Number(e.advance_amount) > 0 ? formatINR(e.advance_amount) : '—'}</td>
                    <td className="text-xs text-muted">{e.created_by_name || e.created_by_username || '—'}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(e); setShowAdd(true) }} className="btn btn-ghost btn-icon"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="btn btn-ghost btn-icon btn-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }}
        title={editing ? 'Edit Entry' : 'Add Labour Entry'} subtitle="Record labour activity with OT and payment details" width="max-w-3xl">
        <EntryForm editing={editing} sites={sites} isAdmin
          onSave={async () => { await load(); setShowAdd(false); setEditing(null); showToast(editing ? 'Updated!' : 'Added!') }}
          onCancel={() => { setShowAdd(false); setEditing(null) }} />
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
