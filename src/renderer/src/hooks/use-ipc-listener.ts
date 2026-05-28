// ===================================================================
// UB-Share — IPC Listener Hook
// Sets up IPC event listeners with automatic cleanup
// ===================================================================

import { useEffect } from 'react'

/**
 * Subscribe to an IPC event from the main process.
 * Automatically cleans up the listener on unmount.
 */
export function useIpcListener<T = any>(
  subscribe: (callback: (data: T) => void) => () => void,
  handler: (data: T) => void,
  deps: any[] = []
): void {
  useEffect(() => {
    const unsubscribe = subscribe(handler)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
