// ===================================================================
// UB-Share — App Layout
// Main layout wrapper with sidebar and content area
// ===================================================================

import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { IncomingRequestModal } from '@/components/modals/IncomingRequestModal'

export function AppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      <IncomingRequestModal />
    </div>
  )
}
