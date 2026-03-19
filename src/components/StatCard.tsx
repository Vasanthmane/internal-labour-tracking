interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent?: 'amber' | 'green' | 'red' | 'blue' | 'purple'
  delta?: { value: number; label: string }
  delay?: number
  onClick?: () => void
}

const accents = {
  amber: {
    bg: 'linear-gradient(135deg, rgba(255,251,235,1) 0%, rgba(254,243,199,1) 100%)',
    border: 'rgba(245,158,11,0.24)',
    iconBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    icon: '#fff',
    val: 'var(--amber-deep)',
    glow: '0 14px 34px rgba(245,158,11,0.14)',
    stripe: 'linear-gradient(90deg, rgba(245,158,11,0.8), rgba(245,158,11,0))',
  },
  green: {
    bg: 'linear-gradient(135deg, rgba(240,253,244,1) 0%, rgba(220,252,231,1) 100%)',
    border: 'rgba(22,163,74,0.26)',
    iconBg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    icon: '#fff',
    val: 'var(--green-dk)',
    glow: '0 14px 38px rgba(22,163,74,0.16)',
    stripe: 'linear-gradient(90deg, rgba(22,163,74,0.85), rgba(22,163,74,0))',
  },
  red: {
    bg: 'linear-gradient(135deg, rgba(254,242,242,1) 0%, rgba(fee2e2,1) 100%)',
    border: 'rgba(220,38,38,0.24)',
    iconBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icon: '#fff',
    val: 'var(--red-dk)',
    glow: '0 14px 38px rgba(220,38,38,0.14)',
    stripe: 'linear-gradient(90deg, rgba(220,38,38,0.85), rgba(220,38,38,0))',
  },
  blue: {
    bg: 'linear-gradient(135deg, rgba(239,246,255,1) 0%, rgba(219,234,254,1) 100%)',
    border: 'rgba(37,99,235,0.22)',
    iconBg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    icon: '#fff',
    val: 'var(--blue-dk)',
    glow: '0 14px 38px rgba(37,99,235,0.14)',
    stripe: 'linear-gradient(90deg, rgba(37,99,235,0.85), rgba(37,99,235,0))',
  },
  purple: {
    bg: 'linear-gradient(135deg, rgba(245,243,255,1) 0%, rgba(233,213,255,1) 100%)',
    border: 'rgba(124,58,237,0.22)',
    iconBg: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    icon: '#fff',
    val: 'var(--purple-dk)',
    glow: '0 14px 38px rgba(124,58,237,0.14)',
    stripe: 'linear-gradient(90deg, rgba(124,58,237,0.85), rgba(124,58,237,0))',
  },
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  delta,
  delay = 0,
  onClick,
}: StatCardProps) {
  const a = accent ? accents[accent] : null

  return (
    <div
      className={`kpi-card anim-up ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: a ? a.bg : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: a ? a.border : 'var(--border)',
        animationDelay: `${delay}ms`,
        boxShadow: a ? a.glow : 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onClick}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '100%',
          height: '4px',
          background: a ? a.stripe : 'linear-gradient(90deg, rgba(22,163,74,0.7), rgba(22,163,74,0))',
        }}
      />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <span className="kpi-label">{label}</span>
        <div
          className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
          style={{
            background: a ? a.iconBg : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: a ? a.icon : '#fff',
            boxShadow: '0 10px 22px rgba(15,23,42,0.12)',
          }}
        >
          {icon}
        </div>
      </div>

      <div
        className="kpi-value relative z-10"
        style={{
          color: a ? a.val : 'var(--ink)',
          fontSize: typeof value === 'number' ? '36px' : '31px',
        }}
      >
        {value}
      </div>

      {sub && <p className="kpi-sub mt-1.5 relative z-10">{sub}</p>}

      {delta && (
        <div
          className={`flex items-center gap-1.5 mt-3 text-xs font-extrabold relative z-10 ${
            delta.value >= 0 ? 'text-green' : 'text-red'
          }`}
        >
          <span>{delta.value >= 0 ? '▲' : '▼'} {Math.abs(delta.value)}%</span>
          <span className="text-faint font-semibold">{delta.label}</span>
        </div>
      )}
    </div>
  )
}
