// ===================================================================
// UB-Share — Transfer Card (v3 — neutral)
// ===================================================================

import React from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, X, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react'
import { StatusBadge } from '@/components/shared/SharedComponents'
import { formatFileSize, formatSpeed, formatDuration } from '@/lib/format'
import { listItemVariants } from '@/lib/animations'
import type { TransferRecord } from '@shared/types'

interface TransferCardProps {
  transfer: TransferRecord
  index: number
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  compact?: boolean
}

export function TransferCard({ transfer, index, onPause, onResume, onCancel, onRetry, compact }: TransferCardProps) {
  const isActive = transfer.status === 'active'
  const isPaused = transfer.status === 'paused'
  const isFailed = transfer.status === 'failed'
  const isUp = transfer.direction === 'upload'

  // progress is already 0-100 from calculateProgress
  const progressPct = Math.min(100, Math.round(transfer.progress ?? 0))

  return (
    <motion.div variants={listItemVariants} initial="hidden" animate="visible" custom={index}
      className="card-surface p-4 group">
      <div className="flex items-start gap-3">
        {/* Direction */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isUp ? 'hsla(40, 90%, 55%, 0.08)' : 'hsla(170, 70%, 45%, 0.08)',
            border: isUp ? '1px solid hsla(40, 90%, 55%, 0.1)' : '1px solid hsla(170, 70%, 45%, 0.1)'
          }}>
          {isUp
            ? <ArrowUp className="w-4 h-4 text-[hsl(40,90%,55%)]" />
            : <ArrowDown className="w-4 h-4 text-[hsl(170,70%,50%)]" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold text-[hsl(0,0%,92%)] truncate">{transfer.filename}</h3>
              <p className="text-[11px] text-[hsl(0,0%,48%)] mt-0.5">
                {isActive || isPaused
                  ? <>{formatFileSize(transfer.bytesTransferred ?? 0)} / {formatFileSize(transfer.fileSize)}</>
                  : <>{transfer.peerName || 'Peer'} · {formatFileSize(transfer.fileSize)}</>
                }
                {isActive && transfer.speed > 0 && <> · <span className="text-[hsl(170,70%,50%)]">{formatSpeed(transfer.speed)}</span></>}
                {isActive && transfer.eta > 0 && <> · {formatDuration(transfer.eta)} left</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={transfer.status} />
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {isActive && onPause && <ActionBtn onClick={() => onPause(transfer.id)} title="Pause"><Pause className="w-3.5 h-3.5" /></ActionBtn>}
                {isPaused && onResume && <ActionBtn onClick={() => onResume(transfer.id)} title="Resume"><Play className="w-3.5 h-3.5" /></ActionBtn>}
                {isFailed && onRetry && <ActionBtn onClick={() => onRetry(transfer.id)} title="Retry"><RotateCcw className="w-3.5 h-3.5" /></ActionBtn>}
                {(isActive || isPaused) && onCancel && <ActionBtn onClick={() => onCancel(transfer.id)} title="Cancel" danger><X className="w-3.5 h-3.5" /></ActionBtn>}
              </div>
            </div>
          </div>

          {(isActive || isPaused) && !compact && (
            <div className="mt-3 flex items-center gap-3">
              <div className="progress-bar flex-1">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-[hsl(0,0%,55%)] tabular-nums w-10 text-right">
                {progressPct}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ActionBtn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
        danger ? 'text-[hsl(0,0%,45%)] hover:text-[hsl(0,72%,55%)] hover:bg-[hsla(0,72%,55%,0.08)]'
               : 'text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,15%)]'
      }`}>
      {children}
    </button>
  )
}
