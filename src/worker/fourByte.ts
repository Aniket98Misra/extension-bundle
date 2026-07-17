const FOUR_BYTE_URL = 'https://www.4byte.directory/api/v1/signatures/'

interface FourByteResult {
  id: number
  text_signature: string
  hex_signature: string
}

const cache = new Map<string, string>()

export async function lookupSelector(selector: string): Promise<string | null> {
  // selector = first 4 bytes of calldata as hex eg "0xa9059cbb"
  const key = selector.toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  try {
    const res = await fetch(`${FOUR_BYTE_URL}?hex_signature=${key}`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null

    const json = await res.json()
    const results: FourByteResult[] = json.results
    if (!results?.length) return null

    // prefer the most common one (lowest id = oldest = most used)
    const sorted = results.sort((a, b) => a.id - b.id)
    const sig = sorted[0].text_signature
    cache.set(key, sig)
    return sig
  } catch {
    return null
  }
}

export function selectorFromCalldata(data: string): string | null {
  if (!data || data === '0x' || data.length < 10) return null
  return data.slice(0, 10).toLowerCase()
}

export function functionNameFromSignature(sig: string): string {
  return sig.split('(')[0]
}
