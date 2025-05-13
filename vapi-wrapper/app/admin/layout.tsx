import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Vapi Receptionist',
  description: 'Admin control panel for Vapi Receptionist SaaS',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="admin-layout">
      {/* Admin-specific header or other UI elements could go here */}
      {children}
      
      {/* Admin footer with version info */}
      <footer className="mt-8 pt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <p className="text-center text-xs text-gray-500">
            <span className="font-semibold">Admin Portal</span> • Vapi Receptionist SaaS • v1.0.0
          </p>
        </div>
      </footer>
    </div>
  )
} 