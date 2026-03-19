'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, X, AlertCircle } from 'lucide-react'

interface ToastProps { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }
export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const cfg = {
    success: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'var(--green)', border: 'var(--green-border)' },
    error:   { icon: <XCircle className="w-4 h-4" />,      color: 'var(--red)',   border: 'var(--red-border)' },
    info:    { icon: <AlertCircle className="w-4 h-4" />,   color: 'var(--amber)', border: 'var(--amber-ring)' },
  }[type]
  return (
    <div className="fixed bottom-5 right-5 z-[200] anim-up">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'var(--surface)', border: `1px solid ${cfg.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '340px' }}>
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-sm font-medium flex-1" style={{ color: 'var(--ink)' }}>{message}</span>
        <button onClick={onClose} className="btn btn-ghost btn-icon-sm"><X className="w-3 h-3" /></button>
      </div>
    </div>
  )
}
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  return {
    toast,
    showToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type }),
    hideToast: () => setToast(null),
  }
}
