import React, { useState } from 'react'
import type { DecodedTx } from '@/shared/types'
import { SimulationBadge } from './SimulationBadge'

interface Props {
  tx: DecodedTx
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: '#555', minWidth: 90, paddingTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: '#ccc', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', flex: 1 }}>
        {value}
      </span>
    </div>
  )
}

export function TxBreakdown({ tx }: Props) {
  const [showRaw, setShowRaw] = useState(false)
  const time = new Date(tx.timestamp).toLocaleTimeString()

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
        Transaction Detail
      </p>
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 6, padding: '10px 12px' }}>
        {tx.functionName && (
          <Row label="action" value={tx.functionName} mono={false} />
        )}
        {tx.functionSignature && tx.functionSignature !== tx.functionName && (
          <Row label="signature" value={tx.functionSignature} />
        )}
        <Row label="to" value={tx.to || '—'} />
        {tx.from && <Row label="from" value={tx.from} />}
        {BigInt(tx.value || '0') > 0n && (
          <Row label="eth value" value={`${tx.ethValue} ETH`} />
        )}
        <Row label="time" value={time} mono={false} />

        {tx.params && tx.params.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e1e1e' }}>
            <p style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Parameters
            </p>
            {tx.params.map((p, i) => (
              <Row key={i} label={p.name} value={`${p.value}  (${p.type})`} />
            ))}
          </div>
        )}

        <SimulationBadge tx={tx} />

        {tx.data && tx.data !== '0x' && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowRaw(r => !r)}
              style={{
                background: 'none', border: '1px solid #2a2a2a', borderRadius: 4,
                color: '#555', fontSize: 10, padding: '3px 8px', cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {showRaw ? 'HIDE' : 'SHOW'} RAW CALLDATA
            </button>
            {showRaw && (
              <div style={{
                marginTop: 6, padding: 8, background: '#0a0a0a',
                borderRadius: 4, fontSize: 10, color: '#555',
                wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.6,
              }}>
                {tx.data}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
