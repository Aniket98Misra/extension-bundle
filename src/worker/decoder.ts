import {
  decodeFunctionData,
  formatEther,
  formatUnits,
  isAddress,
  type Abi,
} from 'viem'
import { ERC20_ABI, KNOWN_TOKENS, KNOWN_PROTOCOLS, MAX_UINT256 } from '@/shared/constants'
import { lookupSelector, selectorFromCalldata, functionNameFromSignature } from './fourByte'
import { simulateTx } from './simulator'
import type { DecodedParam, DecodedTx, TokenFlow, RawTxPayload } from '@/shared/types'

// Extended known ABIs — add Uniswap V2 swap, ERC-721 approve, etc.
const KNOWN_ABIS: Record<string, Abi> = {
  erc20: ERC20_ABI as unknown as Abi,
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatParamValue(type: string, value: unknown): string {
  if (typeof value === 'bigint') {
    if (type === 'uint256' && value === MAX_UINT256) return 'MAX (unlimited)'
    if (type === 'uint256') return value.toString()
    return value.toString()
  }
  if (typeof value === 'string' && isAddress(value)) return shortenAddress(value)
  if (Array.isArray(value)) return `[${value.map(v => formatParamValue('', v)).join(', ')}]`
  return String(value)
}

async function decodeCalldata(
  to: string,
  data: string,
): Promise<{ functionName?: string; functionSignature?: string; params?: DecodedParam[] }> {
  if (!data || data === '0x') return {}

  // try known ABIs first
  for (const [, abi] of Object.entries(KNOWN_ABIS)) {
    try {
      const decoded = decodeFunctionData({ abi, data: data as `0x${string}` })
      const params: DecodedParam[] = decoded.args
        ? (decoded.args as unknown[]).map((arg, i) => {
            const input = (abi as any[]).find(
              (f: any) => f.name === decoded.functionName,
            )?.inputs?.[i]
            return {
              name: input?.name || `arg${i}`,
              type: input?.type || 'unknown',
              value: formatParamValue(input?.type || '', arg),
            }
          })
        : []
      return {
        functionName: decoded.functionName,
        functionSignature: decoded.functionName,
        params,
      }
    } catch {
      // try next abi
    }
  }

  // fallback to 4byte.directory
  const selector = selectorFromCalldata(data)
  if (selector) {
    const sig = await lookupSelector(selector)
    if (sig) {
      return {
        functionName: functionNameFromSignature(sig),
        functionSignature: sig,
        params: [],
      }
    }
  }

  return {
    functionName: 'unknown',
    functionSignature: undefined,
    params: [],
  }
}

function extractTokenFlows(
  to: string,
  from: string,
  functionName: string | undefined,
  params: DecodedParam[] | undefined,
  value: string,
): TokenFlow[] {
  const flows: TokenFlow[] = []

  // ETH transfer
  const ethVal = BigInt(value || '0')
  if (ethVal > 0n) {
    flows.push({
      from: shortenAddress(from),
      to: shortenAddress(to),
      amount: formatEther(ethVal),
      symbol: 'ETH',
      decimals: 18,
      isETH: true,
    })
  }

  if (!params?.length || !functionName) return flows

  const tokenMeta = KNOWN_TOKENS[to?.toLowerCase()]

  // ERC-20 transfer
  if (functionName === 'transfer' && tokenMeta) {
    const toParam = params.find(p => p.name === 'to')
    const amountParam = params.find(p => p.name === 'amount')
    if (toParam && amountParam) {
      const rawAmount = amountParam.value === 'MAX (unlimited)'
        ? MAX_UINT256
        : BigInt(amountParam.value)
      flows.push({
        from: shortenAddress(from),
        to: toParam.value,
        amount: formatUnits(rawAmount, tokenMeta.decimals),
        symbol: tokenMeta.symbol,
        decimals: tokenMeta.decimals,
        isETH: false,
      })
    }
  }

  // ERC-20 approve
  if (functionName === 'approve' && tokenMeta) {
    const spenderParam = params.find(p => p.name === 'spender')
    const amountParam = params.find(p => p.name === 'amount')
    if (spenderParam && amountParam) {
      const isUnlimited = amountParam.value === 'MAX (unlimited)'
      flows.push({
        from: shortenAddress(from),
        to: spenderParam.value,
        amount: isUnlimited ? '∞' : formatUnits(BigInt(amountParam.value), tokenMeta.decimals),
        symbol: `${tokenMeta.symbol} approval`,
        decimals: tokenMeta.decimals,
        isETH: false,
      })
    }
  }

  return flows
}

function decodeTypedData(params: unknown[]): {
  typedDataDomain?: Record<string, unknown>
  typedDataMessage?: Record<string, unknown>
  typedDataType?: string
} {
  try {
    // params[1] is the JSON string of the typed data
    const raw = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1]
    return {
      typedDataDomain: raw.domain,
      typedDataMessage: raw.message,
      typedDataType: Object.keys(raw.types || {}).find(t => t !== 'EIP712Domain'),
    }
  } catch {
    return {}
  }
}

export async function decodePayload(payload: RawTxPayload): Promise<Partial<DecodedTx>> {
  const { interceptType, data } = payload
  const params = data as unknown[]

  if (interceptType === 'eth_signTypedData') {
    return {
      interceptType,
      tokenFlows: [],
      riskFlags: [],
      riskLevel: 'safe',
      ...decodeTypedData(params),
    }
  }

  // eth_sendTransaction
  const tx = (params?.[0] || {}) as Record<string, string>
  const to = (tx.to || '').toLowerCase()
  const from = (tx.from || '').toLowerCase()
  const value = tx.value ? BigInt(tx.value).toString() : '0'
  const calldata = tx.data || '0x'

  const { functionName, functionSignature, params: decodedParams } =
    await decodeCalldata(to, calldata)

  const tokenFlows = extractTokenFlows(to, from, functionName, decodedParams, value)
  const protocolName = KNOWN_PROTOCOLS[to]

  // run simulation — non-blocking best-effort
  const sim = await simulateTx(from, to, calldata, value).catch(() => ({
    success: true,
    simulatedFlows: [],
    revertReason: undefined,
  }))

  return {
    interceptType,
    to: to || '',
    from: from || '',
    value,
    data: calldata,
    functionName: protocolName
      ? `${functionName} (${protocolName})`
      : functionName,
    functionSignature,
    params: decodedParams,
    tokenFlows,
    ethValue: formatEther(BigInt(value)),
    simulationSuccess: sim.success,
    simulationFlows: sim.simulatedFlows,
    revertReason: sim.revertReason,
  }
}
