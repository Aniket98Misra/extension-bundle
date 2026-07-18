import React from 'react'
import type { DecodedTx } from '@/shared/types'
import { TokenFlow } from './TokenFlow'

interface Props {
  tx: DecodedTx
}

export function SimulationBadge({ tx }: Props) {
  if (tx.simulationSuccess === undefined) return null

  const reverted = !tx.simulationSuccess

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{
        fontSize: 10, color: '#666', letterSpacing: 1,
        marginBottom: 8, textTransform: 'uppercase',
      }}>
        Simulation
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: reverted ? '#1a0a0a' : '#0a0f0a',
        border: `1px solid ${reverted ? '#7f1d1d' : '#14532d'}`,
        borderRadius: 6, padding: '8px 12px', marginBottom: 8,
      }}>
        <span style={{ fontSize: 14 }}>{reverted ? '❌' : '✅'}</span>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700,
            color: reverted ? '#fca5a5' : '#4ade80',
          }}>
            {reverted ? 'Would Revert' : 'Would Succeed'}
          </p>
          {tx.revertReason && (
            <p style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              {tx.revertReason}
            </p>
          )}
        </div>
      </div>

      {tx.simulationFlows && tx.simulationFlows.length > 0 && (
        <>
          <p style={{
            fontSize: 10, color: '#555', letterSpacing: 1,
            marginBottom: 6, textTransform: 'uppercase',
          }}>
            Simulated Asset Changes
          </p>
          <TokenFlow flows={tx.simulationFlows} />
        </>
      )}
    </div>
  )
}
