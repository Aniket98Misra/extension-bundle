import React, { useEffect, useState } from 'react'
import type { DecodedTx } from '@/shared/types'
import { RiskBadge } from './components/RiskBadge'
import { TokenFlow } from './components/TokenFlow'
import { TxBreakdown } from './components/TxBreakdown'
import { SignTypedData } from './components/SignTypedData'

const LEVEL_COLOR: Record<DecodedTx['riskLevel'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
  safe: '#16a34a',
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 360, gap: 12, padding: 24,
    }}>
      <div style={{ fontSize: 32 }}>🔍</div>
      <p style={{ color: '#555', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
        No transactions intercepted yet.
      </p>
      <p style={{ color: '#333', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
        Browse a web3 dapp and trigger a transaction or signature — txlens will decode it here.
      </p>
    </div>
  )
}

function TxListItem({ tx, onClick }: { tx: DecodedTx; onClick: () => void }) {
  const time = new Date(tx.timestamp).toLocaleTimeString()
  const label = tx.interceptType === 'eth_signTypedData'
    ? `Sign: ${tx.typedDataType || 'Typed Data'}`
    : tx.functionName || 'Transaction'

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: '#111', border: '1px solid #1e1e1e',
        borderRadius: 6, padding: '10px 12px', marginBottom: 6,
        cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: LEVEL_COLOR[tx.riskLevel], flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: '#ccc', fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </p>
        <p style={{ fontSize: 10, color: '#555' }}>{time}</p>
      </div>
      {tx.riskFlags.length > 0 && (
        <span style={{
          fontSize: 10, color: LEVEL_COLOR[tx.riskLevel],
          background: `${LEVEL_COLOR[tx.riskLevel]}15`,
          border: `1px solid ${LEVEL_COLOR[tx.riskLevel]}40`,
          borderRadius: 4, padding: '2px 6px', flexShrink: 0,
        }}>
          {tx.riskFlags.length} flag{tx.riskFlags.length > 1 ? 's' : ''}
        </span>
      )}
      <span style={{ color: '#333', fontSize: 14 }}>›</span>
    </button>
  )
}

function TxDetail({ tx, onBack }: { tx: DecodedTx; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: '1px solid #222', borderRadius: 4,
            color: '#888', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 12, color: '#888', flex: 1, textAlign: 'right' }}>
          {tx.interceptType === 'eth_signTypedData' ? 'Signature' : 'Transaction'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <RiskBadge level={tx.riskLevel} flags={tx.riskFlags} />
        <TokenFlow flows={tx.tokenFlows} />
        {tx.interceptType === 'eth_signTypedData'
          ? <SignTypedData tx={tx} />
          : <TxBreakdown tx={tx} />
        }
      </div>
    </div>
  )
}

export default function App() {
  const [txs, setTxs] = useState<DecodedTx[]>([])
  const [selected, setSelected] = useState<DecodedTx | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_RECENT_TXS' }, (res) => {
      setTxs(res?.txs || [])
      setLoading(false)
    })

    // poll for new txs every 2s while popup is open
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'GET_RECENT_TXS' }, (res) => {
        if (res?.txs) setTxs(res.txs)
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>
            🔎
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e5e5e5', letterSpacing: 0.5 }}>
            txlens
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#444', letterSpacing: 1 }}>
          {txs.length > 0 ? `${txs.length} INTERCEPTED` : 'WATCHING'}
        </span>
      </div>

      {/* Content */}
      {selected ? (
        <TxDetail tx={selected} onBack={() => setSelected(null)} />
      ) : (
        <div style={{ flex: 1, padding: '14px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <span style={{ color: '#444', fontSize: 12 }}>loading...</span>
            </div>
          ) : txs.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <p style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
                Recent Transactions
              </p>
              {txs.map(tx => (
                <TxListItem key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #1a1a1a',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, color: '#333', letterSpacing: 0.5 }}>
          INFORMATIONAL ONLY · v0.1.0
        </span>
        <a
          href="https://github.com/Aniket98Misra/txlens"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 9, color: '#444', textDecoration: 'none' }}
        >
          github ↗
        </a>
      </div>
    </div>
  )
}
