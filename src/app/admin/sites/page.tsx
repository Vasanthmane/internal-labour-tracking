'use client'
import { useEffect, useState } from 'react'
import { Plus, Building2, Users, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import Modal from '@/components/Modal'
import PageHeader from '@/components/PageHeader'
import { Toast, useToast } from '@/components/Toast'

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  async function load() {
    const r = await fetch('/api/sites'); setSites(await r.json()); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const r = await fetch(editing ? `/api/sites/${editing.id}` : '/api/sites', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc }),
      })
      if (!r.ok) throw new Error()
      await load(); setShowAdd(false); setEditing(null); setName(''); setDesc('')
      showToast(editing ? 'Site updated!' : 'Site created!')
    } catch { showToast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  async function toggleActive(site: any) {
    await fetch(`/api/sites/${site.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !site.is_active }),
    })
    await load(); showToast(`Site ${!site.is_active ? 'activated' : 'deactivated'}`)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete site? All entries will be permanently lost.')) return
    await fetch(`/api/sites/${id}`, { method: 'DELETE' }); await load(); showToast('Site deleted')
  }

  const activeSites = sites.filter(s => s.is_active).length

  return (
    <div>
      <PageHeader
        title="Sites"
        subtitle={`${activeSites} active · ${sites.length - activeSites} inactive`}
        action={
          <button onClick={() => { setEditing(null); setName(''); setDesc(''); setShowAdd(true) }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
            <Plus className="w-4 h-4" /> Add Site
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-s3 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site, i) => (
            <div key={site.id} className={`stat-card card p-5 page-enter ${!site.is_active ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: site.is_active ? 'rgba(196,122,14,0.1)' : '#FAF8F4' }}>
                  <Building2 className="w-5 h-5" style={{ color: site.is_active ? '#C47A0E' : '#B0A496' }} />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(site); setName(site.name); setDesc(site.description || ''); setShowAdd(true) }}
                    className="btn-ghost w-8 h-8 flex items-center justify-center" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(site)} className="btn-ghost w-8 h-8 flex items-center justify-center" title={site.is_active ? 'Deactivate' : 'Activate'}>
                    {site.is_active ? <ToggleRight className="w-4 h-4 text-green" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(site.id)} className="btn-ghost w-8 h-8 flex items-center justify-center hover:!text-red hover:!border-red">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-black text-ink mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{site.name}</h3>
              {site.description && <p className="text-xs text-muted mb-3 line-clamp-2">{site.description}</p>}

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Users className="w-3.5 h-3.5" />{site.manager_count || 0} user{site.manager_count !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  📋 {site.entry_count || 0} entries
                </div>
                <span className="badge ml-auto" style={{
                  background: site.is_active ? 'rgba(21,128,61,0.08)' : 'rgba(176,164,150,0.08)',
                  color: site.is_active ? '#15803D' : '#B0A496',
                }}>
                  {site.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? 'Edit Site' : 'Add New Site'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Site Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field w-full px-4 py-3 text-sm"
              placeholder="e.g. Zone J, Guntakal, Calicut" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              className="input-field w-full px-4 py-3 text-sm resize-none" rows={3}
              placeholder="Optional description..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowAdd(false); setEditing(null) }} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary flex-1 py-2.5 text-sm">
              {saving ? 'Saving...' : editing ? 'Update Site' : 'Create Site'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
