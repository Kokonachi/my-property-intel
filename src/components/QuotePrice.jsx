import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { fmtRM, fmtRMk } from '../data/properties.js'

const PREFIX = 'mpi-quote:'

function load(id) {
  try {
    const o = JSON.parse(localStorage.getItem(PREFIX + id) || 'null')
    if (!o || typeof o !== 'object') return { selected: null, prices: {} }
    const prices = {}
    if (o.prices && typeof o.prices === 'object') {
      for (const [k, v] of Object.entries(o.prices)) {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) prices[k] = Math.round(n)
      }
    }
    return { selected: typeof o.selected === 'string' ? o.selected : null, prices }
  } catch {
    return { selected: null, prices: {} }
  }
}

export function typKey(row) {
  return `${row.rooms ?? 'u'}-${Math.round(row.size || 0)}`
}

export function defaultTypKey(buckets, p) {
  if (!buckets?.length) return 'default'
  const refSize = p.net_costs?.ref_size
  if (refSize != null) {
    const hit = buckets.find(b => b.size != null && Math.abs(b.size - refSize) < 1)
    if (hit) return typKey(hit)
  }
  const refVal = p.net_costs?.ref_value
  if (refVal != null) {
    const hit = buckets.find(b => b.value != null && Math.abs(b.value - refVal) < 1)
    if (hit) return typKey(hit)
  }
  return typKey(buckets[0])
}

export function useQuoteOverrides(projectId) {
  const [state, setState] = useState(() => load(projectId))
  useEffect(() => { setState(load(projectId)) }, [projectId])
  const save = next => {
    setState(next)
    try { localStorage.setItem(PREFIX + projectId, JSON.stringify(next)) } catch { /* ignore */ }
  }
  return {
    selected: state.selected,
    prices: state.prices,
    setSelected: key => save({ ...state, selected: key }),
    setPrice: (key, n) => {
      const prices = { ...state.prices }
      if (n == null) delete prices[key]
      else prices[key] = Math.round(n)
      save({ ...state, selected: key, prices })
    },
  }
}

function parsePrice(raw) {
  const n = Number(String(raw).replace(/[^\d]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Tappable price. iPhone numeric keypad; live-commits a valid number. */
export default function QuotePrice({
  value,
  market,
  onChange,
  compact = false,
  className = '',
  'data-testid': testId = 'quote-price',
}) {
  const { t } = useLang()
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const edited = value != null && market != null && Math.round(value) !== Math.round(market)
  const shown = value == null
    ? '—'
    : compact && !edited && !open
      ? fmtRMk(value)
      : fmtRM(value)

  useEffect(() => {
    if (open) inputRef.current?.select()
  }, [open])

  const start = e => {
    e.stopPropagation()
    if (value == null) return
    setDraft(String(Math.round(value)))
    setOpen(true)
  }
  const live = raw => {
    const cleaned = String(raw).replace(/[^\d]/g, '').slice(0, 9)
    setDraft(cleaned)
    const n = parsePrice(cleaned)
    if (n != null && n >= 1000) onChange(n)
  }
  const close = () => {
    const n = parsePrice(draft)
    if (n != null && n >= 1000) onChange(n)
    setOpen(false)
  }
  const reset = e => {
    e.stopPropagation()
    setOpen(false)
    onChange(null)
  }

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`} data-testid={testId} data-edited={edited ? 'true' : 'false'}>
      <button
        type="button"
        onClick={start}
        className={`inline-flex items-center gap-1 min-w-0 rounded-md px-1 -mx-1 py-0.5 text-left tabular-nums font-semibold leading-snug ${edited ? 'text-slate-900' : 'text-slate-800'} hover:bg-slate-100`}
        aria-label={t('编辑售价', 'Edit price')}
        data-testid={`${testId}-btn`}
        hidden={open}
      >
        <Pencil className={edited ? 'text-slate-700' : 'text-slate-400'} />
        <span data-testid={`${testId}-value`}>{shown}</span>
      </button>
      {open && (
        <label className="inline-flex items-center gap-0.5 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">RM</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-testid={`${testId}-input`}
            aria-label={t('售价', 'Price')}
            className="w-[8.5ch] bg-transparent outline-none text-[14px] font-semibold tabular-nums text-slate-900"
            value={draft}
            onChange={e => live(e.target.value)}
            onBlur={close}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setOpen(false) }
            }}
          />
        </label>
      )}
      {edited && !open && (
        <button
          type="button"
          onClick={reset}
          data-testid={`${testId}-reset`}
          aria-label={t('恢复市价', 'Reset to market price')}
          className="shrink-0 rounded-full px-1.5 h-5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >{t('重置', 'Reset')}</button>
      )}
    </span>
  )
}

function Pencil({ className = '' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M8.2 1.7 10.3 3.8 4.1 10H2v-2.1L8.2 1.7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
