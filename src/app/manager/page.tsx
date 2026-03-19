'use client'
import { useEffect, useState } from 'react'
import { HardHat, IndianRupee, TrendingUp, PlusCircle, ArrowUpRight } from 'lucide-react'
import StatCard from '@/components/StatCard'
import PageHeader from '@/components/PageHeader'
import { formatINR, formatDate } from '@/lib/utils'

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/dashboard').then(r => r.json()),
    ]).then(([u, d]) => { setUser(u); setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-64 bg-s3 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-s3 rounded-2xl" />)}</div>
      <div className="grid grid-cols-5 gap-5"><div className="col-span-3 h-72 bg-s3 rounded-2xl" /><div className="col-span-2 h-72 bg-s3 rounded-2xl" /></div>
    </div>
  )

  const t = data?.totals
  const recent = data?.recentEntries || []
  const contractors = data?.contractorBreakdown || []

  return (
    <div>
      <PageHeader
        title={`${user?.siteName || 'My Site'} Overview`}
        subtitle={`${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · ${user?.fullName}`}
        action={
          <a href="/manager/entry" className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
            <PlusCircle className="w-4 h-4" /> Log Entry
          </a>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Workers Today" value={t?.workers_today || 0} sub="at your site" icon={<HardHat className="w-4 h-4" />} accent="amber" delay={0} />
        <StatCard label="Entries (Month)" value={t?.entries_month || 0} icon={<TrendingUp className="w-4 h-4" />} delay={60} />
        <StatCard label="Payment (Month)" value={formatINR(t?.payment_this_month)} icon={<IndianRupee className="w-4 h-4" />} delay={120} />
        <StatCard label="Advance (Month)" value={formatINR(t?.advance_this_month)} icon={<IndianRupee className="w-4 h-4" />} delay={180} />
      </div>

      {/* Labour breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Mason Man-Days', value: t?.masons_month || 0, color: '#1D4ED8', bg: 'rgba(29,78,216,0.05)', emoji: '🧱' },
          { label: 'Helper Man-Days', value: t?.helpers_month || 0, color: '#15803D', bg: 'rgba(21,128,61,0.05)', emoji: '🦺' },
          { label: 'Women Helper Man-Days', value: t?.women_month || 0, color: '#C47A0E', bg: 'rgba(196,122,14,0.05)', emoji: '👩' },
        ].map(({ label, value, color, bg, emoji }, i) => (
          <div key={label} className="card p-4 page-enter" style={{ background: bg, borderColor: `${color}22`, animationDelay: `${220+i*40}ms` }}>
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color }}>{value}</div>
            <div className="text-xs text-muted mt-0.5">this month</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Recent entries */}
        <div className="col-span-3 card overflow-hidden page-enter" style={{ animationDelay: '340ms' }}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>Recent Entries</h2>
              <p className="text-xs text-muted mt-0.5">Your recent labour logs</p>
            </div>
            <a href="/manager/entries" className="text-xs font-semibold text-amber-DEFAULT flex items-center gap-1 hover:underline">
              All entries <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contractor</th>
                  <th>Location</th>
                  <th className="text-center">M / H / W</th>
                  <th className="text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted text-sm">
                    No entries yet. <a href="/manager/entry" className="text-amber-DEFAULT hover:underline font-semibold">Log your first entry →</a>
                  </td></tr>
                ) : recent.map((e: any) => (
                  <tr key={e.id}>
                    <td className="text-sm whitespace-nowrap font-medium">{formatDate(e.entry_date)}</td>
                    <td className="font-semibold text-sm">{e.contractor_name || '—'}</td>
                    <td className="text-muted text-sm">{e.location || '—'}</td>
                    <td className="text-center text-sm">
                      <span style={{ color: '#1D4ED8' }}>{e.mason_count}</span>
                      <span className="text-faint mx-1">/</span>
                      <span style={{ color: '#15803D' }}>{e.helper_count}</span>
                      <span className="text-faint mx-1">/</span>
                      <span style={{ color: '#C47A0E' }}>{e.women_helper_count}</span>
                    </td>
                    <td className="text-right font-semibold text-green text-sm">
                      {Number(e.payment_amount) > 0 ? formatINR(e.payment_amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contractor breakdown */}
        <div className="col-span-2 card overflow-hidden page-enter" style={{ animationDelay: '400ms' }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>Contractor Breakdown</h2>
            <p className="text-xs text-muted mt-0.5">This month</p>
          </div>
          <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: '320px' }}>
            {contractors.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted text-sm">No contractor data this month</div>
            ) : contractors.map((c: any) => (
              <div key={c.contractor_name} className="px-4 py-3 hover:bg-s2 transition-colors">
                <div className="font-semibold text-sm text-ink mb-1.5">{c.contractor_name || 'Unknown'}</div>
                <div className="flex gap-3 text-xs text-muted mb-1.5">
                  <span>🧱 {c.total_masons} M</span>
                  <span>🦺 {c.total_helpers} H</span>
                  <span>👩 {c.total_women} W</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Paid: <span className="text-green font-semibold">{formatINR(c.total_payment)}</span></span>
                  {Number(c.total_advance) > 0 && <span className="text-muted">Adv: {formatINR(c.total_advance)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
