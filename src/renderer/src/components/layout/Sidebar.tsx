// ===================================================================
// UB-Share — Sidebar (v5 — collapsible, centered icons)
// ===================================================================

import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, ArrowUpDown, History, Settings, Share2,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useTransferStore } from '@/stores/transfer-store'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/peers', label: 'Discover Peers', icon: Search },
  { to: '/transfers', label: 'Active Transfers', icon: ArrowUpDown },
  { to: '/history', label: 'Transfer History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const location = useLocation()
  const { isConnected, sidebarCollapsed, toggleSidebar } = useAppStore()
  const activeCount = useTransferStore((s) =>
    (s.activeTransfers ?? []).filter((t) => t.status === 'active' || t.status === 'paused').length
  )

  const c = sidebarCollapsed
  const statusColor = isConnected ? 'connected' : 'offline'
  const statusLabel = isConnected ? 'Online' : 'Offline'

  return (
    <aside className={`sidebar ${c ? 'collapsed' : ''}`}>
      <div className="h-8 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Logo */}
      <div className={`sidebar-content mb-6 ${c ? 'flex justify-center px-0' : 'px-5'}`}>
        <div className={`sidebar-logo flex items-center ${c ? 'justify-center' : 'gap-3'}`}>
          <div className="sidebar-logo-icon">
            <Share2 className="w-4 h-4 text-[hsl(0,0%,5%)]" />
          </div>
          {!c && (
            <div>
              <h1 className="text-[14px] font-bold text-[hsl(0,0%,95%)] tracking-tight whitespace-nowrap">UB-Share</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`status-dot ${statusColor}`} style={{ width: 6, height: 6 }} />
                <span className="text-[11px] text-[hsl(0,0%,50%)] whitespace-nowrap">{statusLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`sidebar-content flex-1 space-y-1 ${c ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          const showBadge = to === '/transfers' && activeCount > 0
          return (
            <NavLink key={to} to={to} title={c ? label : undefined}
              className={() => `nav-item relative ${isActive ? 'active' : ''}`}>
              <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
              {!c && <span className="flex-1">{label}</span>}
              {showBadge && <span className="badge-count">{activeCount}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className={`sidebar-content py-2 ${c ? 'px-2' : 'px-3'}`}>
        <button onClick={toggleSidebar} title={c ? 'Expand sidebar' : 'Collapse sidebar'}
          className="nav-item">
          {c
            ? <PanelLeftOpen className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
            : <PanelLeftClose className="w-[17px] h-[17px] shrink-0" strokeWidth={1.75} />
          }
          {!c && <span className="flex-1">Collapse</span>}
        </button>
      </div>

      {/* Footer */}
      {!c && (
        <div className="sidebar-content px-5 py-4 border-t border-[hsl(0,0%,13%)]">
          <p className="text-[10px] text-[hsl(0,0%,30%)] font-medium tracking-wider uppercase whitespace-nowrap">
            UB-Share v1.0.0
          </p>
        </div>
      )}
    </aside>
  )
}
