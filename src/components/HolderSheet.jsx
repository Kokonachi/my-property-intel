import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { useHolder, clampHold, HOLD_MIN, HOLD_MAX, segmentOf, SEGMENTS } from '../lib/holderProfile.js'

function bandLabel(count, t) {
  const seg = segmentOf(count)
  if (seg === SEGMENTS.zero) return t('0 套', '0 properties')
  if (seg === SEGMENTS.few) return t('1–2 套', '1–2 properties')
  return t('3 套以上', '3 or more')
}

function bandHint(count, t) {
  const seg = segmentOf(count)
  if (seg === SEGMENTS.zero) return t('会优先看入场成本和月供', 'We’ll lead with entry cost and the instalment')
  if (seg === SEGMENTS.few) return t('会优先看租金能否覆盖月供', 'We’ll lead with rent versus the instalment')
  return t('会优先看净回报和每尺价', 'We’ll lead with net yield and price psf')
}

export function HolderSheet({ open, mode = 'onboard', onClose }) {
  const { t } = useLang()
  const { holder, setCount } = useHolder()
  const initial = holder.count != null ? holder.count : 0
  const [value, setValue] = useState(initial)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (open) {
      const v = holder.count != null ? holder.count : 0
      setValue(v)
      setDraft(null)
    }
  }, [open, holder.count])

  if (!open) return null

  const shown = draft ?? String(value)
  const commit = raw => {
    setDraft(null)
    const n = Number(String(raw).trim())
    if (!Number.isFinite(n)) return
    setValue(clampHold(n))
  }
  const bump = dir => setValue(v => clampHold(v + dir))
  const save = () => {
    setCount(value)
    onClose?.()
  }
  const skip = () => {
    setCount(null, { skipped: true })
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center sm:justify-center" data-testid="holder-sheet">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="holder-title"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_16px_50px_rgba(15,23,42,.2)] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
        {mode === 'edit' && (
          <button
            type="button"
            data-testid="holder-close"
            onClick={() => onClose?.()}
            className="absolute top-3 right-3 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-500 text-[16px]"
            aria-label={t('关闭', 'Close')}
          >×</button>
        )}
        <h2 id="holder-title" className="text-[17px] sm:text-[18px] font-semibold text-slate-900 text-center leading-snug px-6">
          {t('你目前持有几套房产？', 'How many properties do you currently own?')}
        </h2>

        <div className="mt-5 text-center">
          <div className="inline-flex items-end justify-center gap-1">
            <input
              data-testid="holder-count-input"
              type="text"
              inputMode="numeric"
              aria-label={t('持有套数', 'Number of properties')}
              className="w-[5.5rem] bg-transparent outline-none text-center text-[56px] font-semibold tabular-nums leading-none tracking-tight text-slate-900"
              value={shown}
              onChange={e => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              onBlur={e => commit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
            <span className="pb-1 text-[15px] font-medium text-slate-500">{t('套', '')}</span>
          </div>
          <div className="mt-1.5 text-[13px] text-slate-500" data-testid="holder-band">{bandHint(value, t)}</div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            data-testid="holder-dec"
            aria-label={t('减少', 'Decrease')}
            disabled={value <= HOLD_MIN}
            onClick={() => bump(-1)}
            className="shrink-0 h-9 w-9 rounded-full border border-slate-200 bg-white text-[18px] leading-none text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >−</button>
          <input
            type="range"
            data-testid="holder-slider"
            min={HOLD_MIN}
            max={HOLD_MAX}
            step="1"
            value={value}
            aria-label={t('持有套数', 'Number of properties')}
            className="min-w-0 flex-1 h-9 accent-slate-900"
            onChange={e => { setDraft(null); setValue(clampHold(e.target.value)) }}
          />
          <button
            type="button"
            data-testid="holder-inc"
            aria-label={t('增加', 'Increase')}
            disabled={value >= HOLD_MAX}
            onClick={() => bump(1)}
            className="shrink-0 h-9 w-9 rounded-full border border-slate-200 bg-white text-[18px] leading-none text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
          >+</button>
        </div>
        <div className="mt-0.5 flex justify-between text-[11px] text-slate-400 tabular-nums px-1">
          <span>0</span><span>100</span>
        </div>

        <button
          type="button"
          data-testid="holder-continue"
          onClick={save}
          className="mt-5 w-full h-11 rounded-full bg-slate-900 text-white text-[15px] font-semibold"
        >
          {t('继续', 'Continue')}
        </button>
        {mode === 'onboard' && (
          <button
            type="button"
            data-testid="holder-skip"
            onClick={skip}
            className="mt-2 w-full h-10 text-[13px] font-medium text-slate-500"
          >
            {t('跳过，稍后再说', 'Skip for now')}
          </button>
        )}
      </div>
    </div>
  )
}

export function HoldChip({ className = '' }) {
  const { t } = useLang()
  const { holder } = useHolder()
  const [open, setOpen] = useState(false)
  const label = !holder.asked || holder.skipped || holder.count == null
    ? t('持有房产', 'Holdings')
    : t(`持有 ${holder.count} 套`, holder.count === 1 ? 'Holds 1' : `Holds ${holder.count}`)
  return (
    <>
      <button
        type="button"
        data-testid="holder-chip"
        onClick={() => setOpen(true)}
        className={`shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 h-8 text-[12px] font-medium text-slate-700 ${className}`}
      >
        {label}
      </button>
      <HolderSheet open={open} mode={holder.asked ? 'edit' : 'onboard'} onClose={() => setOpen(false)} />
    </>
  )
}

export function FirstBuyerNote() {
  const { t } = useLang()
  return (
    <details className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] group" data-testid="first-buyer-note">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 text-[13px] font-medium text-slate-800">
        <span>{t('首次置业可以先看什么', 'What to look at first')}</span>
        <span className="text-slate-400 text-[12px] font-medium group-open:hidden">{t('展开', 'Show')}</span>
        <span className="text-slate-400 text-[12px] font-medium hidden group-open:inline">{t('收起', 'Hide')}</span>
      </summary>
      <div className="px-4 pb-4 border-t border-slate-100 text-[12px] text-slate-600 leading-relaxed space-y-1.5">
        <p>{t('先看入场要准备多少钱，以及月供能不能负担。', 'Start with how much cash you need to enter, and whether the monthly instalment is comfortable.')}</p>
        <p>{t('入场成本 = 首付（房价中未贷款的部分）+ 约 4% 的律师费和印花税估算。这是常用的粗算，不是律师行报价。', 'Entry cost = the down payment (the un-loaned share of the price) plus an approximate 4% for legal fees and stamp duty. This is a rough allowance, not a solicitor’s quote.')}</p>
        <p>{t('月供按你设定的贷款成数、利率和年限计算，租金是叫租估算。数字只供参考，不是银行批复，也不是投资建议。', 'The instalment uses your loan percentage, rate and tenure. Rent is an asking-rent estimate. Figures are indicative only — not a bank offer, and not investment advice.')}</p>
      </div>
    </details>
  )
}

export function OnboardingHost() {
  const { holder } = useHolder()
  const [open, setOpen] = useState(!holder.asked)
  useEffect(() => { if (!holder.asked) setOpen(true) }, [holder.asked])
  return <HolderSheet open={open && !holder.asked} mode="onboard" onClose={() => setOpen(false)} />
}
