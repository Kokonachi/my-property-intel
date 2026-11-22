// Tiny i18n: one language at a time. t('中文', 'English'); L(obj) picks obj.zh / obj.en.
import { useSyncExternalStore } from 'react'

const KEY = 'mpi-lang'
const detect = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  const langs = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || []
  return String(langs[0] || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
let lang = typeof window !== 'undefined' ? detect() : 'zh'
const subs = new Set()
const apply = () => { if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en' }
apply()

export function setLang(l) {
  lang = l
  try { localStorage.setItem(KEY, l) } catch {}
  apply()
  subs.forEach(f => f())
}
export const getLang = () => lang
export function useLang() {
  const l = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => lang, () => lang)
  const t = (zh, en) => (l === 'zh' ? zh : en)
  const L = o => (o ? (l === 'zh' ? o.zh ?? o.en : o.en ?? o.zh) : '')
  return { lang: l, setLang, t, L }
}

export function LangToggle({ className = '' }) {
  const { lang: l } = useLang()
  return (
    <button onClick={() => setLang(l === 'zh' ? 'en' : 'zh')} data-testid="lang-toggle" aria-label={l === 'zh' ? 'Switch to English' : '切换到中文'}
      className={`shrink-0 inline-flex items-center rounded-full bg-white border border-slate-200 shadow-[0_3px_12px_rgba(15,23,42,.12)] p-0.5 text-[12px] font-semibold ${className}`}>
      <span className={`px-2 py-1 rounded-full ${l === 'zh' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>中</span>
      <span className={`px-1.5 py-1 rounded-full ${l === 'en' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>EN</span>
    </button>
  )
}
