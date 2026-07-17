import type { RawTxPayload, DecodedTx } from '@/shared/types'
import { decodePayload } from './decoder'
import { evaluateRisk } from './riskFlags'

// Keep last 20 decoded txs in memory (service workers can be killed)
const recentTxs: DecodedTx[] = []

async function handleIntercept(payload: RawTxPayload): Promise<DecodedTx> {
  const partial = await decodePayload(payload)
  const { riskFlags, riskLevel } = evaluateRisk(partial)

  const decoded: DecodedTx = {
    id: payload.id,
    interceptType: payload.interceptType,
    timestamp: payload.timestamp,
    to: partial.to || '',
    from: partial.from || '',
    value: partial.value || '0',
    data: partial.data || '0x',
    functionName: partial.functionName,
    functionSignature: partial.functionSignature,
    params: partial.params,
    typedDataDomain: partial.typedDataDomain,
    typedDataMessage: partial.typedDataMessage,
    typedDataType: partial.typedDataType,
    tokenFlows: partial.tokenFlows || [],
    ethValue: partial.ethValue || '0',
    riskFlags,
    riskLevel,
  }

  // store in memory + chrome.storage for popup
  recentTxs.unshift(decoded)
  if (recentTxs.length > 20) recentTxs.pop()

  await chrome.storage.session.set({ txlens_recent: recentTxs.slice(0, 10) })

  // badge the extension icon to show pending tx
  const badgeColor = riskLevel === 'high' ? '#ef4444'
    : riskLevel === 'medium' ? '#f59e0b'
    : '#22c55e'

  chrome.action.setBadgeText({ text: '!' })
  chrome.action.setBadgeBackgroundColor({ color: badgeColor })

  // clear badge after 8 seconds
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 8000)

  return decoded
}

// message listener — content script relays intercepts here
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'ETH_TX_INTERCEPTED') return false

  handleIntercept(message as RawTxPayload)
    .then(decoded => sendResponse({ decoded }))
    .catch(err => {
      console.error('[txlens worker] decode error:', err)
      sendResponse({ error: String(err) })
    })

  return true // keep channel open for async response
})

// popup requests recent tx list
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_RECENT_TXS') return false

  chrome.storage.session
    .get('txlens_recent')
    .then(data => sendResponse({ txs: data.txlens_recent || [] }))
    .catch(() => sendResponse({ txs: [] }))

  return true
})

console.debug('[txlens] service worker started')
