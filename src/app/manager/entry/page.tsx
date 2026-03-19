'use client'
import { useEffect, useState } from 'react'
import { PlusCircle, CheckCircle2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import EntryForm from '@/components/EntryForm'
import { Toast, useToast } from '@/components/Toast'

export default function ManagerEntryPage() {
  const [user, setUser] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [key, setKey] = useState(0)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(setUser) }, [])

  function handleSave() {
    setSaved(true); showToast('Entry logged successfully!')
    setTimeout(() => setSaved(false), 4000)
    setKey(k => k + 1)
  }

  return (
    <div>
      <PageHeader title="Log Labour Entry" subtitle={`Site: ${user?.siteName || '—'}`} />

      {saved && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-5 page-enter"
          style={{ background: 'rgba(21,128,61,0.06)', border: '1.5px solid rgba(21,128,61,0.2)' }}>
          <CheckCircle2 className="w-5 h-5 text-green shrink-0" />
          <div>
            <div className="text-sm font-bold text-green">Entry saved!</div>
            <div className="text-xs text-muted">You can log another entry below or view all entries.</div>
          </div>
          <a href="/manager/entries" className="ml-auto text-xs font-semibold text-amber-DEFAULT hover:underline">View entries →</a>
        </div>
      )}

      <div className="card p-6 page-enter" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(196,122,14,0.1)' }}>
            <PlusCircle className="w-5 h-5 text-amber-DEFAULT" />
          </div>
          <div>
            <div className="font-bold text-ink text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>New Labour Entry</div>
            <div className="text-xs text-muted">Fill in today's labour attendance details</div>
          </div>
        </div>
        {user && <EntryForm key={key} siteId={user.siteId} onSave={handleSave} onCancel={() => window.history.back()} />}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
