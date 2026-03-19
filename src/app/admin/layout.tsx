import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user || user.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen">
      <Sidebar role="admin" fullName={user.fullName} />
      <main className="page-main" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
