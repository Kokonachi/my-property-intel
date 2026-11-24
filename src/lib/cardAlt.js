/** Throwaway v17 flag. #/?alt=a|b — A is the gauge in the info column, B is a full-width row. */
export function readCardAlt(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const q = String(hash).split('?')[1] || ''
  const alt = new URLSearchParams(q).get('alt')?.toLowerCase()
  return alt === 'b' ? 'b' : 'a'
}
