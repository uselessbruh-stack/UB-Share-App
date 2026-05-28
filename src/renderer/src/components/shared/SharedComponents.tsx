// ===================================================================
// UB-Share — Shared Components (v3 — neutral + teal)
// ===================================================================

import React, { forwardRef } from 'react'
import {
  File, FileText, FileImage, FileVideo, FileAudio, FileArchive,
  FileCode, FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TransferStatus } from '@shared/types'

// ----- File Icon -----
const iconMap: Record<string, React.FC<{ className?: string }>> = {
  image: FileImage, video: FileVideo, audio: FileAudio, text: FileText,
  code: FileCode, archive: FileArchive, spreadsheet: FileSpreadsheet
}

export function FileIcon({ mimeType, className }: { mimeType?: string; className?: string }) {
  let cat = 'default'
  if (mimeType) {
    if (mimeType.startsWith('image/')) cat = 'image'
    else if (mimeType.startsWith('video/')) cat = 'video'
    else if (mimeType.startsWith('audio/')) cat = 'audio'
    else if (/zip|tar|rar/.test(mimeType)) cat = 'archive'
    else if (mimeType.includes('text/')) cat = 'text'
    else if (/json|javascript|xml/.test(mimeType)) cat = 'code'
    else if (/spreadsheet|csv/.test(mimeType)) cat = 'spreadsheet'
  }
  const Icon = iconMap[cat] ?? File
  return <Icon className={cn('w-4 h-4', className)} />
}

// ----- Status Badge -----
const statusCfg: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: '170 70% 45%' },
  completed: { label: 'Completed', color: '158 64% 52%' },
  failed:    { label: 'Failed',    color: '0 72% 55%' },
  paused:    { label: 'Paused',    color: '40 90% 55%' },
  cancelled: { label: 'Cancelled', color: '0 0% 45%' },
  queued:    { label: 'Queued',    color: '200 70% 55%' },
  pending:   { label: 'Pending',   color: '0 0% 50%' },
}

export function StatusBadge({ status }: { status: TransferStatus | string }) {
  const cfg = statusCfg[status] ?? statusCfg.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: `hsla(${cfg.color}, 0.1)`,
        color: `hsl(${cfg.color})`
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${cfg.color})` }} />
      {cfg.label}
    </span>
  )
}

// ----- Empty State -----
export const EmptyState = forwardRef<HTMLDivElement, {
  icon: React.FC<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}>(function EmptyState({ icon: Icon, title, description, action }, ref) {
  return (
    <div ref={ref} className="flex flex-col items-center justify-center py-20 px-4">
      <div className="empty-state-icon">
        <Icon className="w-6 h-6 text-[hsl(0,0%,35%)]" />
      </div>
      <h3 className="text-[14px] font-semibold text-[hsl(0,0%,85%)] mb-1">{title}</h3>
      <p className="text-[13px] text-[hsl(0,0%,45%)] text-center max-w-[280px] leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
})

// ----- Page Header -----
export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-[18px] font-bold text-[hsl(0,0%,95%)] tracking-tight">{title}</h1>
        {description && <p className="text-[13px] text-[hsl(0,0%,50%)] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ----- Stat Card -----
export function StatCard({ label, value, icon: Icon }: {
  label: string; value: string; icon: React.FC<{ className?: string }>; accentColor?: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon className="w-[18px] h-[18px] text-[hsl(170,70%,50%)]" />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  )
}
