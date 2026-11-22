import { useLang } from '../lib/i18n.jsx'
import { ltvVerdicts, signedRM } from '../lib/mortgage.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'

function cf(n, t) {
  const v = Math.round(n)
  const body = `RM${Math.abs(v).toLocaleString('en-MY')}${t('/月', '/mo')}`
  if (v > 0) return `+${body}`
  if (v < 0) return `−${body}`
  return body
}

export function ltvWho(ltv, t) {
  if (ltv === 90) return t('第1–2套 · 贷90%', '1st–2nd · 90%')
  if (ltv === 70) return t('第3套起 · 贷70%', '3rd+ · 70%')
  return t(`贷${ltv}%`, `${ltv}%`)
}

function cashLabel(r, t) {
  const amt = Math.abs(Math.round(r.cash)).toLocaleString('en-MY')
  if (r.covers) return `+RM${amt}`
  return t(`倒贴 RM${amt}`, `−RM${amt}`)
}

/** Glanceable 90% / 70% LTV cash-flow chips, labelled for BNM 1st–2nd vs 3rd+ caps. Rent is an asking-rent estimate. */
export function LtvChips({ price, rentMo, className = '', stacked = false }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const rows = ltvVerdicts({ price, rentMo, rate: loan.rate, years: loan.years })
  if (!rows) {
    return (
      <div className={`text-[11px] font-semibold text-slate-500 ${className}`}>
        {t('填报价后可看月供 vs 租金', 'Enter a quote to compare instalment vs rent')}
      </div>
    )
  }
  return (
    <div className={`${stacked ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1'} ${className}`} data-testid="ltv-chips">
      {rows.map(r => (
        <span
          key={r.ltv}
          data-testid={`ltv-${r.ltv}`}
          title={t(
            `${ltvWho(r.ltv, t)}：月供约 RM${Math.round(r.inst).toLocaleString('en-MY')}，参考叫租 RM${Math.round(r.rentMo).toLocaleString('en-MY')}/月。国行规定：第一、二套住宅最多贷 90%，第三套起最多贷 70%。`,
            `${ltvWho(r.ltv, t)}: instalment about RM${Math.round(r.inst).toLocaleString('en-MY')} vs asking rent RM${Math.round(r.rentMo).toLocaleString('en-MY')}/mo. BNM cap: 90% on a 1st or 2nd residential loan, 70% from the 3rd.`,
          )}
          className={`${stacked ? 'flex w-full items-center justify-between gap-2 px-2 py-1' : 'inline-flex items-center gap-1 px-1.5 py-0.5'} rounded-full text-[11px] font-extrabold tabular-nums leading-tight ${
            r.covers ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          <span className="whitespace-nowrap">{ltvWho(r.ltv, t)}</span>
          <span className="whitespace-nowrap">{cashLabel(r, t)}</span>
        </span>
      ))}
    </div>
  )
}

/** Soft, calm 90%/70% rows — not saturated bars. */
export function LtvRows({ price, rentMo, className = '' }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const rows = ltvVerdicts({ price, rentMo, rate: loan.rate, years: loan.years })
  if (!rows) {
    return (
      <div className={`text-[12px] text-slate-500 ${className}`}>
        {t('填报价后可看月供 vs 租金', 'Enter a quote to compare instalment vs rent')}
      </div>
    )
  }
  return (
    <div className={`grid grid-cols-1 gap-1 ${className}`} data-testid="ltv-chips">
      {rows.map(r => (
        <div
          key={r.ltv}
          data-testid={`ltv-${r.ltv}`}
          title={t(
            `${ltvWho(r.ltv, t)}：月供约 RM${Math.round(r.inst).toLocaleString('en-MY')}，参考叫租 RM${Math.round(r.rentMo).toLocaleString('en-MY')}/月。国行规定：第一、二套住宅最多贷 90%，第三套起最多贷 70%。`,
            `${ltvWho(r.ltv, t)}: instalment about RM${Math.round(r.inst).toLocaleString('en-MY')} vs asking rent RM${Math.round(r.rentMo).toLocaleString('en-MY')}/mo. BNM cap: 90% on a 1st or 2nd residential loan, 70% from the 3rd.`,
          )}
          className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${
            r.covers ? 'bg-[#eef7f2] text-[#176b45]' : 'bg-[#f8eeee] text-[#9f1239]'
          }`}
        >
          <span className="text-[11px] font-medium leading-none whitespace-nowrap">{ltvWho(r.ltv, t)}</span>
          <span className="text-[12px] font-semibold tabular-nums leading-none whitespace-nowrap">{cashLabel(r, t)}</span>
        </div>
      ))}
    </div>
  )
}

/** Detail-page bar: rent vs 90% / 70% instalment, plus net after maintenance. */
export function LtvCompare({ price, rentMo, maintMo }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const rows = ltvVerdicts({ price, rentMo, rate: loan.rate, years: loan.years, maintMo })
  if (!rows || !rentMo) return null
  const max = Math.max(rentMo, ...rows.map(r => r.inst), 1)
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="ltv-compare">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-900">{t('月供 vs 租金', 'Instalment vs rent')}</div>
        <div className="text-[11px] text-slate-500">{t('叫租估算，非实收', 'Asking-rent estimate, not achieved rent')}</div>
      </div>
      <div className="mt-2 space-y-2">
        <Bar label={t('参考月租', 'Est. rent')} value={rentMo} max={max} color="#0f172a" t={t} />
        {rows.map(r => (
          <div key={r.ltv}>
            <Bar
              label={`${ltvWho(r.ltv, t)} ${t('月供', 'instalment')}`}
              value={r.inst}
              max={max}
              color={r.covers ? '#059669' : '#e11d48'}
              t={t}
            />
            <div className={`mt-0.5 text-[12px] font-semibold tabular-nums ${r.covers ? 'text-emerald-700' : 'text-rose-700'}`}>
              {r.covers
                ? t(`租金 > 月供 ${signedRM(r.cash, { withMo: true, t })}`, `Rent covers instalment ${signedRM(r.cash, { withMo: true, t })}`)
                : t(`倒贴 RM${Math.abs(Math.round(r.cash)).toLocaleString('en-MY')}/月`, `Short RM${Math.abs(Math.round(r.cash)).toLocaleString('en-MY')}/mo`)}
              <span className="ml-2 font-medium text-slate-500">
                {t(`扣管理费后 ${cf(r.cashAfterMaint, t)}`, `After maintenance ${cf(r.cashAfterMaint, t)}`)}
              </span>
            </div>
          </div>
        ))}
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
          '国行 2026 年 11 月 5 日维持隔夜政策利率 2.75%，各银行标准化基准利率（SBR）同为 2.75%。默认 4.3% 是目前市面常见浮动房贷（约 4.10–4.75%）的中间值，不是银行批复利率；投资客贷款可能更高。年期默认 35 年，通常会受年龄上限（多为 70 岁）限制。按国行规定，个人名下第一、二套住宅最多贷 90%，第三套起最多贷 70%。月供按表价或你填的折后价计算，租金是叫租估算。',
          'Bank Negara held the OPR at 2.75% on 5 Nov 2026, so every bank’s SBR is 2.75%. The 4.3% default is a mid-market assumption among advertised floating packages (about 4.10–4.75%), not a bank offer; investor loans can be higher. Tenure defaults to 35 years, often capped by age (commonly 70). Under BNM rules, a 1st or 2nd residential loan is capped at 90% LTV; from the 3rd property the cap is 70%. Instalment uses the list or after-discount price. Rent is an asking-rent estimate.',
        )}
      </p>
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
