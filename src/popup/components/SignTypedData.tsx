import React, { useState } from 'react'
import type { DecodedTx } from '@/shared/types'

interface Props {
  tx: DecodedTx
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) return <span style={{ color: '#666' }}>null</span>
  if (typeof data === 'boolean') return <span style={{ color: '#818cf8' }}>{String(data)}</span>
  if (typeof data === 'number' || typeof data === 'bigint') {
    return <span style={{ color: '#34d399' }}>{String(data)}</span>
  }
  if (typeof data === 'string') {
    // check if it looks like a large number (token amount)
    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(data)
    return (
      <span style={{ color: isAddress ? '#94a3b8' : '#fbbf24' }}>
        {isAddress ? `${data.slice(0, 6)}...${data.slice(-4)}` : data}
      </span>
    )
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    return (
      <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 3 }}>
            <span style={{ color: '#60a5fa', fontSize: 11 }}>{k}</span>
            <span style={{ color: '#444' }}>{': '}</span>
            <JsonTree data={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  return <span style={{ color: '#ccc' }}>{String(data)}</span>
}

export function SignTypedData({ tx }: Props) {
  const [showDomain, setShowDomain] = useState(false)

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
        Signature Request
      </p>

      {tx.typedDataType && (
        <div style={{
          background: '#0f0f1a', border: '1px solid #1e1e3a',
          borderRadius: 6, padding: '6px 12px', marginBottom: 8, display: 'inline-block',
        }}>
          <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 700 }}>{tx.typedDataType}</span>
        </div>
      )}

      {tx.typedDataMessage && (
        <div style={{
          background: '#111', border: '1px solid #1e1e1e',
          borderRadius: 6, padding: '10px 12px', marginBottom: 8,
          fontSize: 11, lineHeight: 1.7,
        }}>
          <JsonTree data={tx.typedDataMessage} />
        </div>
      )}

      {tx.typedDataDomain && (
        <div>
          <button
            onClick={() => setShowDomain(d => !d)}
            style={{
              background: 'none', border: '1px solid #2a2a2a', borderRadius: 4,
              color: '#555', fontSize: 10, padding: '3px 8px', cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            {showDomain ? 'HIDE' : 'SHOW'} DOMAIN
          </button>
          {showDomain && (
            <div style={{
              marginTop: 6, background: '#111', border: '1px solid #1e1e1e',
              borderRadius: 6, padding: '10px 12px', fontSize: 11, lineHeight: 1.7,
            }}>
              <JsonTree data={tx.typedDataDomain} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
