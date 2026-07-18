import React from 'react'
import type { RiskFlag, DecodedTx } from '@/shared/types'

const LEVEL_STYLES: Record<DecodedTx['riskLevel'], { bg: string; border: string; text: string; dot: string; label: string }> = {
  high:   { bg: '#1a0a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444', label: 'HIGH RISK'   },
  medium: { bg: '#1a1200', border: '#78350f', text: '#fcd34d', dot: '#f59e0b', label: 'CAUTION'      },
  low:    { bg: '#0f1a0a', border: '#14532d', text: '#86efac', dot: '#22c55e', label: 'LOW RISK'     },
  safe:   { bg: '#0a0f0a', border: '#14532d', text: '#4ade80', dot: '#16a34a', label: 'LOOKS SAFE'   },
}

interface Props {
  level: DecodedTx['riskLevel']
  flags: RiskFlag[]
}

export function RiskBadge({ level, flags }: Props) {
  const s = LEVEL_STYLES[level]

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 6, padding: '8px 12px', marginBottom: flags.length ? 8 : 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        <span style={{ color: s.text, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{s.label}</span>
      </div>

      {flags.map((flag, i) => (
        <div key={i} style={{
          background: '#111', border: `1px solid #222`,
          borderRadius: 6, padding: '8px 12px', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: LEVEL_STYLES[flag.level].dot }}>⚠</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_STYLES[flag.level].text }}>
              {flag.label}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>{flag.reason}</p>
        </div>
      ))}
    </div>
  )
}
