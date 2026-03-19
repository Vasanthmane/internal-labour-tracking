'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: string
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-in"
      style={{
        background: 'rgba(11, 8, 5, 0.52)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${width} card card-lg modal-panel anim-up max-h-[90vh] flex flex-col`}
      >
        <div
          className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(145,102,46,0.10)' }}
        >
          <div className="pr-4">
            <div
              className="inline-flex items-center rounded-full px-3 py-1 mb-2 text-[10px] font-black uppercase tracking-[0.16em]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,191,105,0.20), rgba(255,159,28,0.10))',
                color: 'var(--amber-deep)',
                border: '1px solid rgba(255,159,28,0.16)',
              }}
            >
              Secure Edit Panel
            </div>
            <h2
              className="font-display font-black text-xl text-ink"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
            >
              {title}
            </h2>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
