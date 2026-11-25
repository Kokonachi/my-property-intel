import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { GOALS, LOANS_MAX, THIRD_LOAN_LTV, useHolder } from '../lib/holderProfile.js'
import { parseMoney } from '../lib/mortgage.js'
import { IconInfo, IconKey, IconCalendar, IconHouse } from './icons.jsx'

const GOAL_OPTIONS = [
  { id: GOALS.home, zh: '自住', en: 'To live in' },
  { id: GOALS.invest, zh: '投资', en: 'To invest' },
]

/** Compact two-way toggle for the header. Nothing is selected until the visitor picks. */
export function GoalToggle({ className = '' }) {
  const { t } = useLang()
  const { goal, setGoal } = useHolder()
  return (
    <div className={`shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 ${className}`} role="radiogroup" aria-label={t('买房目的', 'Buying to')} data-testid="goal-toggle">
      {GOAL_OPTIONS.map(o => {
        const on = goal === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-testid={`goal-${o.id}`}
            onClick={() => setGoal(o.id)}
            className={`h-7 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap ${on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {t(o.zh, o.en)}
          </button>
        )
      })}
    </div>
  )
}

/** In-page prompt shown until a goal is picked. It never blocks the content below. */
export function GoalPrompt({ className = '' }) {
  const { t } = useLang()
  const { goal, setGoal } = useHolder()
  if (goal) return null
  const opts = [
    { id: GOALS.home, title: t('买来自住', 'To live in'), body: t('入场要准备多少钱，每月供房比现在租房多多少。', 'Cash to enter, and how owning compares with your rent each month.') },
    { id: GOALS.invest, title: t('买来投资', 'To invest'), body: t('出租后每月净现金流（已扣持有成本）和回报。', 'Net monthly cash flow if let (after holding costs) and yields.') },
  ]
  return (
    <section className={`rounded-2xl bg-white p-3.5 ring-1 ring-slate-200/80 ${className}`} data-testid="goal-prompt">
      <div className="text-[14px] font-semibold text-slate-900">{t('你买房是为了？', 'Why are you buying?')}</div>
      <div className="mt-0.5 text-[12px] text-slate-500">{t('选一个，卡片会先显示你最关心的数字。随时可以在顶部切换。', 'Pick one and the cards lead with the numbers that matter to you. You can switch at the top any time.')}</div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {opts.map(o => (
          <button key={o.id} type="button" data-testid={`goal-prompt-${o.id}`} onClick={() => setGoal(o.id)}
            className="text-left rounded-xl border border-slate-200 px-3 py-2.5 hover:border-slate-900">
            <div className="text-[14px] font-semibold text-slate-900">{o.title}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{o.body}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

/** Inline "what do you pay in rent now?" for owner-occupiers. Saves on blur / Enter. */
export function RentPrompt({ className = '', compact = false }) {
  const { t } = useLang()
  const { holder, setBudget } = useHolder()
  const [raw, setRaw] = useState(holder.currentRent != null ? String(Math.round(holder.currentRent)) : '')
  useEffect(() => { setRaw(holder.currentRent != null ? String(Math.round(holder.currentRent)) : '') }, [holder.currentRent])
  const save = () => setBudget({ currentRent: parseMoney(raw) })
  return (
    <label className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 ${compact ? 'py-1.5' : 'py-2'} ${className}`} data-testid="rent-prompt">
      <span className="shrink-0 text-[12px] text-slate-500">{t('你现在每月租金', 'Your rent now')}</span>
      <span className="text-[12px] text-slate-400">RM</span>
      <input
        data-testid="rent-input"
        inputMode="decimal"
        enterKeyHint="done"
        placeholder="2,500"
        className="min-w-0 flex-1 bg-transparent outline-none text-[15px] font-semibold tabular-nums text-slate-900"
        value={raw}
        onChange={e => setRaw(e.target.value.replace(/[^\d.,]/g, '').slice(0, 9))}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    </label>
  )
}

/** How many housing loans the buyer already has. Only sets the loan cap (70% from the 3rd loan). */
export function LoansControl({ className = '' }) {
  const { t } = useLang()
  const { holder, setLoans, ltvCap } = useHolder()
  const n = holder.loans || 0
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="loans-control">
      <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">{t('名下已有房贷', 'Housing loans now')}</span>
      <button type="button" data-testid="loans-dec" aria-label={t('减少', 'Fewer')} disabled={n <= 0} onClick={() => setLoans(n - 1)}
        className="h-7 w-7 rounded-full border border-slate-200 bg-white text-[16px] leading-none text-slate-700 disabled:opacity-30">−</button>
      <span className="min-w-[1.25rem] text-center text-[13px] font-semibold tabular-nums text-slate-900" data-testid="loans-count">{n}</span>
      <button type="button" data-testid="loans-inc" aria-label={t('增加', 'More')} disabled={n >= LOANS_MAX} onClick={() => setLoans(n + 1)}
        className="h-7 w-7 rounded-full border border-slate-200 bg-white text-[16px] leading-none text-slate-700 disabled:opacity-30">+</button>
      <span className="min-w-0 text-[11px] leading-tight text-slate-500" data-testid="loans-cap">
        {ltvCap <= THIRD_LOAN_LTV ? t(`最多贷 ${THIRD_LOAN_LTV}%`, `Max ${THIRD_LOAN_LTV}%`) : null}
      </span>
    </div>
  )
}

export function FirstBuyerNote({ compact = false } = {}) {
  const { t } = useLang()
  const items = [
    { icon: IconKey, text: t('入场要准备的钱 = 首付 + 律师费和印花税（估算）+ 装修预留。', 'Cash to enter = down payment + estimated legal fees and stamp duty + a renovation allowance.') },
    { icon: IconCalendar, text: t('月供是按你选定的贷款成数、利率和年期估算的，不是银行批复的数字。', 'The instalment is an estimate from the loan percentage, rate and tenure you chose — not a bank offer.') },
    { icon: IconHouse, text: t('自住每月支出 = 月供 + 管理费 + 门牌税 + 地税和保险。月供里有一部分是还本金，等于存进房子里的钱。', 'Monthly cost of owning = instalment + maintenance + assessment + quit rent and insurance. Part of the instalment repays principal, which is money kept in the home.') },
  ]
  return (
    <details className={compact ? 'relative' : 'rounded-2xl bg-white ring-1 ring-slate-200/80 px-4 py-3'} data-testid="first-buyer-note">
      <summary className={`cursor-pointer list-none flex items-center ${compact ? 'justify-center h-8 w-8 rounded-full ring-1 ring-slate-200 bg-white text-slate-500 hover:text-slate-800' : 'justify-between gap-3 text-[13px] font-medium text-slate-800'}`} aria-label={t('说明', 'About')}>
        {compact ? <IconInfo size={16} /> : (
          <>
            <span>{t('第一次买房，先看这三件事', 'Buying for the first time? Start with these three things')}</span>
            <span className="text-slate-400 text-[12px] font-medium">{t('说明', 'About')}</span>
          </>
        )}
      </summary>
      <div className={compact
        ? 'absolute right-0 top-9 z-20 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-[0_8px_24px_rgba(15,23,42,.12)] space-y-2'
        : 'mt-2 space-y-1.5 text-[13px] text-slate-600 leading-snug border-t border-slate-100 pt-2'}>
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[13px] text-slate-600 leading-snug">
            <item.icon size={15} className="shrink-0 mt-0.5 text-slate-500" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </details>
  )
}
