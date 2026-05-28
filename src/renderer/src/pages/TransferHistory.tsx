// ===================================================================
// UB-Share — Transfer History (v4 — with duration, responsive)
// ===================================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { History, Search, Trash2, CheckCircle2, XCircle, Ban, Filter, ArrowUp, ArrowDown, Clock } from 'lucide-react'
import { PageHeader, EmptyState, StatusBadge } from '@/components/shared/SharedComponents'
import { useTransfers } from '@/hooks/use-transfers'
import { formatFileSize, formatSpeed, formatRelativeTime, formatDuration } from '@/lib/format'
import { staggerContainer, fadeUpVariants, listItemVariants } from '@/lib/animations'
import type { TransferStatus } from '@shared/types'

type HistoryFilter = 'all' | 'completed' | 'failed' | 'cancelled'

function getTransferDuration(transfer: { createdAt: number; completedAt?: number }): string {
  if (!transfer.completedAt) return ''
  const startMs = transfer.createdAt < 1e12 ? transfer.createdAt * 1000 : transfer.createdAt
  const endMs = transfer.completedAt < 1e12 ? transfer.completedAt * 1000 : transfer.completedAt
  const seconds = Math.max(1, Math.round((endMs - startMs) / 1000))
  return formatDuration(seconds)
}

export default function TransferHistory() {
  const { transferHistory, clearHistory, retryTransfer } = useTransfers()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = transferHistory
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) => t.filename.toLowerCase().includes(search.toLowerCase()) || (t.peerName ?? '').toLowerCase().includes(search.toLowerCase()))

  const filters: { key: HistoryFilter; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'all', label: 'All', icon: Filter },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'failed', label: 'Failed', icon: XCircle },
    { key: 'cancelled', label: 'Cancelled', icon: Ban }
  ]

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <PageHeader title="Transfer History" description={`${transferHistory.length} total transfers`}
        action={transferHistory.length > 0
          ? <button onClick={clearHistory} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[hsl(0,0%,50%)] hover:text-[hsl(0,72%,55%)] hover:bg-[hsla(0,72%,55%,0.06)] transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          : undefined
        }
      />

      <motion.div variants={fadeUpVariants} className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,30%)]" />
          <input type="text" placeholder="Search by filename or peer..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-search" />
        </div>
        <div className="tab-bar shrink-0">
          {filters.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setFilter(key)} className={`tab-item ${filter === key ? 'active' : ''}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUpVariants}>
        {filtered.length > 0 ? (
          <div className="space-y-1">
            {filtered.map((transfer, i) => {
              const duration = getTransferDuration(transfer)
              return (
                <motion.div key={transfer.id} variants={listItemVariants} initial="hidden" animate="visible" custom={i}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-[hsl(0,0%,10%)] transition-all group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: transfer.direction === 'upload' ? 'hsla(40, 90%, 55%, 0.08)' : 'hsla(170, 70%, 45%, 0.08)',
                      border: transfer.direction === 'upload' ? '1px solid hsla(40, 90%, 55%, 0.1)' : '1px solid hsla(170, 70%, 45%, 0.1)'
                    }}>
                    {transfer.direction === 'upload'
                      ? <ArrowUp className="w-3.5 h-3.5 text-[hsl(40,90%,55%)]" />
                      : <ArrowDown className="w-3.5 h-3.5 text-[hsl(170,70%,50%)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[hsl(0,0%,90%)] truncate">{transfer.filename}</p>
                    <p className="text-[11px] text-[hsl(0,0%,45%)] mt-0.5 truncate">
                      {formatFileSize(transfer.fileSize)}
                      {transfer.status === 'completed' && transfer.speed > 0 && <> · {formatSpeed(transfer.speed)}</>}
                      {duration && <> · <Clock className="w-3 h-3 inline-block -mt-[1px]" /> {duration}</>}
                    </p>
                  </div>
                  <StatusBadge status={transfer.status} />
                  <span className="text-[11px] text-[hsl(0,0%,35%)] shrink-0">{formatRelativeTime(transfer.updatedAt)}</span>
                  {transfer.status === 'failed' && (
                    <button onClick={() => retryTransfer(transfer.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-[hsla(170,70%,45%,0.1)] text-[hsl(170,70%,50%)] hover:bg-[hsla(170,70%,45%,0.18)] transition-all shrink-0">
                      Retry
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : search || filter !== 'all' ? (
          <EmptyState icon={Search} title="No matching transfers" description="Try adjusting your search or filter" />
        ) : (
          <EmptyState icon={History} title="No transfer history" description="Completed, failed, and cancelled transfers will appear here." />
        )}
      </motion.div>
    </motion.div>
  )
}
