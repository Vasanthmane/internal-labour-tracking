import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Internal Labour Track',
  description: 'Construction Labour Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink antialiased">{children}</body>
    </html>
  )
}
