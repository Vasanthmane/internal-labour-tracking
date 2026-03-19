'use client'
import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Pencil, Trash2, Download, Plus, Search, Clock } from 'lucide-react'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import { Toast, useToast } from '@/components/Toast'
import { formatINR, formatDate } from '@/lib/utils'
import EntryForm from '@/components/EntryForm'

// Check if entry is within 24h edit window
function isEditable(entry: any): boolean {
  if (!entry.created_at) return false
  const created = new Date(entry.created_at)
  const diffHours = (Date.now() - created.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24
}

export default function ManagerEntriesPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const { toast, showToast, hideToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterFrom) p.set('from', filterFrom)
    if (filterTo) p.set('to', filterTo)
    if (search) p.set('search', search)
    const r = await fetch('/api/entries?' + p)
    setEntries(await r.json())
    setLoading(false)
  }, [filterFrom, filterTo, search])

  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(setUser); load() }, [load])

  async function handleDelete(entry: any) {
    if (!isEditable(entry)) { showToast('Cannot delete entries older than 24 hours', 'error'); return }
    if (!confirm('Delete this entry?')) return
    const r = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
    if (!r.ok) { const d = await r.json(); showToast(d.error || 'Delete failed', 'error'); return }
    await load(); showToast('Entry deleted')
  }

  function handleEditClick(entry: any) {
    if (!isEditable(entry)) { showToast('Entries can only be edited within 24 hours of creation', 'error'); return }
    setEditing(entry); setShowEdit(true)
  }

  function exportCSV() {
    const headers = ['Date','Location','Contractor','Mason','Helper','Women','OT Notes','Payment','Advance','Remarks']
    const rows = entries.map(e => [e.entry_date, e.location||'', e.contractor_name||'', e.mason_count, e.helper_count, e.women_helper_count, e.ot_details||'', e.payment_amount, e.advance_amount, e.remarks||''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${user?.siteName || 'entries'}.csv`; a.click()
  }

  const totalPayment = entries.reduce((s, e) => s + Number(e.payment_amount||0), 0)
  const totalWorkers = entries.reduce((s, e) => s + (e.mason_count||0) + (e.helper_count||0) + (e.women_helper_count||0), 0)

  return (
    <div>
      <PageHeader
        title="My Entries"
        subtitle={user?.siteName}
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn btn-secondary gap-2 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
            <a href="/manager/entry" className="btn btn-primary gap-2 text-sm">
              <Plus className="w-4 h-4" /> New Entry
            </a>
          </div>
        }
      />

      {/* 24h policy notice */}
      <div className="alert alert-info mb-4 anim-up">
        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Edit policy:</strong> Entries can be edited or deleted within 24 hours of creation. After that, please contact your admin.
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field w-full" style={{ paddingLeft: '36px' }}
              placeholder="Search contractor, location..." />
          </div>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field" style={{ width: '160px' }} />
          <span className="text-muted text-sm">→</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field" style={{ width: '160px' }} />
          <button onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo('') }}
            className="btn btn-ghost btn-sm">Clear</button>
        </div>
        {entries.length > 0 && (
          <div className="metric-inline mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span>Total workers: <strong>{totalWorkers}</strong></span>
            <span>Total payments: <strong className="text-green">{formatINR(totalPayment)}</strong></span>
            <span>Entries: <strong>{entries.length}</strong></span>
          </div>
        )}
      </div>

      <div className="card page-table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Location</th><th>Contractor</th>
                <th className="text-center">Mason</th><th className="text-center">Helper</th><th className="text-center">Women</th>
                <th>OT</th><th className="text-right">Payment</th><th className="text-right">Advance</th>
                <th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => <tr key={i}><td colSpan={11}><div className="h-10 rounded-xl skeleton my-1" /></td></tr>)
              ) : entries.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16 text-muted">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{search || filterFrom ? 'No entries match your filters' : 'No entries yet'}</p>
                  <a href="/manager/entry" className="text-sm font-bold hover:underline mt-1 inline-block" style={{ color: 'var(--amber-deep)' }}>
                    Log your first entry →
                  </a>
                </td></tr>
              ) : entries.map((e, i) => {
                const editable = isEditable(e)
                const hasOT = (e.mason_ot_count||0) > 0 || (e.helper_ot_count||0) > 0 || (e.women_ot_count||0) > 0
                return (
                  <tr key={e.id} className="page-enter" style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>
                    <td className="whitespace-nowrap text-sm font-bold">{formatDate(e.entry_date)}</td>
                    <td className="text-muted text-sm">{e.location || '—'}</td>
                    <td className="font-bold text-sm">{e.contractor_name || '—'}</td>
                    <td className="text-center"><span className="badge badge-blue">{e.mason_count}</span></td>
                    <td className="text-center"><span className="badge badge-green">{e.helper_count}</span></td>
                    <td className="text-center"><span className="badge badge-amber">{e.women_helper_count}</span></td>
                    <td className="text-xs text-muted">
                      {hasOT ? <span className="badge badge-purple" style={{ fontSize: '10px' }}>OT ✓</span> : (e.ot_details || '—')}
                    </td>
                    <td className="text-right font-bold text-green text-sm">{Number(e.payment_amount) > 0 ? formatINR(e.payment_amount) : '—'}</td>
                    <td className="text-right text-muted text-sm">{Number(e.advance_amount) > 0 ? formatINR(e.advance_amount) : '—'}</td>
                    <td>
                      {editable
                        ? <span className="badge badge-green" style={{ fontSize: '10px' }}>Editable</span>
                        : <span className="badge badge-muted" style={{ fontSize: '10px' }}>Locked</span>}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditClick(e)}
                          className={`btn btn-ghost btn-icon ${!editable ? 'opacity-30 cursor-not-allowed' : ''}`}
                          data-tip={editable ? 'Edit' : 'Locked after 24h'}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e)}
                          className={`btn btn-ghost btn-icon btn-danger ${!editable ? 'opacity-30 cursor-not-allowed' : ''}`}
                          data-tip={editable ? 'Delete' : 'Locked after 24h'}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditing(null) }} title="Edit Entry" width="max-w-3xl">
        <EntryForm editing={editing} siteId={user?.siteId}
          onSave={async () => { await load(); setShowEdit(false); setEditing(null); showToast('Entry updated!') }}
          onCancel={() => { setShowEdit(false); setEditing(null) }} />
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
