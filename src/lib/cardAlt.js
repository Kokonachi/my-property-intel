/** Throwaway v15 flag. Read from the hash query: #/?alt=a|b|c */
export function readCardAlt(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const q = String(hash).split('?')[1] || ''
  const alt = new URLSearchParams(q).get('alt')?.toLowerCase()
  if (alt === 'a' || alt === 'b' || alt === 'c') return alt
  return 'a'
}
