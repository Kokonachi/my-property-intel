import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { GOALS } from '../lib/holderProfile.js'
import { launchRisks, sensitivity, constructionInterest } from '../lib/launchRisk.js'
import { ownerMonthly } from './CompareTiles.jsx'

const signed = n => {
  const v = Math.round(n)
  const body = `RM${Math.abs(v).toLocaleString('en-MY')}`
  return v > 0 ? `+${body}` : v < 0 ? `−${body}` : body
}
const rmK = n => (Math.abs(n) >= 100000 ? `RM${Math.round(n / 1000).toLocaleString('en-MY')}k` : `RM${Math.round(n).toLocaleString('en-MY')}`)
const tone = n => (n >= 0 ? 'text-[#176b45]' : 'text-[#9f1239]')

function Num({ label, value, sub, className = '', testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2" data-testid={testId}>
      <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
      <div className={`mt-1 text-[17px] font-semibold tabular-nums leading-none tracking-tight ${className}`}>{value}</div>
      {sub ? <div className="mt-1 text-[10.5px] text-slate-500 leading-tight">{sub}</div> : null}
    </div>
  )
}

/** First screen of a launch: one sentence, three numbers, what could go wrong. */
export function DecisionSummary({ p, s, entry, goal, loan, currentRent, embedded = false }) {
  const { t } = useLang()
  if (!s?.v || !s.typ) return null
  const home = goal === GOALS.home
  const typ = s.typ
  const room = typ.beds == null ? '' : typ.beds <= 0 ? t('套房', 'studio') : t(`${typ.beds} 房`, `${typ.beds}-bed`)
  const unit = `${room} ${typ.size.toLocaleString()} sqft`.trim()
  const premium = s.psf && s.area?.medianPsf ? (s.psf / s.area.medianPsf - 1) * 100 : null
  const handover = p.handover_after_extension || p.handover_spa
  const ci = constructionInterest({ loan: s.v.loan, rate: loan.rate, progressPct: p.construction_progress_pct, handover })
  const own = ownerMonthly(s.v)
  const now = Number(currentRent) > 0 ? Number(currentRent) : null
  const risks = launchRisks(p, s, { loan })
  const sens = home ? null : sensitivity({ price: s.price, rentMo: s.v.rentMo, ltv: loan.ltv, rate: loan.rate, years: loan.years, maintMo: s.v.maintMo })
  const rm = n => fmtRM(Math.round(n))
  const year = p.expected_completion_year

  let sentence
  if (home) {
    const tail = now != null
      ? t(`交房后自住每月 ${rm(own.total)}，比你现在的租金${own.total >= now ? '多' : '少'} ${rm(Math.abs(own.total - now))}。`,
        `After handover, owning costs ${rm(own.total)}/mo, ${rm(Math.abs(own.total - now))} ${own.total >= now ? 'more' : 'less'} than your rent now.`)
      : t(`交房后自住每月约 ${rm(own.total)}。`, `After handover, owning costs about ${rm(own.total)}/mo.`)
    sentence = t(`贷 ${loan.ltv}% 买 ${unit}，先要准备 ${rm(entry?.total)}${ci && ci.years >= 0.25 ? `，${year} 年交房前还要付约 ${rm(ci.total)} 利息` : ''}。`,
      `With a ${loan.ltv}% loan on the ${unit}, you need ${rm(entry?.total)} up front${ci && ci.years >= 0.25 ? `, plus about ${rm(ci.total)} of interest before handover in ${year}` : ''}. `) + tail
  } else {
    const cash = s.v.cash
    sentence = t(
      `贷 ${loan.ltv}% 买 ${unit} 出租，扣掉持有成本后每月${cash >= 0 ? `净赚 ${rm(cash)}` : `净倒贴 ${rm(-cash)}`}。${premium != null ? `表价比同区二手${premium >= 0 ? '贵' : '便宜'} ${Math.round(Math.abs(premium))}%` : ''}${year ? `，${year} 年才交房` : ''}。`,
      `A ${loan.ltv}% loan on the ${unit}, let out: ${cash >= 0 ? `${rm(cash)} a month left over` : `${rm(-cash)} a month to top up`} after holding costs.${premium != null ? ` List price is ${Math.round(Math.abs(premium))}% ${premium >= 0 ? 'above' : 'below'} resale nearby` : ''}${year ? `, ready in ${year}` : ''}.`,
    )
  }

  return (
    <section className={embedded ? 'mt-4 border-t border-slate-100 pt-4' : 'rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]'} data-testid="decision-summary">
      <div className="text-[11px] font-medium text-slate-500">{t('先看结论', 'The short version')}</div>
      <p className="mt-1 text-[15px] font-medium leading-snug text-slate-900" data-testid="decision-sentence">{sentence}</p>
      <div className="mt-1 text-[11px] text-slate-500">{t(`按 ${t(typ.type_zh, typ.type)} 表价 ${rm(s.price)} 计算；下面各户型可单独看。`, `Based on ${typ.type} at the list price of ${rm(s.price)}; every unit type is below.`)}</div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Num testId="sum-entry" label={t('入场现金', 'Cash to enter')} value={entry?.total != null ? rmK(entry.total) : '—'} sub={t(`首付 ${rmK(entry?.down)} + 费用`, `Down ${rmK(entry?.down)} + fees`)} className="text-slate-900" />
        {home ? (
          now != null
            ? <Num testId="sum-monthly" label={t('比现在租房', 'Vs your rent')} value={`${signed(own.total - now)}`} sub={t(`自住每月 ${rm(own.total)}`, `Own ${rm(own.total)}/mo`)} className={tone(now - own.total)} />
            : <Num testId="sum-monthly" label={t('自住每月支出', 'Cost to own')} value={rmK(own.total)} sub={t(`其中本金 ${rm(own.principal)}`, `Principal ${rm(own.principal)}`)} className="text-slate-900" />
        ) : (
          <Num testId="sum-monthly" label={t('每月净现金流', 'Net cash / mo')} value={signed(s.v.cash)} sub={t(`其中本金 ${rm(s.v.principalMo)}`, `Principal ${rm(s.v.principalMo)}`)} className={tone(s.v.cash)} />
        )}
        <Num testId="sum-premium" label={t('比同区二手', 'Vs resale nearby')} value={premium == null ? '—' : `${premium >= 0 ? '+' : '−'}${Math.round(Math.abs(premium))}%`}
          sub={s.area?.medianPsf ? `RM${Math.round(s.psf)} vs RM${s.area.medianPsf} psf` : null} className={premium != null && premium > 15 ? 'text-amber-700' : 'text-slate-900'} />
      </div>

      {sens && (
        <div className="mt-2.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11.5px] tabular-nums text-slate-600" data-testid="sensitivity">
          <span className="font-medium text-slate-700">{t('如果情况变差：', 'If things get worse: ')}</span>
          {t(`租金 −10% ${signed(sens.lowRent)}`, `rent −10% ${signed(sens.lowRent)}`)}
          <span className="text-slate-300"> · </span>
          {t(`利率 +1% ${signed(sens.highRate)}`, `rate +1% ${signed(sens.highRate)}`)}
          <span className="text-slate-300"> · </span>
          {t(`两者都发生 ${signed(sens.both)}`, `both ${signed(sens.both)}`)}
          {t(' /月', ' /mo')}
        </div>
      )}

      {risks.length > 0 && (
        <div className="mt-3" data-testid="risk-list">
          <div className="text-[12px] font-semibold text-slate-900">{t('要先想清楚的风险', 'Risks to weigh first')}</div>
          <ul className="mt-1.5 space-y-1.5">
            {risks.map(r => (
              <li key={r.id} className="flex items-start gap-2 text-[12.5px] leading-snug text-slate-700" data-testid={`risk-${r.id}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.level === 'high' ? 'bg-[#be123c]' : 'bg-amber-500'}`} aria-hidden="true" />
                <span>{t(r.zh, r.en)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[10.5px] text-slate-400 leading-snug">{t('估算，不是银行或发展商的报价，不构成投资建议。', 'Estimates, not a bank or developer quote. Not investment advice.')}</p>
    </section>
  )
}
