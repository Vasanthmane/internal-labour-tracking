interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 anim-up">
      <div className="min-w-0">
        <div
          className="inline-flex items-center rounded-full px-3 py-1.5 mb-3 text-[11px] font-black uppercase tracking-[0.18em]"
          style={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(220,38,38,0.10))',
            color: 'var(--ink-2)',
            border: '1px solid rgba(22,163,74,0.14)',
            boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
          }}
        >
          Operations Control Center
        </div>

        <h1
          className="font-display font-black leading-[0.93] tracking-[-0.04em]"
          style={{
            fontFamily: 'Bricolage Grotesque, sans-serif',
            color: 'var(--ink)',
            fontSize: 'clamp(2.2rem, 3.6vw, 3.8rem)',
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="text-sm md:text-base mt-2 max-w-2xl font-semibold"
            style={{ color: 'var(--muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="md:ml-4 shrink-0 flex items-center">{action}</div>}
    </div>
  )
}
