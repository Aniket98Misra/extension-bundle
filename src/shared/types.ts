export type InterceptType = 'eth_sendTransaction' | 'eth_signTypedData'

export interface RawTxPayload {
  type: 'ETH_TX_INTERCEPTED'
  interceptType: InterceptType
  id: string
  data: unknown
  timestamp: number
}

export interface DecodedParam {
  name: string
  type: string
  value: string
}

export interface TokenFlow {
  from: string
  to: string
  amount: string
  symbol: string
  decimals: number
  isETH: boolean
}

export interface RiskFlag {
  level: 'high' | 'medium' | 'low'
  label: string
  reason: string
}

export interface DecodedTx {
  id: string
  interceptType: InterceptType
  timestamp: number

  // raw
  to: string
  from: string
  value: string          // ETH value in wei
  data: string

  // decoded
  functionName?: string
  functionSignature?: string
  params?: DecodedParam[]

  // EIP-712
  typedDataDomain?: Record<string, unknown>
  typedDataMessage?: Record<string, unknown>
  typedDataType?: string

  // flows
  tokenFlows: TokenFlow[]
  ethValue: string       // human-readable ETH

  // risk
  riskFlags: RiskFlag[]
  riskLevel: 'high' | 'medium' | 'low' | 'safe'

  // simulation
  simulationSuccess?: boolean
  simulationFlows?: TokenFlow[]
  revertReason?: string

  // meta
  contractVerified?: boolean
  isNewContract?: boolean
  network?: string
}

export interface WorkerMessage {
  type: 'DECODED_TX'
  payload: DecodedTx
}
