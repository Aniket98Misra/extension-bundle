import type { RiskFlag, DecodedTx } from '@/shared/types'
import { MAX_UINT256, RISK_THRESHOLDS } from '@/shared/constants'

export function evaluateRisk(partial: Partial<DecodedTx>): {
  riskFlags: RiskFlag[]
  riskLevel: DecodedTx['riskLevel']
} {
  const flags: RiskFlag[] = []

  // Rule 1 — unlimited token approval
  const approvalFlow = partial.tokenFlows?.find(
    f => f.symbol?.includes('approval') && f.amount === '∞',
  )
  if (approvalFlow) {
    flags.push({
      level: 'high',
      label: 'Unlimited Approval',
      reason: `You are granting unlimited ${approvalFlow.symbol.replace(' approval', '')} spending rights. This spender can drain your entire balance at any time.`,
    })
  }

  // Rule 2 — high ETH value
  const ethValue = BigInt(partial.value || '0')
  if (ethValue >= RISK_THRESHOLDS.HIGH_ETH_VALUE) {
    flags.push({
      level: 'high',
      label: 'High Value Transfer',
      reason: `This transaction sends ${partial.ethValue} ETH. Verify the recipient address carefully.`,
    })
  } else if (ethValue >= RISK_THRESHOLDS.MEDIUM_ETH_VALUE) {
    flags.push({
      level: 'medium',
      label: 'Notable ETH Value',
      reason: `This transaction sends ${partial.ethValue} ETH.`,
    })
  }

  // Rule 3 — unknown function (couldn't decode calldata)
  if (
    partial.interceptType === 'eth_sendTransaction' &&
    partial.data &&
    partial.data !== '0x' &&
    partial.functionName === 'unknown'
  ) {
    flags.push({
      level: 'medium',
      label: 'Unrecognised Function',
      reason: 'Could not decode what this transaction does. The contract may be unverified or use a proprietary interface.',
    })
  }

  // Rule 4 — EIP-712 permit with large amount or unlimited
  if (partial.interceptType === 'eth_signTypedData') {
    const msg = partial.typedDataMessage as Record<string, unknown> | undefined
    const typeName = partial.typedDataType

    if (typeName === 'Permit' && msg?.value) {
      const val = BigInt(String(msg.value))
      if (val === MAX_UINT256) {
        flags.push({
          level: 'high',
          label: 'Unlimited Permit Signature',
          reason: 'You are signing an off-chain permit granting unlimited token spending. This requires no further on-chain approval and is irreversible.',
        })
      }
    }

    if (typeName === 'PermitBatch' || typeName === 'PermitSingle') {
      flags.push({
        level: 'medium',
        label: 'Permit2 Signature',
        reason: 'You are signing a Permit2 authorisation. Verify the spender and expiration.',
      })
    }
  }

  // Rule 5 — simulation says it would revert
  if (partial.simulationSuccess === false) {
    flags.push({
      level: 'high',
      label: 'Transaction Would Revert',
      reason: partial.revertReason || 'Simulation indicates this transaction will fail. You would lose gas with no state change.',
    })
  }

  // Rule 6 — sending to an EOA with calldata (potential phishing)
  if (
    partial.interceptType === 'eth_sendTransaction' &&
    partial.data &&
    partial.data !== '0x' &&
    partial.isNewContract === false
  ) {
    // if to is a known EOA pattern — heuristic only, best-effort
    // we can't reliably check this without an eth_getCode call in the worker
    // left as a placeholder for v1.1
  }

  // derive overall level
  const hasHigh = flags.some(f => f.level === 'high')
  const hasMedium = flags.some(f => f.level === 'medium')

  const riskLevel: DecodedTx['riskLevel'] = hasHigh
    ? 'high'
    : hasMedium
      ? 'medium'
      : flags.length > 0
        ? 'low'
        : 'safe'

  return { riskFlags: flags, riskLevel }
}
