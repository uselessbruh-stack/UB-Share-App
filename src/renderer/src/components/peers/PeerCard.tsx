// ===================================================================
// UB-Share — Peer Card (v3 — neutral)
// ===================================================================

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Download, ChevronDown, ChevronUp, User, Folder } from 'lucide-react'
import { FileIcon } from '@/components/shared/SharedComponents'
import { formatFileSize } from '@/lib/format'
import { listItemVariants } from '@/lib/animations'
import type { PeerInfo, SharedFileInfo } from '@shared/types'

export function PeerCard({ peer, index, onRequestFile, onSendFile }: {
  peer: PeerInfo; index: number
  onRequestFile: (peerId: string, fileId: string) => void
  onSendFile: (peerId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasFiles = peer.sharedFiles && peer.sharedFiles.length > 0

  return (
    <motion.div variants={listItemVariants} initial="hidden" animate="visible" custom={index}
      className="card-surface overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[hsl(0,0%,13%)] border border-[hsl(0,0%,16%)]">
            <User className="w-4 h-4 text-[hsl(0,0%,55%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-[hsl(0,0%,92%)]">{peer.displayName}</h3>
            <p className="text-[11px] text-[hsl(0,0%,48%)] mt-0.5">
              {hasFiles ? `${peer.sharedFiles!.length} shared file${peer.sharedFiles!.length !== 1 ? 's' : ''}` : 'No shared files'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onSendFile(peer.id)} className="btn-primary !py-2 !px-3.5 text-[12px]">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
            {hasFiles && (
              <button onClick={() => setExpanded(!expanded)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,75%)] hover:bg-[hsl(0,0%,13%)] transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && hasFiles && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 border-t border-[hsl(0,0%,13%)]">
              <div className="flex items-center gap-2 mb-2 mt-2">
                <Folder className="w-3 h-3 text-[hsl(0,0%,35%)]" />
                <span className="text-[10px] font-bold text-[hsl(0,0%,35%)] uppercase tracking-wider">Shared Files</span>
              </div>
              <div className="space-y-0.5">
                {peer.sharedFiles!.map((file: SharedFileInfo) => (
                  <div key={file.fileId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(0,0%,11%)] transition-colors group/file">
                    <FileIcon mimeType={file.mimeType} className="text-[hsl(0,0%,45%)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[hsl(0,0%,82%)] truncate">{file.filename}</p>
                      <p className="text-[10px] text-[hsl(0,0%,42%)]">{formatFileSize(file.fileSize)}</p>
                    </div>
                    <button onClick={() => onRequestFile(peer.id, file.fileId)}
                      className="opacity-0 group-hover/file:opacity-100 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[hsla(170,70%,45%,0.1)] text-[hsl(170,70%,50%)] hover:bg-[hsla(170,70%,45%,0.18)] transition-all">
                      <Download className="w-3 h-3" /> Get
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
