// ===================================================================
// UB-Share — Nearby Devices Discovery Tab
// Bluetooth LE discovery (Phase 4 placeholder)
// ===================================================================

import React from 'react'
import { motion } from 'framer-motion'
import { Bluetooth, Construction } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'

export function NearbyDevicesTab() {
  return (
    <motion.div variants={fadeUpVariants} className="space-y-4">
      {/* Info Banner */}
      <div className="discovery-info-banner">
        <Bluetooth className="w-4 h-4 text-[hsl(var(--accent))]" />
        <p>Discover physically nearby devices using Bluetooth. No Wi-Fi or internet connection required.</p>
      </div>

      {/* Coming Soon */}
      <div className="discovery-empty" style={{ marginTop: 40 }}>
        <div className="w-16 h-16 rounded-2xl bg-[hsla(var(--accent),0.1)] flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-[hsla(var(--accent),0.5)]" />
        </div>
        <p className="text-[14px] font-medium text-[hsl(0,0%,60%)]">Coming Soon</p>
        <p className="text-[12px] text-[hsl(0,0%,35%)] mt-1 max-w-[300px] text-center">
          Bluetooth device discovery is under development. Use Local Network or Remote Share in the meantime.
        </p>
      </div>
    </motion.div>
  )
}
