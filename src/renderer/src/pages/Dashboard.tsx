// ===================================================================
// UB-Share — Dashboard (v3 — neutral)
// ===================================================================

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpCircle, ArrowDownCircle, Users, Activity,
  Plus, Search, ArrowUpDown, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { PageHeader, StatCard } from '@/components/shared/SharedComponents'
import { TransferCard } from '@/components/transfers/TransferCard'
import { useTransfers } from '@/hooks/use-transfers'
import { usePeers } from '@/hooks/use-peers'
import { formatFileSize } from '@/lib/format'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import type { AnalyticsData } from '@shared/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { activeTransfers, transferHistory, pauseTransfer, resumeTransfer, cancelTransfer } = useTransfers()
  const { peers } = usePeers()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  useEffect(() => { window.ubshare.getAnalytics().then(setAnalytics) }, [])

  const recentTransfers = [...activeTransfers, ...transferHistory.filter((h) => !activeTransfers.some((a) => a.id === h.id))].slice(0, 5)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <PageHeader title="Dashboard" description="Overview of your UB-Share activity" />

      {/* Stats */}
      <motion.div variants={fadeUpVariants} className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <StatCard label="Total Uploaded" value={formatFileSize(analytics?.totalUploaded ?? 0)} icon={ArrowUpCircle} />
        <StatCard label="Total Downloaded" value={formatFileSize(analytics?.totalDownloaded ?? 0)} icon={ArrowDownCircle} />
        <StatCard label="Active Transfers" value={String(activeTransfers.filter((t) => t.status === 'active').length)} icon={Activity} />
        <StatCard label="Online Peers" value={String(peers.length)} icon={Users} />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUpVariants} className="flex flex-wrap gap-2 mb-6">
        <button onClick={async () => { const f = await window.ubshare.selectFile(); if (f) await window.ubshare.addSharedFile(f) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Share a File
        </button>
        <button onClick={() => navigate('/peers')} className="btn-secondary">
          <Search className="w-4 h-4" /> Browse Peers
        </button>
        <button onClick={() => navigate('/transfers')} className="btn-secondary">
          <ArrowUpDown className="w-4 h-4" /> View Transfers
        </button>
      </motion.div>

      {/* Summary Row */}
      {analytics && (
        <motion.div variants={fadeUpVariants} className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {[
            { icon: CheckCircle2, color: '158 64% 52%', val: analytics.successfulTransfers, label: 'Successful' },
            { icon: XCircle, color: '0 72% 55%', val: analytics.failedTransfers, label: 'Failed' },
            { icon: Clock, color: '200 70% 55%', val: activeTransfers.filter((t) => t.status === 'paused').length, label: 'Resumable' },
          ].map(({ icon: I, color, val, label }) => (
            <div key={label} className="card-surface p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `hsla(${color}, 0.08)`, border: `1px solid hsla(${color}, 0.1)` }}>
                <I className="w-4 h-4" style={{ color: `hsl(${color})` }} />
              </div>
              <div>
                <p className="text-lg font-bold text-[hsl(0,0%,95%)]">{val}</p>
                <p className="text-[12px] text-[hsl(0,0%,50%)]">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Recent Activity */}
      <motion.div variants={fadeUpVariants}>
        <h2 className="text-[11px] font-bold text-[hsl(0,0%,38%)] uppercase tracking-[0.08em] mb-4">
          Recent Activity
        </h2>
        {recentTransfers.length > 0 ? (
          <div className="space-y-2">
            {recentTransfers.map((t, i) => (
              <TransferCard key={t.id} transfer={t} index={i} onPause={pauseTransfer} onResume={resumeTransfer} onCancel={cancelTransfer} compact />
            ))}
          </div>
        ) : (
          <div className="card-surface p-12 text-center">
            <div className="empty-state-icon mx-auto">
              <Activity className="w-6 h-6 text-[hsl(0,0%,30%)]" />
            </div>
            <p className="text-[14px] font-medium text-[hsl(0,0%,75%)] mb-1">No recent activity</p>
            <p className="text-[12px] text-[hsl(0,0%,42%)]">Start by sharing a file or browsing peers</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
