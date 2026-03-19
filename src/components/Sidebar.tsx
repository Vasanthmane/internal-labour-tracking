'use client'
import { usePathname, useRouter } from 'next/navigation'
import {
  HardHat, LayoutDashboard, Building2, Users, ClipboardList,
  LogOut, PlusCircle, Calculator, ChevronRight, Shield, Menu, X, IndianRupee,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface SidebarProps {
  role: 'admin' | 'manager'
  fullName: string
  siteName?: string
}

export default function Sidebar({ role, fullName, siteName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const adminLinks = [
    { href: '/admin',                    icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/sites',              icon: Building2,       label: 'Sites' },
    { href: '/admin/managers',           icon: Users,           label: 'Users' },
    { href: '/admin/entries',            icon: ClipboardList,   label: 'All Entries' },
    { href: '/admin/pay-calculator',     icon: Calculator,      label: 'Pay Calculator' },
    { href: '/admin/payment-records',    icon: IndianRupee,     label: 'Payment Records' },
  ]

  const managerLinks = [
    { href: '/manager',          icon: LayoutDashboard, label: 'Overview' },
    { href: '/manager/entry',    icon: PlusCircle,      label: 'Log Entry' },
    { href: '/manager/entries',  icon: ClipboardList,   label: 'My Entries' },
  ]

  const links = role === 'admin' ? adminLinks : managerLinks

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  function isActive(href: string) {
    if (href === '/admin' || href === '/manager') return pathname === href
    return pathname.startsWith(href)
  }

  const initials = (fullName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // UI label for role badge
  const roleBadgeLabel = role === 'admin' ? 'Admin' : 'SI'
  const roleSubLabel   = role === 'admin' ? 'System Administrator' : siteName || 'Site Incharge'

  function SidebarContent() {
    return (
      <div className="sidebar-inner">
        {/* Brand */}
        <div className="px-4 py-4 sidebar-brand"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)', boxShadow: '0 10px 24px rgba(22,163,74,0.28)' }}>
              <HardHat className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-black text-sm leading-tight"
                style={{ color: '#f8fafc', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Labour Track
              </div>
              <div className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.58)', letterSpacing: '0.14em' }}>
                Internal
              </div>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-3 py-3 sidebar-user" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
              style={{
                background: role === 'admin' ? 'linear-gradient(135deg,#dc2626 0%,#ef4444 100%)' : 'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)',
                boxShadow: role === 'admin' ? '0 10px 22px rgba(220,38,38,0.24)' : '0 10px 22px rgba(22,163,74,0.24)',
              }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate" style={{ color: '#f8fafc' }}>{fullName}</div>
              <div className="text-[10px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.58)' }}>{roleSubLabel}</div>
            </div>
            <span className="badge" style={{
              fontSize: '10px', padding: '2px 8px',
              background: role === 'admin' ? 'rgba(220,38,38,0.16)' : 'rgba(22,163,74,0.16)',
              color: role === 'admin' ? '#fecaca' : '#bbf7d0',
              border: role === 'admin' ? '1px solid rgba(220,38,38,0.18)' : '1px solid rgba(22,163,74,0.18)',
            }}>
              {roleBadgeLabel}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto sidebar-nav">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] px-2 mb-2"
            style={{ color: 'rgba(255,255,255,0.42)' }}>
            {role === 'admin' ? 'Workspace' : 'Site Operations'}
          </div>
          {links.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <a key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}
                style={active ? {
                  background: role === 'admin'
                    ? 'linear-gradient(135deg,rgba(220,38,38,0.22),rgba(239,68,68,0.10))'
                    : 'linear-gradient(135deg,rgba(22,163,74,0.24),rgba(34,197,94,0.10))',
                  borderLeftColor: role === 'admin' ? '#ef4444' : '#22c55e',
                  boxShadow: role === 'admin'
                    ? 'inset 0 0 0 1px rgba(239,68,68,0.08),0 8px 18px rgba(220,38,38,0.10)'
                    : 'inset 0 0 0 1px rgba(34,197,94,0.08),0 8px 18px rgba(22,163,74,0.10)',
                } : undefined}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-[13px]">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />}
              </a>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pt-3 pb-4 sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-3 px-3 py-2.5 rounded-xl sidebar-secure-card"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5" style={{ color: '#86efac' }} />
              <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: '#dcfce7' }}>Secure Access</span>
            </div>
            <div className="text-[11px] leading-4" style={{ color: 'rgba(255,255,255,0.56)' }}>
              Authenticated internal operations panel
            </div>
          </div>
          <button onClick={handleLogout} disabled={loggingOut} className="nav-item w-full"
            style={{ color: '#fecaca', background: 'linear-gradient(135deg,rgba(220,38,38,0.10),rgba(220,38,38,0.04))', border: '1px solid rgba(220,38,38,0.10)' }}>
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-[13px]">{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="mobile-topbar">
        <button type="button" onClick={() => setMobileOpen(true)} className="mobile-menu-btn" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#16a34a 0%,#22c55e 100%)', boxShadow: '0 10px 24px rgba(22,163,74,0.20)' }}>
            <HardHat className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-display font-black text-sm leading-tight truncate"
              style={{ color: 'var(--ink)', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Labour Track
            </div>
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
              {role === 'admin' ? 'Admin Panel' : siteName || 'Site Incharge Panel'}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="sidebar desktop-sidebar"
        style={{ background: 'radial-gradient(circle at top left,rgba(22,163,74,0.14),transparent 20%),radial-gradient(circle at bottom left,rgba(220,38,38,0.14),transparent 18%),linear-gradient(180deg,#07130b 0%,#0b1f13 40%,#1f0a0a 100%)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button type="button" className="mobile-sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
      )}

      {/* Mobile drawer */}
      <aside className={`mobile-sidebar ${mobileOpen ? 'open' : ''}`}
        style={{ background: 'radial-gradient(circle at top left,rgba(22,163,74,0.14),transparent 20%),radial-gradient(circle at bottom left,rgba(220,38,38,0.14),transparent 18%),linear-gradient(180deg,#07130b 0%,#0b1f13 40%,#1f0a0a 100%)' }}>
        <div className="flex items-center justify-end px-3 pt-3">
          <button type="button" onClick={() => setMobileOpen(false)} className="mobile-menu-btn" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>
    </>
  )
}
