// ===================================================================
// UB-Share — Analytics Service
// Wraps analytics repository with convenience methods
// ===================================================================

import { analyticsRepository } from '../db/repositories/analytics-repository'
import type { AnalyticsData } from '@shared/types'

export async function getAnalytics(): Promise<AnalyticsData> {
  return analyticsRepository.get()
}

export async function recordTransferSuccess(
  direction: 'upload' | 'download',
  bytes: number,
  averageSpeed: number
): Promise<void> {
  await analyticsRepository.recordSuccess(direction, bytes, averageSpeed)
}

export async function recordTransferFailure(): Promise<void> {
  await analyticsRepository.recordFailure()
}
