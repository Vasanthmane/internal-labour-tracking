'use client'
import { useEffect, useState } from 'react'
import {
  Plus, User, Building2, Pencil, Trash2, Shield, HardHat,
  Search, Eye, EyeOff, Copy, Check, RefreshCw,
} from 'lucide-react'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import { Toast, useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'

// UI label helper - backend role stays 'manager'
const roleLabel = (role: string) => role === 'admin' ? 'Admin' : 'Site Incharge'
const roleBadgeIcon = (role: string) => role === 'admin' ? <Shield className="w-3 h-3" /> : <HardHat className="w-3 h-3" />

function PwdField({ value, onChange, placeholder = 'Password', required = false }:
  { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  const [show, setShow] = useState(true)
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function generate() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!'
    onChange(Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
    setShow(true)
  }

  const strength = !value ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : 3
  const strColors = ['', 'var(--red)', 'var(--amber)', 'var(--green)']
  const strLabels = ['', 'Weak', 'Good', 'Strong']

  return (
    <div className="form-section">
      <div className="flex items-center justify-between mb-2">
        <label className="form-label !mb-0">{placeholder}</label>
        <button type="button" onClick={generate}
          className="flex items-center gap-1 text-xs font-black"
          style={{ color: 'var(--amber-deep)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw className="w-3 h-3" /> Generate
        </button>
      </div>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          className="input input-mono pr-24"
          placeholder={required ? 'Required' : 'Leave blank to keep current'} />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button type="button" onClick={copy} className="btn btn-ghost btn-icon-sm"
            data-tip={copied ? 'Copied!' : 'Copy'}
            style={{ color: copied ? 'var(--green)' : 'var(--faint)' }}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
          <button type="button" onClick={() => setShow(v => !v)} className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--faint)' }}>
            {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      </div>
      {value && (
        <div className="flex items-center gap-2 mt-2">
          <div className="progress flex-1" style={{ height: '4px' }}>
            <div className="progress-fill" style={{ width: `${(strength / 3) * 100}%`, background: strColors[strength] }} />
          </div>
          <span className="text-xs font-black" style={{ color: strColors[strength] }}>{strLabels[strength]}</span>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ username: '', password: '', full_name: '', site_ids: [] as number[], role: 'manager' })
  const [saving, setSaving] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  async function load() {
    const [m, s] = await Promise.all([
      fetch('/api/managers').then(r => r.json()),
      fetch('/api/sites').then(r => r.json()),
    ])
    setUsers(Array.isArray(m) ? m : [])
    setSites(Array.isArray(s) ? s : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!editing && !form.username.trim()) { showToast('Username required', 'error'); return }
    if (!editing && !form.password) { showToast('Password required', 'error'); return }

    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/managers/${editing.id}` : '/api/managers'
      const body: any = { full_name: form.full_name, role: form.role, site_ids: form.site_ids, site_id: form.site_ids[0] || null }
      if (!editing) { body.username = form.username.trim(); body.password = form.password }
      else if (form.password) body.password = form.password

      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed') }

      await load(); setShowModal(false); setEditing(null)
      setForm({ username: '', password: '', full_name: '', site_ids: [], role: 'manager' })
      showToast(editing ? 'User updated!' : 'User created!')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/managers/${id}`, { method: 'DELETE' })
    await load(); showToast('User deleted')
  }

  function openAdd() {
    setEditing(null); setForm({ username: '', password: '', full_name: '', site_ids: [], role: 'manager' }); setShowModal(true)
  }
  function openEdit(u: any) {
    setEditing(u)
    setForm({ username: u.username, password: '', full_name: u.full_name || '', site_ids: u.site_ids || (u.site_id ? [u.site_id] : []), role: u.role })
    setShowModal(true)
  }
  function toggleSite(siteId: number) {
    setForm(f => ({ ...f, site_ids: f.site_ids.includes(siteId) ? f.site_ids.filter(id => id !== siteId) : [...f.site_ids, siteId] }))
  }

  const filtered = users.filter(u =>
    (!search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.full_name || '').toLowerCase().includes(search.toLowerCase())) &&
    (!filterRole || u.role === filterRole)
  )

  const adminCount    = users.filter(u => u.role === 'admin').length
  const managerCount  = users.filter(u => u.role === 'manager').length

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${adminCount} admin${adminCount !== 1 ? 's' : ''} · ${managerCount} site incharge${managerCount !== 1 ? 's' : ''}`}
        action={
          <button onClick={openAdd} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add User
          </button>
        }
      />

      <div className="filter-shell page-section anim-up d1">
        <div className="input-with-icon flex-1 min-w-[240px]">
          <Search className="input-icon" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input" placeholder="Search by name or username…" />
        </div>
        <div className="tabs" style={{ width: '260px' }}>
          <button className={`tab ${filterRole === '' ? 'active' : ''}`} onClick={() => setFilterRole('')}>All</button>
          <button className={`tab ${filterRole === 'admin' ? 'active' : ''}`} onClick={() => setFilterRole('admin')}>Admin</button>
          <button className={`tab ${filterRole === 'manager' ? 'active' : ''}`} onClick={() => setFilterRole('manager')}>Site Incharge</button>
        </div>
      </div>

      {loading ? (
        <div className="card">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 m-3" />)}</div>
      ) : (
        <div className="card page-table-card anim-up d2">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th><th>Username</th><th>Role</th><th>Assigned Sites</th><th>Created</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>{search ? 'No results' : 'No users yet'}</p>
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.id} className="anim-up" style={{ animationDelay: `${i * 20}ms` }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                          style={{ background: u.role === 'admin' ? 'var(--blue)' : 'var(--amber)' }}>
                          {((u.full_name || u.username) || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>
                            {u.full_name || <span className="text-faint italic">No name</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs px-2.5 py-1 rounded-xl" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                        {u.username}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-amber'}`}>
                        {roleBadgeIcon(u.role)} {roleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(u.site_names || (u.site_name ? [u.site_name] : [])).map((n: string) => (
                          <span key={n} className="badge badge-muted" style={{ fontSize: '10px' }}>{n}</span>
                        ))}
                        {!u.site_name && !u.site_names?.length && <span className="text-xs italic text-faint">Unassigned</span>}
                      </div>
                    </td>
                    <td className="text-sm text-muted">{formatDate(u.created_at)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn btn-ghost btn-icon" data-tip="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(u.id, u.full_name || u.username)}
                          className="btn btn-ghost btn-icon btn-danger" data-tip="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit User' : 'Add New User'}
        subtitle={editing ? `@${editing.username}` : 'Create a new admin or site incharge account'}
        width="max-w-3xl">
        <div className="space-y-5">
          <div className="form-section">
            <label className="form-label">Role *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: 'manager', icon: '👷', label: 'Site Incharge', sub: 'Sees only assigned sites' },
                { v: 'admin',   icon: '⚡', label: 'Admin',          sub: 'Full access to everything' },
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, role: opt.v }))}
                  className="p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: form.role === opt.v ? (opt.v === 'admin' ? 'var(--blue-bg)' : 'var(--amber-bg)') : 'rgba(255,255,255,0.72)',
                    border: `1.5px solid ${form.role === opt.v ? (opt.v === 'admin' ? 'var(--blue)' : 'var(--amber)') : 'var(--border)'}`,
                  }}>
                  <div className="text-2xl mb-1.5">{opt.icon}</div>
                  <div className="text-sm font-black" style={{ color: form.role === opt.v ? (opt.v === 'admin' ? 'var(--blue-dk)' : 'var(--amber-deep)') : 'var(--ink)' }}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-2">
            {!editing ? (
              <div className="form-section">
                <label className="form-label">Username *</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="input input-mono" placeholder="e.g. channa, salman" />
                <p className="text-xs mt-2 text-muted">Lowercase, no spaces. Used to log in.</p>
              </div>
            ) : (
              <div className="form-section">
                <label className="form-label">Username</label>
                <div className="input input-mono flex items-center" style={{ opacity: 0.7 }}>{form.username}</div>
              </div>
            )}
            <div className="form-section">
              <label className="form-label">Full Name</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="input" placeholder="Full name" />
            </div>
          </div>

          <PwdField value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))}
            placeholder={editing ? 'New Password (optional)' : 'Password'} required={!editing} />

          {form.role === 'manager' && (
            <div className="form-section">
              <label className="form-label">
                Assign Sites
                {form.site_ids.length > 0 && <span className="badge badge-amber ml-2">{form.site_ids.length} selected</span>}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {sites.filter(s => s.is_active).map((s: any) => {
                  const selected = form.site_ids.includes(s.id)
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSite(s.id)}
                      className="flex items-center gap-2 p-3 rounded-xl text-left transition-all"
                      style={{ background: selected ? 'var(--amber-bg)' : 'rgba(255,255,255,0.62)', border: `1px solid ${selected ? 'var(--amber)' : 'var(--border)'}` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: selected ? 'var(--amber)' : 'var(--surface-4)', color: selected ? 'white' : 'var(--muted)' }}>
                        {selected ? <Check className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-bold truncate" style={{ color: selected ? 'var(--amber-deep)' : 'var(--ink)' }}>{s.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowModal(false); setEditing(null) }} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 py-2.5">
              {saving ? 'Saving…' : editing ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
