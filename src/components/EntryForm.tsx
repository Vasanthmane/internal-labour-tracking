'use client'
import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { todayISO } from '@/lib/utils'

interface EntryFormProps {
  editing?: any
  sites?: any[]
  isAdmin?: boolean
  siteId?: number
  onSave: () => void
  onCancel: () => void
}

function Counter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px' }}>
        <Minus className="w-3 h-3" />
      </button>
      <input type="number" min="0" value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="input text-center font-black text-base"
        style={{ width: '74px', padding: '6px 8px' }} />
      <button type="button" onClick={() => onChange(value + 1)}
        className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px' }}>
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function EntryForm({ editing, sites, isAdmin, siteId, onSave, onCancel }: EntryFormProps) {
  const [form, setForm] = useState({
    site_id:            editing?.site_id?.toString() || siteId?.toString() || '',
    entry_date:         editing?.entry_date ? editing.entry_date.split('T')[0] : todayISO(),
    location:           editing?.location || '',
    contractor_name:    editing?.contractor_name || '',
    mason_count:        parseInt(editing?.mason_count) || 0,
    helper_count:       parseInt(editing?.helper_count) || 0,
    women_helper_count: parseInt(editing?.women_helper_count) || 0,
    // OT fields
    mason_ot_count:     parseInt(editing?.mason_ot_count) || 0,
    mason_ot_hours:     parseFloat(editing?.mason_ot_hours) || 0,
    helper_ot_count:    parseInt(editing?.helper_ot_count) || 0,
    helper_ot_hours:    parseFloat(editing?.helper_ot_hours) || 0,
    women_ot_count:     parseInt(editing?.women_ot_count) || 0,
    women_ot_hours:     parseFloat(editing?.women_ot_hours) || 0,
    ot_details:         editing?.ot_details || '',
    payment_amount:     editing?.payment_amount?.toString() || '',
    advance_amount:     editing?.advance_amount?.toString() || '',
    remarks:            editing?.remarks || '',
  })
  const [showOT, setShowOT] = useState(
    !!(editing?.mason_ot_count || editing?.helper_ot_count || editing?.women_ot_count)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  // OT hourly rates
  const DAILY = { mason: 900, helper: 750, women: 700 }
  const hourlyRate = (daily: number) => daily / 8
  const otAmount = (count: number, hours: number, daily: number) =>
    count * hours * hourlyRate(daily)

  const masonOT   = otAmount(form.mason_ot_count,  form.mason_ot_hours,  DAILY.mason)
  const helperOT  = otAmount(form.helper_ot_count, form.helper_ot_hours, DAILY.helper)
  const womenOT   = otAmount(form.women_ot_count,  form.women_ot_hours,  DAILY.women)
  const totalOT   = masonOT + helperOT + womenOT

  const totalWorkers = form.mason_count + form.helper_count + form.women_helper_count

  async function handleSubmit() {
    if (!form.entry_date) { setError('Date required'); return }
    setSaving(true); setError('')
    try {
      const method = editing ? 'PUT' : 'POST'
      const url    = editing ? `/api/entries/${editing.id}` : '/api/entries'
      const body   = {
        ...form,
        payment_amount: parseFloat(form.payment_amount as string) || 0,
        advance_amount: parseFloat(form.advance_amount as string) || 0,
        site_id: form.site_id ? parseInt(form.site_id) : undefined,
      }
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed') }
      onSave()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {isAdmin && sites && (
        <div className="form-section">
          <label className="form-label">Site *</label>
          <select value={form.site_id} onChange={e => f('site_id', e.target.value)} className="input">
            <option value="">Select site</option>
            {sites.filter(s => s.is_active).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-section">
          <label className="form-label">Date *</label>
          <input type="date" value={form.entry_date} onChange={e => f('entry_date', e.target.value)} className="input" />
        </div>
        <div className="form-section">
          <label className="form-label">Location</label>
          <input value={form.location} onChange={e => f('location', e.target.value)} className="input" placeholder="e.g. YPR, Bridge 211" />
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Contractor Name</label>
        <input value={form.contractor_name} onChange={e => f('contractor_name', e.target.value)} className="input" placeholder="Labour contractor" />
      </div>

      {/* Labour Count */}
      <div className="form-section">
        <div className="flex items-center justify-between mb-3">
          <label className="form-label !mb-0">Labour Count</label>
          {totalWorkers > 0 && <span className="badge badge-amber">Total: {totalWorkers}</span>}
        </div>
        <div className="form-grid-3">
          {[
            { key: 'mason_count',        label: 'Mason',        emoji: '🧱', color: 'var(--blue-bg)' },
            { key: 'helper_count',       label: 'Helper',       emoji: '🦺', color: 'var(--green-bg)' },
            { key: 'women_helper_count', label: 'Women Helper', emoji: '👩', color: 'var(--amber-bg)' },
          ].map(({ key, label, emoji, color }) => (
            <div key={key} className="p-4 rounded-2xl text-center" style={{ background: color, border: '1px solid var(--border)' }}>
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--muted)' }}>{label}</div>
              <Counter value={form[key as keyof typeof form] as number} onChange={v => f(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* OT Section */}
      <div className="form-section">
        <div className="flex items-center justify-between mb-3">
          <label className="form-label !mb-0">Overtime (OT)</label>
          <button type="button" onClick={() => setShowOT(v => !v)}
            className="btn btn-secondary btn-sm">
            {showOT ? 'Hide OT' : '+ Add OT'}
          </button>
        </div>

        {showOT && (
          <div className="space-y-3">
            {/* OT rows */}
            {[
              { countKey: 'mason_ot_count',  hoursKey: 'mason_ot_hours',  label: 'Mason OT',        emoji: '🧱', daily: DAILY.mason,  otAmt: masonOT },
              { countKey: 'helper_ot_count', hoursKey: 'helper_ot_hours', label: 'Helper OT',       emoji: '🦺', daily: DAILY.helper, otAmt: helperOT },
              { countKey: 'women_ot_count',  hoursKey: 'women_ot_hours',  label: 'Women Helper OT', emoji: '👩', daily: DAILY.women,  otAmt: womenOT },
            ].map(({ countKey, hoursKey, label, emoji, daily, otAmt }) => (
              <div key={countKey} className="grid gap-3 p-3 rounded-xl" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', background: 'rgba(245,158,11,0.06)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
                    {emoji} {label}
                  </div>
                  <div className="text-[10px] text-muted mb-1">How many workers</div>
                  <input type="number" min="0" value={form[countKey as keyof typeof form] as number}
                    onChange={e => f(countKey, parseInt(e.target.value) || 0)}
                    className="input input-sm" placeholder="0" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide mb-1.5 opacity-0">—</div>
                  <div className="text-[10px] text-muted mb-1">OT hours each</div>
                  <input type="number" min="0" step="0.5" value={form[hoursKey as keyof typeof form] as number}
                    onChange={e => f(hoursKey, parseFloat(e.target.value) || 0)}
                    className="input input-sm" placeholder="0" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide mb-1.5 opacity-0">—</div>
                  <div className="text-[10px] text-muted mb-1">Rate = ₹{daily}/8 = ₹{(daily/8).toFixed(0)}/hr</div>
                  <div className="input input-sm font-black text-amber-600 flex items-center" style={{ color: 'var(--amber-deep)' }}>
                    ₹{otAmt.toFixed(0)}
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-muted">
                    {form[countKey as keyof typeof form] as number > 0 && form[hoursKey as keyof typeof form] as number > 0
                      ? `${form[countKey as keyof typeof form]}×${form[hoursKey as keyof typeof form]}h×₹${(daily/8).toFixed(0)}`
                      : '—'}
                  </div>
                </div>
              </div>
            ))}

            {totalOT > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl font-black"
                style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-ring)' }}>
                <span style={{ color: 'var(--amber-deep)' }}>Total OT Amount</span>
                <span style={{ color: 'var(--amber-deep)', fontSize: '16px' }}>₹{totalOT.toFixed(0)}</span>
              </div>
            )}

            <div>
              <label className="form-label">OT Notes (optional)</label>
              <input value={form.ot_details} onChange={e => f('ot_details', e.target.value)}
                className="input" placeholder="e.g. Emergency work, night shift" />
            </div>
          </div>
        )}

        {!showOT && form.ot_details && (
          <input value={form.ot_details} onChange={e => f('ot_details', e.target.value)}
            className="input" placeholder="OT notes" />
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-section">
          <label className="form-label">Payment (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black" style={{ color: 'var(--muted)' }}>₹</span>
            <input type="number" min="0" value={form.payment_amount}
              onChange={e => f('payment_amount', e.target.value)}
              className="input" style={{ paddingLeft: '30px' }} placeholder="0" />
          </div>
        </div>
        <div className="form-section">
          <label className="form-label">Advance (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black" style={{ color: 'var(--muted)' }}>₹</span>
            <input type="number" min="0" value={form.advance_amount}
              onChange={e => f('advance_amount', e.target.value)}
              className="input" style={{ paddingLeft: '30px' }} placeholder="0" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">Remarks</label>
        <textarea value={form.remarks} onChange={e => f('remarks', e.target.value)}
          className="input resize-none" rows={3} placeholder="Additional notes…" />
      </div>

      {error && <div className="alert alert-error text-sm">⚠ {error}</div>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn btn-secondary flex-1 py-3">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1 py-3">
          {saving ? 'Saving…' : editing ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}
