# txlens 🔍

**See what you're signing before you sign it.**

A Chrome extension that intercepts every `eth_sendTransaction` and `eth_signTypedData` call in your browser, decodes it into human-readable form, and flags risks — before the transaction leaves your wallet.

No account needed. No backend. Works on any web3 dapp.

---

## What it does

When you click "Confirm" on any dapp, txlens intercepts the raw transaction data and shows you:

- **What function you're calling** — decoded from the calldata using known ABIs and [4byte.directory](https://www.4byte.directory/) fallback
- **What assets are moving** — token transfers, ETH value, approvals, all rendered as `FROM → AMOUNT TOKEN → TO`
- **Risk flags** — five deterministic rules that catch the most common ways users get drained
- **EIP-712 signatures** — permit approvals, Permit2, order signatures, rendered as readable key-value pairs instead of hex blobs

---

## Risk flags

| Flag | Severity | What it catches |
|------|----------|-----------------|
| Unlimited Approval | 🔴 High | `amount === MaxUint256` on any ERC-20 approve |
| Unlimited Permit | 🔴 High | Off-chain permit signature granting infinite spend |
| High Value Transfer | 🔴 High | ETH value ≥ 1 ETH |
| Unrecognised Function | 🟡 Medium | Calldata that couldn't be decoded — unverified contract |
| Permit2 Signature | 🟡 Medium | Permit2 batch/single authorisations |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser Page (MAIN world)                              │
│                                                         │
│  window.ethereum ──proxy──► txlens content script      │
│                              intercepts:                │
│                              · eth_sendTransaction      │
│                              · eth_signTypedData        │
│                              passes original through    │
└──────────────────┬──────────────────────────────────────┘
                   │ CustomEvent relay
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Content Script (ISOLATED world)                        │
│  relays to service worker via chrome.runtime            │
└──────────────────┬──────────────────────────────────────┘
                   │ chrome.runtime.sendMessage
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Service Worker                                         │
│                                                         │
│  decoder.ts  ──► viem decodeFunctionData()              │
│                  known ABI registry (ERC-20, ERC-721)   │
│                  4byte.directory fallback               │
│                                                         │
│  riskFlags.ts ──► 5 deterministic rules                 │
│                                                         │
│  stores result in chrome.storage.session                │
│  sets badge colour (red/amber/green)                    │
└──────────────────┬──────────────────────────────────────┘
                   │ chrome.storage.session
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Popup (React)                                          │
│  polls every 2s · renders decoded tx list + detail     │
└─────────────────────────────────────────────────────────┘
```

### Why the two-world relay?

Chrome Manifest V3 content scripts run in an **isolated world** — they can access `chrome.runtime` but not `window.ethereum`. The provider proxy must run in the **MAIN world** to wrap the actual ethereum object. These two worlds can't communicate directly, so txlens uses a CustomEvent relay: MAIN world posts a DOM event, isolated world picks it up and forwards to the service worker via `chrome.runtime.sendMessage`.

This is the architectural detail that most Chrome extension tutorials get wrong.

---

## Tech stack

- **Manifest V3** — service worker, no persistent background pages
- **viem** — calldata decoding via `decodeFunctionData`, ABI parsing
- **React 18** — popup UI
- **Vite** — multi-entry build (content script + popup as separate bundles)
- **TypeScript** — end to end
- **4byte.directory** — fallback function signature lookup

---

## Install

### From Chrome Web Store
*(coming soon — under review)*

### Manual (developer mode)
```bash
git clone https://github.com/Aniket98Misra/txlens
cd txlens
npm install
npm run build
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

The txlens icon appears in your toolbar. Browse any web3 dapp and trigger a transaction — txlens decodes it in the popup.

---

## Development

```bash
npm run dev      # watch mode — rebuilds on file change
```

After each rebuild, go to `chrome://extensions` and click the refresh icon on txlens.

### Project structure

```
src/
├── content/       # provider proxy (MAIN world)
├── worker/        # service worker: decoder, risk flags, 4byte client
│   ├── decoder.ts
│   ├── riskFlags.ts
│   └── fourByte.ts
├── popup/         # React UI
│   ├── App.tsx
│   └── components/
│       ├── RiskBadge.tsx
│       ├── TokenFlow.tsx
│       ├── TxBreakdown.tsx
│       └── SignTypedData.tsx
└── shared/        # types and constants shared across all three
```

---

## Roadmap

- [ ] `eth_call` simulation — show actual state changes before signing
- [ ] `eth_getCode` check — flag transactions to EOAs with calldata
- [ ] Firefox support (WebExtension API)
- [ ] More protocol ABIs — Uniswap V3, Aave, Compound
- [ ] Option B approve/cancel flow — block tx until user confirms in popup
- [ ] Tenderly simulation integration for complex multi-step txs

---

## Why I built this

Every web3 developer has stared at a MetaMask popup showing a hex blob and had no idea what was about to happen. Tenderly exists but requires a context switch and an account. Etherscan's decoder only works after the fact on verified contracts.

txlens is the tool I wanted every time I was testing a contract on a testnet and couldn't tell if my `approve()` call had the right parameters until the tx landed.

The interesting engineering problem isn't the decoding — viem makes that clean. It's the **MV3 provider proxy architecture**: getting a MAIN world script to relay data through an isolated content script to a service worker without race conditions. That pattern is documented [in this blog post](https://dev.to/aniket_misra_e47d1564ab7b).

---

## License

MIT
