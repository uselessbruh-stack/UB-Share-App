// ===================================================================
// UB-Share — Incoming Request Modal
// Approval popup for incoming file transfer requests
// ===================================================================

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Shield, User } from 'lucide-react'
import { formatFileSize } from '@/lib/format'
import { FileIcon } from '@/components/shared/SharedComponents'
import { modalOverlayVariants, modalContentVariants } from '@/lib/animations'
import { useTransfers } from '@/hooks/use-transfers'

export function IncomingRequestModal() {
  const { pendingRequest, respondToRequest } = useTransfers()

  if (!pendingRequest) return null

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        variants={modalOverlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={() => respondToRequest(pendingRequest.requestId, false)}
      >
        <motion.div
          key="modal"
          variants={modalContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-[420px] bg-[hsl(225,20%,11%)] border border-[hsl(225,15%,18%)] rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[hsl(230,80%,56%/0.12)] flex items-center justify-center">
                <Download className="w-5 h-5 text-[hsl(230,80%,65%)]" />
              </div>
              <h2 className="text-base font-semibold text-[hsl(220,15%,95%)]">
                Incoming Transfer
              </h2>
            </div>
            <button
              onClick={() => respondToRequest(pendingRequest.requestId, false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[hsl(220,8%,45%)] hover:text-[hsl(220,15%,85%)] hover:bg-[hsl(225,15%,17%)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {/* Sender */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(265,70%,58%/0.15)] to-[hsl(230,80%,56%/0.15)] flex items-center justify-center">
                <User className="w-5 h-5 text-[hsl(265,70%,68%)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[hsl(220,15%,95%)]">
                  {pendingRequest.peerName || 'Unknown Peer'}
                </p>
                <p className="text-[12px] text-[hsl(220,10%,65%)]">wants to send you a file</p>
              </div>
            </div>

            {/* File Info */}
            <div className="bg-[hsl(225,25%,8%)] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[hsl(225,18%,14%)] flex items-center justify-center">
                  <FileIcon mimeType={pendingRequest.file.mimeType} className="w-6 h-6 text-[hsl(220,10%,65%)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[hsl(220,15%,95%)] truncate">
                    {pendingRequest.file.filename}
                  </p>
                  <p className="text-[12px] text-[hsl(220,10%,65%)] mt-0.5">
                    {formatFileSize(pendingRequest.file.fileSize)}
                    {pendingRequest.file.totalChunks && ` · ${pendingRequest.file.totalChunks} chunks`}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-2 mb-5 text-[12px] text-[hsl(220,10%,65%)]">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(152,60%,48%)]" />
              <span>Transfer is encrypted and goes directly between you and the sender.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-5 pb-5">
            <button
              onClick={() => respondToRequest(pendingRequest.requestId, false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[hsl(225,18%,14%)] text-[hsl(220,10%,65%)] hover:bg-[hsl(225,15%,17%)] hover:text-[hsl(220,15%,85%)] transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => respondToRequest(pendingRequest.requestId, true)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[hsl(230,80%,56%)] text-white hover:bg-[hsl(230,80%,50%)] transition-colors shadow-lg shadow-[hsl(230,80%,56%/0.25)]"
            >
              Accept
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
