import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user || user.role !== 'manager') redirect('/')

  return (
    <div className="min-h-screen">
      <Sidebar role="manager" fullName={user.fullName} siteName={user.siteName} />
      <main className="page-main page-main-manager" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
