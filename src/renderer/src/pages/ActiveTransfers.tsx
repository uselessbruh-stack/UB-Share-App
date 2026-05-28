// ===================================================================
// UB-Share — Active Transfers (v3 — neutral)
// ===================================================================

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared/SharedComponents'
import { TransferCard } from '@/components/transfers/TransferCard'
import { useTransfers } from '@/hooks/use-transfers'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

type TabFilter = 'all' | 'uploads' | 'downloads'

export default function ActiveTransfers() {
  const { activeTransfers, pauseTransfer, resumeTransfer, cancelTransfer, retryTransfer } = useTransfers()
  const [tab, setTab] = useState<TabFilter>('all')

  const uploads = activeTransfers.filter((t) => t.direction === 'upload')
  const downloads = activeTransfers.filter((t) => t.direction === 'download')
  const filtered = tab === 'uploads' ? uploads : tab === 'downloads' ? downloads : activeTransfers

  const tabs: { key: TabFilter; label: string; count: number; icon: React.FC<{ className?: string }> }[] = [
    { key: 'all', label: 'All', count: activeTransfers.length, icon: ArrowUpDown },
    { key: 'uploads', label: 'Uploads', count: uploads.length, icon: ArrowUp },
    { key: 'downloads', label: 'Downloads', count: downloads.length, icon: ArrowDown }
  ]

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <PageHeader title="Active Transfers"
        description={`${activeTransfers.length} active transfer${activeTransfers.length !== 1 ? 's' : ''}`} />

      <motion.div variants={fadeUpVariants} className="mb-6">
        <div className="tab-bar w-fit">
          {tabs.map(({ key, label, count, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`tab-item ${tab === key ? 'active' : ''}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === key ? 'bg-[hsl(0,0%,18%)] text-[hsl(0,0%,80%)]' : 'bg-[hsl(0,0%,13%)] text-[hsl(0,0%,40%)]'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUpVariants}>
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map((t, i) => (
                <TransferCard key={t.id} transfer={t} index={i}
                  onPause={pauseTransfer} onResume={resumeTransfer} onCancel={cancelTransfer} onRetry={retryTransfer} />
              ))}
            </div>
          ) : (
            <EmptyState icon={ArrowUpDown} title="No active transfers" description="Transfers will appear here when you send or receive files." />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
