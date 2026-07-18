import React from 'react'
import type { TokenFlow as TFlow } from '@/shared/types'

interface Props {
  flows: TFlow[]
}

export function TokenFlow({ flows }: Props) {
  if (!flows.length) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
        Asset Movement
      </p>
      {flows.map((flow, i) => (
        <div key={i} style={{
          background: '#111', border: '1px solid #1e1e1e',
          borderRadius: 6, padding: '10px 12px', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{flow.from}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 100 }}>
            <div style={{ flex: 1, height: 1, background: '#333' }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: flow.symbol.includes('approval') ? '#f59e0b' : flow.isETH ? '#818cf8' : '#34d399',
              whiteSpace: 'nowrap',
            }}>
              {flow.amount} {flow.symbol}
            </span>
            <span style={{ color: '#555', fontSize: 12 }}>→</span>
            <div style={{ flex: 1, height: 1, background: '#333' }} />
          </div>
          <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{flow.to}</span>
        </div>
      ))}
    </div>
  )
}
