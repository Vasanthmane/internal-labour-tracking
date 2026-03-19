'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Download, IndianRupee, Filter } from 'lucide-react'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import { Toast, useToast } from '@/components/Toast'
import { formatINR, formatDate, todayISO } from '@/lib/utils'

const TYPE_LABELS: Record<string,string> = {
  payment:    'Payment',
  advance:    'Advance',
  ot_payment: 'OT Payment',
  adjustment: 'Adjustment',
}
const TYPE_COLORS: Record<string,string> = {
  payment:    'badge-green',
  advance:    'badge-blue',
  ot_payment: 'badge-purple',
  adjustment: 'badge-amber',
}

export default function PaymentRecordsPage() {
  const [records, setRecords] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ site_id: '', contractor_name: '', payment_date: todayISO(), payment_type: 'payment', amount: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterSite) p.set('site_id', filterSite)
    if (filterFrom) p.set('from', filterFrom)
    if (filterTo) p.set('to', filterTo)
    const r = await fetch('/api/payment-records?' + p)
    if (r.ok) setRecords(await r.json())
    setLoading(false)
  }, [filterSite, filterFrom, filterTo])

  useEffect(() => { fetch('/api/sites').then(r => r.json()).then(setSites); load() }, [load])

  async function handleSave() {
    if (!form.site_id || !form.payment_date || !form.amount) {
      showToast('Site, date and amount are required', 'error'); return
    }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/payment-records/${editing.id}` : '/api/payment-records'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, site_id: parseInt(form.site_id), amount: parseFloat(form.amount) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed') }
      await load(); setShowModal(false); setEditing(null)
      setForm({ site_id: '', contractor_name: '', payment_date: todayISO(), payment_type: 'payment', amount: '', notes: '' })
      showToast(editing ? 'Record updated!' : 'Record added!')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this payment record?')) return
    await fetch(`/api/payment-records/${id}`, { method: 'DELETE' })
    await load(); showToast('Record deleted')
  }

  function openEdit(r: any) {
    setEditing(r)
    setForm({ site_id: r.site_id.toString(), contractor_name: r.contractor_name||'', payment_date: r.payment_date.split('T')[0], payment_type: r.payment_type, amount: r.amount.toString(), notes: r.notes||'' })
    setShowModal(true)
  }

  function openAdd() {
    setEditing(null)
    setForm({ site_id: '', contractor_name: '', payment_date: todayISO(), payment_type: 'payment', amount: '', notes: '' })
    setShowModal(true)
  }

  function exportCSV() {
    const headers = ['Date','Site','Contractor','Type','Amount','Notes']
    const rows = records.map(r => [r.payment_date, r.site_name, r.contractor_name||'', TYPE_LABELS[r.payment_type]||r.payment_type, r.amount, r.notes||''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'payment-records.csv'; a.click()
  }

  const totalAmount = records.reduce((s, r) => s + Number(r.amount||0), 0)

  return (
    <div>
      <PageHeader
        title="Payment Records"
        subtitle="Track all payments, advances, and OT payments to contractors"
        action={
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn btn-secondary btn-sm gap-2"><Download className="w-3.5 h-3.5" /> Export</button>
            <button onClick={openAdd} className="btn btn-primary gap-2"><Plus className="w-4 h-4" /> Add Record</button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="filter-label mb-3"><Filter className="w-4 h-4" /> Filters</div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="input-field xl:col-span-2">
            <option value="">All Sites</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field" />
          <button onClick={() => { setFilterSite(''); setFilterFrom(''); setFilterTo('') }} className="btn btn-secondary btn-sm">Clear</button>
        </div>
        {records.length > 0 && (
          <div className="metric-inline mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span>Records: <strong>{records.length}</strong></span>
            <span>Total amount: <strong className="text-green">{formatINR(totalAmount)}</strong></span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card page-table-card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Site</th><th>Contractor</th><th>Type</th>
                <th className="text-right">Amount</th><th>Notes</th><th>Added By</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8}><div className="h-10 skeleton my-1 rounded-xl" /></td></tr>)
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-muted">
                  <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No payment records yet</p>
                  <p className="text-sm mt-1">Add your first record using the button above</p>
                </td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className="page-enter" style={{ animationDelay: `${Math.min(i*10,200)}ms` }}>
                  <td className="whitespace-nowrap font-bold text-sm">{formatDate(r.payment_date)}</td>
                  <td><span className="badge badge-amber">{r.site_name}</span></td>
                  <td className="font-semibold text-sm">{r.contractor_name || '—'}</td>
                  <td><span className={`badge ${TYPE_COLORS[r.payment_type] || 'badge-muted'}`}>{TYPE_LABELS[r.payment_type] || r.payment_type}</span></td>
                  <td className="text-right font-black text-green text-sm">{formatINR(r.amount)}</td>
                  <td className="text-muted text-xs max-w-[180px] truncate">{r.notes || '—'}</td>
                  <td className="text-xs text-muted">{r.created_by_name || '—'}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="btn btn-ghost btn-icon" data-tip="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="btn btn-ghost btn-icon btn-danger" data-tip="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Payment Record' : 'Add Payment Record'}
        subtitle="Record a payment, advance or adjustment for a contractor">
        <div className="space-y-4">
          <div className="form-grid-2">
            <div className="form-section">
              <label className="form-label">Site *</label>
              <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))} className="input">
                <option value="">Select site</option>
                {sites.filter(s => s.is_active).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-section">
              <label className="form-label">Payment Date *</label>
              <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className="input" />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Contractor Name</label>
            <input value={form.contractor_name} onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))} className="input" placeholder="Contractor name (optional)" />
          </div>

          <div className="form-section">
            <label className="form-label">Payment Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, payment_type: val }))}
                  className="p-3 rounded-xl text-left transition-all text-sm font-bold"
                  style={{
                    background: form.payment_type === val ? 'var(--green-bg)' : 'rgba(255,255,255,0.6)',
                    border: `1.5px solid ${form.payment_type === val ? 'var(--green)' : 'var(--border)'}`,
                    color: form.payment_type === val ? 'var(--green-dk)' : 'var(--ink)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black" style={{ color: 'var(--muted)' }}>₹</span>
              <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="input" style={{ paddingLeft: '30px' }} placeholder="0" />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input resize-none" rows={2} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowModal(false); setEditing(null) }} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 py-2.5">
              {saving ? 'Saving…' : editing ? 'Update Record' : 'Add Record'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
