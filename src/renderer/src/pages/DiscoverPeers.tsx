// ===================================================================
// UB-Share — Discover Peers Page (v5 — unified theme, 4 tabs)
// Tabs: Remote Share → Local Network → Nearby → Connect
// ===================================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Wifi, Bluetooth, Link2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/SharedComponents'
import { RemoteShareTab } from '@/components/discovery/RemoteShareTab'
import { LocalNetworkTab } from '@/components/discovery/LocalNetworkTab'
import { NearbyDevicesTab } from '@/components/discovery/NearbyDevicesTab'
import { ConnectSection } from '@/components/discovery/ConnectSection'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

type DiscoveryTab = 'remote' | 'local' | 'nearby' | 'connect'

const tabs: { id: DiscoveryTab; label: string; icon: React.ElementType }[] = [
  { id: 'remote', label: 'Remote Share', icon: Globe },
  { id: 'local', label: 'Local Network', icon: Wifi },
  { id: 'nearby', label: 'Nearby Devices', icon: Bluetooth },
  { id: 'connect', label: 'Connect', icon: Link2 }
]

export default function DiscoverPeers() {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('remote')

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        title="Discover Peers"
        description="Find and connect with other UB-Share devices"
      />

      {/* Discovery Tabs */}
      <motion.div variants={fadeUpVariants} className="discovery-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`discovery-tab ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span className="discovery-tab-label">{tab.label}</span>
            </button>
          )
        })}
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={fadeUpVariants} className="mt-5">
        {activeTab === 'remote' && <RemoteShareTab />}
        {activeTab === 'local' && <LocalNetworkTab />}
        {activeTab === 'nearby' && <NearbyDevicesTab />}
        {activeTab === 'connect' && <ConnectSection />}
      </motion.div>
    </motion.div>
  )
}
