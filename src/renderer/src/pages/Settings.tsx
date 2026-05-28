// ===================================================================
// UB-Share — Settings (v3 — neutral)
// ===================================================================

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, ArrowUpDown, Wifi, Info, FolderOpen, Moon, Sun, Monitor, Save, Check, Share2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/SharedComponents'
import { useSettings } from '@/hooks/use-settings'
import { formatFileSize } from '@/lib/format'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import type { AppSettings } from '@shared/types'

type SettingsTab = 'general' | 'transfers' | 'network' | 'about'

export default function Settings() {
  const { settings, saveSettings } = useSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<Partial<AppSettings>>({})

  if (!settings) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-[hsl(170,70%,45%)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const cur = { ...settings, ...draft }
  const hasDraft = Object.keys(draft).length > 0

  const handleSave = async () => {
    if (hasDraft) {
      await saveSettings(draft)
      setDraft({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const set = (key: keyof AppSettings, value: any) => setDraft((d) => ({ ...d, [key]: value }))

  const tabs: { key: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'general', label: 'General', icon: User },
    { key: 'transfers', label: 'Transfers', icon: ArrowUpDown },
    { key: 'network', label: 'Network', icon: Wifi },
    { key: 'about', label: 'About', icon: Info }
  ]

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <PageHeader title="Settings" description="Configure your UB-Share preferences"
        action={hasDraft ? <button onClick={handleSave} className="btn-primary">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button> : undefined}
      />

      <motion.div variants={fadeUpVariants} className="flex gap-8">
        <div className="w-44 shrink-0 space-y-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`nav-item relative ${activeTab === key ? 'active' : ''}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 max-w-[560px]">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <Grp title="Profile">
                <Row label="Display Name" desc="How other peers will see you">
                  <input type="text" value={cur.displayName} onChange={(e) => set('displayName', e.target.value)}
                    className="w-64 px-3.5 py-2.5 rounded-lg bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,16%)] text-[13px] text-[hsl(0,0%,95%)] focus:outline-none focus:border-[hsl(170,70%,45%)] focus:shadow-[0_0_0_2px_hsla(170,70%,45%,0.15)] transition-all" />
                </Row>
              </Grp>
              <Grp title="Appearance">
                <Row label="Theme" desc="Choose your preferred color scheme">
                  <div className="tab-bar">
                    {([['dark', Moon, 'Dark'], ['light', Sun, 'Light'], ['system', Monitor, 'System']] as const).map(([k, I, l]) => (
                      <button key={k} onClick={() => set('theme', k)} className={`tab-item ${cur.theme === k ? 'active' : ''}`}>
                        <I className="w-3 h-3" /> {l}
                      </button>
                    ))}
                  </div>
                </Row>
              </Grp>
              <Grp title="Behavior">
                <Row label="Start Minimized" desc="Start UB-Share in the system tray">
                  <Toggle checked={cur.startMinimized} onChange={(v) => set('startMinimized', v)} />
                </Row>
                <Row label="Notifications" desc="Show desktop notifications for transfers">
                  <Toggle checked={cur.notifications} onChange={(v) => set('notifications', v)} />
                </Row>
              </Grp>
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="space-y-8">
              <Grp title="Transfer Settings">
                <Row label="Chunk Size" desc={`Current: ${formatFileSize(cur.chunkSize)}`}>
                  <div className="flex items-center gap-3 w-64">
                    <input type="range" min={65536} max={1048576} step={65536} value={cur.chunkSize}
                      onChange={(e) => set('chunkSize', parseInt(e.target.value))}
                      className="flex-1 accent-[hsl(170,70%,45%)] h-1.5" />
                    <span className="text-[12px] text-[hsl(0,0%,50%)] w-16 text-right font-medium">{formatFileSize(cur.chunkSize)}</span>
                  </div>
                </Row>
                <Row label="Download Directory" desc="Where received files are saved">
                  <button onClick={async () => { const d = await window.ubshare.selectDirectory(); if (d) set('downloadDir', d) }}
                    className="btn-secondary max-w-[300px]">
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cur.downloadDir || 'Select...'}</span>
                  </button>
                </Row>
                <Row label="Simultaneous Transfers" desc="Maximum concurrent transfers">
                  <div className="flex items-center gap-3 w-64">
                    <input type="range" min={1} max={10} value={cur.maxSimultaneousTransfers}
                      onChange={(e) => set('maxSimultaneousTransfers', parseInt(e.target.value))}
                      className="flex-1 accent-[hsl(170,70%,45%)] h-1.5" />
                    <span className="text-[12px] text-[hsl(0,0%,50%)] w-8 text-right font-medium">{cur.maxSimultaneousTransfers}</span>
                  </div>
                </Row>
                <Row label="Auto-Resume" desc="Automatically resume interrupted transfers">
                  <Toggle checked={cur.autoResume} onChange={(v) => set('autoResume', v)} />
                </Row>
              </Grp>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-8">
              <Grp title="Server">
                <Row label="Signaling Server URL" desc="WebSocket server for peer discovery">
                  <input type="text" value={cur.signalingServerUrl} onChange={(e) => set('signalingServerUrl', e.target.value)}
                    className="w-72 px-3.5 py-2.5 rounded-lg bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,16%)] text-[13px] text-[hsl(0,0%,95%)] font-mono focus:outline-none focus:border-[hsl(170,70%,45%)] focus:shadow-[0_0_0_2px_hsla(170,70%,45%,0.15)] transition-all" />
                </Row>
              </Grp>
              <Grp title="Reconnect">
                <Row label="Reconnect Timeout" desc={`Wait ${cur.reconnectTimeout}s before retrying`}>
                  <div className="flex items-center gap-3 w-64">
                    <input type="range" min={5} max={120} step={5} value={cur.reconnectTimeout}
                      onChange={(e) => set('reconnectTimeout', parseInt(e.target.value))}
                      className="flex-1 accent-[hsl(170,70%,45%)] h-1.5" />
                    <span className="text-[12px] text-[hsl(0,0%,50%)] w-10 text-right font-medium">{cur.reconnectTimeout}s</span>
                  </div>
                </Row>
              </Grp>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="card-surface p-8 text-center">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[hsl(170,70%,45%)]">
                  <Share2 className="w-7 h-7 text-[hsl(0,0%,5%)]" />
                </div>
                <h3 className="text-lg font-bold text-[hsl(0,0%,95%)] mb-1">UB-Share</h3>
                <p className="text-[13px] text-[hsl(0,0%,50%)] mb-4">Version 1.0.0</p>
                <p className="text-[12px] text-[hsl(0,0%,40%)] max-w-[380px] mx-auto leading-relaxed">
                  Modern peer-to-peer desktop file sharing with direct encrypted transfers,
                  resumable downloads, and real-time monitoring.
                </p>
              </div>
              <div className="card-surface p-5">
                <h4 className="text-[11px] font-bold text-[hsl(0,0%,38%)] uppercase tracking-wider mb-4">Technologies</h4>
                <div className="grid grid-cols-2 gap-3">
                  {['Electron', 'React + TypeScript', 'WebRTC DataChannels', 'Socket.IO', 'SQLite + Drizzle ORM', 'TailwindCSS v4'].map((t) => (
                    <div key={t} className="flex items-center gap-2.5 text-[12px] text-[hsl(0,0%,55%)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(170,70%,45%)] opacity-50" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Grp({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-[11px] font-bold text-[hsl(0,0%,35%)] uppercase tracking-wider mb-5">{title}</h3><div className="space-y-5">{children}</div></div>
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-[hsl(0,0%,90%)]">{label}</p>
        {desc && <p className="text-[12px] text-[hsl(0,0%,45%)] mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`toggle-track ${checked ? 'on' : 'off'}`}>
      <motion.div className="toggle-thumb" animate={{ x: checked ? 16 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  )
}
