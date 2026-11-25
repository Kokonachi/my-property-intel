import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { cashVsRent, signedRM, DEFAULT_LTV, LTV_MIN, LTV_MAX, LTV_STEP, clampLtv, RATE_MIN, RATE_MAX, YEARS_MIN, YEARS_MAX } from '../lib/mortgage.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { headlineVerdict, downLabel } from '../lib/launchScore.js'

function cf(n, t) {
  const v = Math.round(n)
  const body = `RM${Math.abs(v).toLocaleString('en-MY')}${t('/月', '/mo')}`
  if (v > 0) return `+${body}`
  if (v < 0) return `−${body}`
  return body
}

export function ltvWho(ltv, t) {
  return t(`贷${ltv}%`, `${ltv}% loan`)
}

function useCurrentVerdict({ price, rentMo, maintMo = 0 }) {
  const { loan } = useLoanAssumptions()
  const v = cashVsRent({ price, rentMo, ltv: loan.ltv, rate: loan.rate, years: loan.years, maintMo })
  return { loan, v }
}

/** Global loan-percentage control. Default 90%, 50–90, stepper of 5, plus a typed value. */
export function LoanPctControl({ variant = 'header', className = '' }) {
  const { t } = useLang()
  const { loan, setLoan } = useLoanAssumptions()
  const [draft, setDraft] = useState(null)
  useEffect(() => { setDraft(null) }, [loan.ltv])
  const shown = draft ?? String(loan.ltv)
  const commit = raw => {
    setDraft(null)
    const n = Number(String(raw).trim())
    if (!Number.isFinite(n)) return
    setLoan({ ltv: clampLtv(n) }, { source: 'user' })
  }
  const bump = dir => setLoan({ ltv: clampLtv(loan.ltv + dir * LTV_STEP) }, { source: 'user' })
  const showSlider = variant !== 'compact'

  return (
    <div
      data-testid="loan-pct"
      className={`flex items-center gap-1.5 min-w-0 ${className}`}
    >
      <span className="shrink-0 text-[11px] font-medium text-slate-500">{t('贷款', 'Loan')}</span>
      <button
        type="button"
        data-testid="loan-pct-dec"
        aria-label={t('降低贷款成数', 'Decrease loan percentage')}
        disabled={loan.ltv <= LTV_MIN}
        onClick={() => bump(-1)}
        className="shrink-0 h-7 w-7 rounded-full border border-slate-200 bg-white text-[16px] leading-none text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
      >−</button>
      <label className="shrink-0 inline-flex items-center h-7 rounded-full border border-slate-200 bg-white px-2">
        <input
          data-testid="loan-pct-input"
          type="text"
          inputMode="numeric"
          aria-label={t('贷款成数', 'Loan percentage')}
          className="w-7 bg-transparent outline-none text-center text-[13px] font-semibold tabular-nums text-slate-900"
          value={shown}
          onChange={e => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
        />
        <span className="text-[11px] font-semibold text-slate-500">%</span>
      </label>
      <button
        type="button"
        data-testid="loan-pct-inc"
        aria-label={t('提高贷款成数', 'Increase loan percentage')}
        disabled={loan.ltv >= LTV_MAX}
        onClick={() => bump(1)}
        className="shrink-0 h-7 w-7 rounded-full border border-slate-200 bg-white text-[16px] leading-none text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
      >+</button>
      {showSlider && (
        <input
          type="range"
          data-testid="loan-pct-slider"
          min={LTV_MIN}
          max={LTV_MAX}
          step={LTV_STEP}
          value={loan.ltv}
          aria-label={t('贷款成数', 'Loan percentage')}
          className="min-w-0 flex-1 h-7 accent-slate-900"
          onChange={e => setLoan({ ltv: clampLtv(e.target.value) }, { source: 'user' })}
        />
      )}
    </div>
  )
}

/** One calm tinted verdict for the current loan percentage. */
export function LoanVerdict({ price, rentMo, className = '', compact = false }) {
  const { t } = useLang()
  const { loan, v } = useCurrentVerdict({ price, rentMo })
  if (!v) {
    return (
      <div className={`text-[12px] text-slate-500 ${className}`} data-testid="loan-verdict">
        {t('填报价后可看月供 vs 租金', 'Enter a quote to compare instalment vs rent')}
      </div>
    )
  }
  const s = { v, ltv: loan.ltv }
  const line = headlineVerdict(s, t)
  const down = downLabel(v.down, t)
  return (
    <div
      data-testid="loan-verdict"
      data-ltv={loan.ltv}
      title={t(
        `${ltvWho(loan.ltv, t)}：月供约 RM${Math.round(v.inst).toLocaleString('en-MY')}，参考叫租 RM${Math.round(v.rentMo).toLocaleString('en-MY')}/月，首付约 RM${Math.round(v.down).toLocaleString('en-MY')}。租金是叫租估算。`,
        `${ltvWho(loan.ltv, t)}: instalment about RM${Math.round(v.inst).toLocaleString('en-MY')} vs asking rent RM${Math.round(v.rentMo).toLocaleString('en-MY')}/mo, down payment about RM${Math.round(v.down).toLocaleString('en-MY')}. Rent is an asking-rent estimate.`,
      )}
      className={`rounded-xl px-2.5 py-1.5 ${v.covers ? 'bg-[#eef7f2] text-[#176b45]' : 'bg-[#f8eeee] text-[#9f1239]'} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold leading-snug">{line}</span>
      </div>
      {!compact && (
        <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-medium tabular-nums text-slate-600">
          <span>{t('月供', 'Inst.')} RM{Math.round(v.inst).toLocaleString('en-MY')}</span>
          <span>{t('租金', 'Rent')} RM{Math.round(v.rentMo).toLocaleString('en-MY')}</span>
          {down && <span>{down}</span>}
        </div>
      )}
    </div>
  )
}

/** @deprecated alias — single current-LTV verdict. */
export function LtvChips(props) {
  return <LoanVerdict {...props} compact={props.stacked ? false : true} />
}

export function LtvRows(props) {
  return <LoanVerdict {...props} />
}

/** Detail-page bar: rent vs instalment at the current loan %, plus net after maintenance. */
export function LtvCompare({ price, rentMo, maintMo, hideTitle = false }) {
  const { t } = useLang()
  const { loan, v } = useCurrentVerdict({ price, rentMo, maintMo })
  if (!v || !rentMo) return null
  const max = Math.max(rentMo, v.inst, 1)
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="ltv-compare">
      {!hideTitle && (
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[13px] font-semibold text-slate-900">{t('月供 vs 租金', 'Instalment vs rent')}</div>
          <div className="text-[11px] text-slate-500">{t('叫租估算，非实收', 'Asking-rent estimate, not achieved rent')}</div>
        </div>
      )}
      <div className="mt-2 space-y-2">
        <Bar label={t('参考月租', 'Est. rent')} value={rentMo} max={max} color="#0f172a" t={t} />
        <div>
          <Bar
            label={`${ltvWho(loan.ltv, t)} ${t('月供', 'instalment')}`}
            value={v.inst}
            max={max}
            color={v.covers ? '#059669' : '#be123c'}
            t={t}
          />
          <div className={`mt-0.5 text-[12px] font-semibold tabular-nums ${v.covers ? 'text-emerald-800' : 'text-rose-800'}`}>
            {v.covers
              ? t(`租金 > 月供 ${signedRM(v.cash, { withMo: true, t })}`, `Rent covers instalment ${signedRM(v.cash, { withMo: true, t })}`)
              : t(`倒贴 RM${Math.abs(Math.round(v.cash)).toLocaleString('en-MY')}/月`, `Short RM${Math.abs(Math.round(v.cash)).toLocaleString('en-MY')}/mo`)}
            <span className="ml-2 font-medium text-slate-500">
              {t(`扣管理费后 ${cf(v.cashAfterMaint, t)}`, `After maintenance ${cf(v.cashAfterMaint, t)}`)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[12px] text-slate-600 tabular-nums">
        {t(`首付 RM${Math.round(v.down).toLocaleString('en-MY')}（该价格的 ${100 - loan.ltv}%）`,
          `Down payment RM${Math.round(v.down).toLocaleString('en-MY')} (${100 - loan.ltv}% of this price)`)}
      </div>
    </div>
  )
}

function Bar({ label, value, max, color, t }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-900">RM{Math.round(value).toLocaleString('en-MY')}{t('/月', '/mo')}</span>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function parseYears(raw) {
  const n = Math.round(Number(String(raw).trim()))
  return Number.isFinite(n) && n >= YEARS_MIN && n <= YEARS_MAX ? n : null
}

function parseRate(raw) {
  const n = Number(String(raw).trim())
  return Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX ? n : null
}

function selectAll(el) {
  if (!el) return
  el.select()
  try { el.setSelectionRange(0, el.value.length) } catch { /* ignore */ }
}

export function LoanRateYears({ className = '' }) {
  const { t } = useLang()
  const { loan, setLoan } = useLoanAssumptions()
  const [rateDraft, setRateDraft] = useState(null)
  const [yearsDraft, setYearsDraft] = useState(null)
  useEffect(() => { setRateDraft(null) }, [loan.rate])
  useEffect(() => { setYearsDraft(null) }, [loan.years])

  const commitRate = raw => {
    const n = parseRate(raw)
    if (n != null) setLoan({ rate: n })
    setRateDraft(null)
  }
  const commitYears = raw => {
    const n = parseYears(raw)
    if (n != null) setLoan({ years: n })
    setYearsDraft(null)
  }

  return (
    <div className={`mt-2 grid grid-cols-2 gap-2 ${className}`} data-testid="loan-rate-years">
      <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-[11px] text-slate-500">{t('年利率', 'Interest rate')}</div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-testid="loan-rate"
            aria-label={t('年利率', 'Interest rate')}
            className="w-full bg-transparent outline-none font-semibold tabular-nums text-[16px] leading-snug"
            value={rateDraft ?? String(loan.rate)}
            onFocus={e => { setRateDraft(String(loan.rate)); requestAnimationFrame(() => selectAll(e.target)) }}
            onClick={e => selectAll(e.currentTarget)}
            onChange={e => setRateDraft(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6))}
            onBlur={e => commitRate(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setRateDraft(null)
            }}
          />
          <span className="text-[11px] text-slate-400 shrink-0">% p.a.</span>
        </div>
      </label>
      <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-[11px] text-slate-500">{t('贷款年期', 'Tenure')}</div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-testid="loan-years"
            aria-label={t('贷款年期', 'Tenure')}
            className="w-full bg-transparent outline-none font-semibold tabular-nums text-[16px] leading-snug"
            value={yearsDraft ?? String(loan.years)}
            onFocus={e => { setYearsDraft(String(loan.years)); requestAnimationFrame(() => selectAll(e.target)) }}
            onClick={e => selectAll(e.currentTarget)}
            onChange={e => setYearsDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
            onBlur={e => commitYears(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setYearsDraft(null)
            }}
          />
          <span className="text-[11px] text-slate-400 shrink-0">{t('年', 'yrs')}</span>
        </div>
      </label>
    </div>
  )
}

/** Compact loan % + rate/tenure controls. Explanatory copy lives in the page’s data section. */
export function LoanAssumptionsBar({ end }) {
  return (
    <div className="rounded-2xl bg-white p-3 sm:p-4 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]" data-testid="loan-assumptions">
      <div className="flex items-center gap-2">
        <LoanPctControl variant="full" className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-200/80 px-2 py-1" />
        {end}
      </div>
      <LoanRateYears />
    </div>
  )
}

export { DEFAULT_LTV }
