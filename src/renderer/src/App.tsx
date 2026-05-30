// ===================================================================
// UB-Share — App Root
// React Router setup with page transitions
// ===================================================================

import React, { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { useTheme } from '@/hooks/use-theme'
import { useSettings } from '@/hooks/use-settings'

// Lazy-load pages for better startup performance
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const DiscoverPeers = lazy(() => import('@/pages/DiscoverPeers'))
const ActiveTransfers = lazy(() => import('@/pages/ActiveTransfers'))
const TransferHistory = lazy(() => import('@/pages/TransferHistory'))
const Settings = lazy(() => import('@/pages/Settings'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[hsl(230,80%,56%)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  useSettings()   // load settings on startup
  useTheme()      // apply theme to DOM

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/peers"
            element={
              <Suspense fallback={<PageLoader />}>
                <DiscoverPeers />
              </Suspense>
            }
          />
          <Route
            path="/transfers"
            element={
              <Suspense fallback={<PageLoader />}>
                <ActiveTransfers />
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<PageLoader />}>
                <TransferHistory />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}
