// ===================================================================
// UB-Share — Preload Type Declarations
// TypeScript declarations for window.ubshare
// ===================================================================

import type { UBShareAPI } from '@shared/types'

declare global {
  interface Window {
    ubshare: UBShareAPI
  }
}
