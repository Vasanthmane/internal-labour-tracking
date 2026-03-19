'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { HardHat, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      router.push(data.role === 'admin' ? '/admin' : '/manager')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-page grid-bg">
      <div className="w-full max-w-sm anim-up" style={{ padding: '16px' }}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'var(--amber)', boxShadow: '0 8px 24px rgba(217,119,6,0.3)' }}>
            <HardHat className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-bold text-3xl leading-none mb-1" style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: 'var(--ink)' }}>
            Labour Track
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Internal Management System</p>
        </div>

        <div className="card card-lg" style={{ padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div className="h-0.5 rounded-full mb-6" style={{ background: 'linear-gradient(90deg, var(--amber), var(--amber-lt), transparent)' }} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input" placeholder="Enter your username" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="Enter password" required />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="alert alert-error text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg> Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-5 font-medium" style={{ color: 'var(--faint)' }}>
          Internal use only · Confidential
        </p>
      </div>
    </div>
  )
}
