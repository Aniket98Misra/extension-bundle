// Runs in MAIN world — has direct access to window.ethereum
// Intercepts eth_sendTransaction and eth_signTypedData
// Passes raw data to service worker via window.postMessage

import type { RawTxPayload } from '@/shared/types'

const PASSTHROUGH = new Set([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'net_version',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
])

const INTERCEPT = new Set([
  'eth_sendTransaction',
  'eth_signTypedData_v4',
  'eth_signTypedData',
])

function generateId(): string {
  return `txlens_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function waitForEthereum(retries = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      if (window.ethereum) {
        resolve()
      } else if (attempts++ < retries) {
        setTimeout(check, 100)
      } else {
        reject(new Error('No ethereum provider found'))
      }
    }
    check()
  })
}

function interceptProvider() {
  const provider = window.ethereum
  if (!provider || (provider as any).__txlens_patched) return

  const originalRequest = provider.request.bind(provider)

  provider.request = async function (args: { method: string; params?: unknown[] }) {
    const { method, params } = args

    // passthrough everything we don't care about
    if (PASSTHROUGH.has(method) || !INTERCEPT.has(method)) {
      return originalRequest(args)
    }

    const id = generateId()
    const interceptType = method === 'eth_sendTransaction'
      ? 'eth_sendTransaction'
      : 'eth_signTypedData'

    const payload: RawTxPayload = {
      type: 'ETH_TX_INTERCEPTED',
      interceptType,
      id,
      data: params,
      timestamp: Date.now(),
    }

    // send to service worker via background messaging
    // content scripts in MAIN world can't use chrome.runtime directly
    // so we relay through a custom event picked up by an injected relay
    window.postMessage({ __txlens: true, payload }, '*')

    // still execute the original — MVP is informational (Option A)
    return originalRequest(args)
  }

  // mark as patched so we don't double-wrap
  ;(provider as any).__txlens_patched = true
  console.debug('[txlens] provider intercepted')
}

// listen for messages coming back from worker (via relay)
window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (!event.data?.__txlens_decoded) return
  // decoded tx available — store in sessionStorage for popup to read
  const decoded = event.data.decoded
  const existing = JSON.parse(sessionStorage.getItem('txlens_queue') || '[]')
  existing.unshift(decoded)
  // keep last 10
  sessionStorage.setItem('txlens_queue', JSON.stringify(existing.slice(0, 10)))
})

// inject a small relay script that CAN use chrome.runtime
// (content scripts in ISOLATED world can relay messages)
const relay = document.createElement('script')
relay.textContent = `
  window.addEventListener('message', (e) => {
    if (!e.data?.__txlens) return;
    // relay to isolated content world via a custom DOM event
    document.dispatchEvent(new CustomEvent('__txlens_to_worker', {
      detail: e.data.payload
    }));
  });
`
;(document.head || document.documentElement).appendChild(relay)
relay.remove()

// isolated-world relay listener (this part runs in isolated world via separate listener)
document.addEventListener('__txlens_to_worker', async (e: Event) => {
  const payload = (e as CustomEvent).detail
  try {
    const response = await chrome.runtime.sendMessage(payload)
    if (response?.decoded) {
      window.postMessage({ __txlens_decoded: true, decoded: response.decoded }, '*')
    }
  } catch (err) {
    console.debug('[txlens] worker relay error:', err)
  }
})

waitForEthereum()
  .then(interceptProvider)
  .catch(() => {
    // no ethereum on this page — silent exit
  })
