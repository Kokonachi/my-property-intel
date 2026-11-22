import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { cashVsRent, signedRM, DEFAULT_LTV, LTV_MIN, LTV_MAX, LTV_STEP, clampLtv } from '../lib/mortgage.js'
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
    setLoan({ ltv: clampLtv(n) })
  }
  const bump = dir => setLoan({ ltv: clampLtv(loan.ltv + dir * LTV_STEP) })
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
          onChange={e => setLoan({ ltv: clampLtv(e.target.value) })}
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
export function LtvCompare({ price, rentMo, maintMo }) {
  const { t } = useLang()
  const { loan, v } = useCurrentVerdict({ price, rentMo, maintMo })
  if (!v || !rentMo) return null
  const max = Math.max(rentMo, v.inst, 1)
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="ltv-compare">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-900">{t('月供 vs 租金', 'Instalment vs rent')}</div>
        <div className="text-[11px] text-slate-500">{t('叫租估算，非实收', 'Asking-rent estimate, not achieved rent')}</div>
      </div>
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
        {t(`首付 RM${Math.round(v.down).toLocaleString('en-MY')}（表价或折后价的 ${100 - loan.ltv}%）`,
          `Down payment RM${Math.round(v.down).toLocaleString('en-MY')} (${100 - loan.ltv}% of list or after-discount price)`)}
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

export function LoanAssumptionsBar() {
  const { t } = useLang()
  const { loan, setLoan } = useLoanAssumptions()
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3" data-testid="loan-assumptions">
      <div className="text-[13px] font-semibold text-slate-900">{t('房贷假设（可改）', 'Loan assumptions (editable)')}</div>
      <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
        {t(
          '贷款成数默认 90%，可在 50%–90% 之间改，首页、地图小窗和本页共用。国行 2026 年 11 月 5 日维持隔夜政策利率 2.75%，各银行标准化基准利率（SBR）同为 2.75%。默认 4.3% 是目前市面常见浮动房贷（约 4.10–4.75%）的中间值，不是银行批复利率；投资客贷款可能更高。年期默认 35 年，通常会受年龄上限（多为 70 岁）限制。月供按表价或你填的折后价计算，租金是叫租估算。',
          'Loan percentage defaults to 90% and can be set anywhere from 50% to 90%; the same value is shared on the home list, the map panel and this page. Bank Negara held the OPR at 2.75% on 5 Nov 2026, so every bank’s SBR is 2.75%. The 4.3% default is a mid-market assumption among advertised floating packages (about 4.10–4.75%), not a bank offer; investor loans can be higher. Tenure defaults to 35 years, often capped by age (commonly 70). Instalment uses the list or after-discount price. Rent is an asking-rent estimate.',
        )}
      </p>
      <div className="mt-2">
        <LoanPctControl variant="full" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 max-w-sm">
        <label className="rounded-xl border border-slate-200 px-3 py-2">
          <div className="text-[11px] text-slate-500">{t('年利率', 'Interest rate')}</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.05"
              min="0.5"
              max="15"
              data-testid="loan-rate"
              className="w-full bg-transparent outline-none font-semibold tabular-nums"
              value={loan.rate}
              onChange={e => setLoan({ ...loan, rate: e.target.value })}
            />
            <span className="text-[11px] text-slate-400 shrink-0">% p.a.</span>
          </div>
        </label>
        <label className="rounded-xl border border-slate-200 px-3 py-2">
          <div className="text-[11px] text-slate-500">{t('贷款年期', 'Tenure')}</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="1"
              min="5"
              max="40"
              data-testid="loan-years"
              className="w-full bg-transparent outline-none font-semibold tabular-nums"
              value={loan.years}
              onChange={e => setLoan({ ...loan, years: e.target.value })}
            />
            <span className="text-[11px] text-slate-400 shrink-0">{t('年', 'yrs')}</span>
          </div>
        </label>
      </div>
    </div>
  )
}

export { DEFAULT_LTV }
