import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { compareBarModel, deltaLabel } from '../lib/compareBars.js'
import {
  IconCalendar, IconKey, IconCoins,
} from './icons.jsx'

const TONE = {
  good: { bg: '#eef7f2', text: '#176b45', bar: '#176b45' },
  bad: { bg: '#f8eeee', text: '#9f1239', bar: '#9f1239' },
  flat: { bg: '#f1f5f9', text: '#334155', bar: '#64748b' },
}

function toneOf(n) {
  if (n == null || n === 0) return 'flat'
  return n > 0 ? 'good' : 'bad'
}

function Metric({ icon, tone = 'flat', label, testId, className = '', children }) {
  const pal = TONE[tone] || TONE.flat
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${className}`}
      data-testid={testId}
      style={{ color: pal.text }}
    >
      <span className="shrink-0 flex flex-col items-center gap-0.5">
        <span
          className="grid place-items-center rounded-lg"
          style={{ background: pal.bg, width: 28, height: 28 }}
        >
          {icon}
        </span>
        {label ? <span className="text-[11px] leading-none font-medium text-slate-500 whitespace-nowrap">{label}</span> : null}
      </span>
      <span className="min-w-0 font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap text-[15px] sm:text-[16px]">
        {children}
      </span>
    </div>
  )
}

/** Leftover / shortfall of rent vs instalment, in the Rocket Money “left to spend” pattern:
 *  a large signed hero, then a remaining bar (instalment as spent, rent as budget).
 *  Sign rule: money in is + and green, money out is − and red. */
export function CompareTiles({ inst, currentRent, rentMo, cash, v = null, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null || model.letVsInst == null || model.rentMo == null) return null

  const leftover = model.letVsInst
  const tone = toneOf(leftover)
  const pal = TONE[tone] || TONE.flat
  const over = leftover < 0
  const holdMo = v?.holdMo > 0 ? v.holdMo : 0
  const outMo = model.inst + holdMo
  const fill = model.rentMo > 0
    ? Math.max(0, Math.min(100, (outMo / model.rentMo) * 100))
    : 0
  const barPct = over ? 100 : fill
  const hero = deltaLabel(leftover) === '0' ? 'RM0' : deltaLabel(leftover)
  const aria = leftover >= 0
    ? t(`出租后每月大约剩 ${fmtRM(leftover)}`, `If rented out, about ${fmtRM(leftover)} left each month`)
    : t(`出租后每月还要补 ${fmtRM(Math.abs(leftover))}`, `If rented out, you'd still top up ${fmtRM(Math.abs(leftover))} each month`)

  return (
    <div
      className={`rounded-xl bg-slate-50 px-3 ${compact ? 'py-2' : 'py-2.5'} ${className}`}
      data-testid="compare-tiles"
      role="img"
      aria-label={aria}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div
          className={`font-semibold tabular-nums tracking-tight leading-none ${compact ? 'text-[20px]' : 'text-[26px]'}`}
          style={{ color: pal.text }}
          data-testid="tile-rental"
        >
          {hero}<span className={`font-medium ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{t('/月', '/mo')}</span>
        </div>
        <span className={`shrink-0 font-medium text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`} data-testid="tile-rental-label">
          {holdMo > 0 ? t('出租后净现金流', 'Net cash flow if let') : t('租金 − 月供', 'Rent − instalment')}
        </span>
      </div>
      <div
        className={`rounded-full bg-slate-200/90 overflow-hidden ${compact ? 'mt-1.5 h-1.5' : 'mt-2 h-2'}`}
        data-testid="rent-bar"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${barPct}%`, background: pal.bar }}
        />
      </div>
      <div className={`flex items-baseline justify-between gap-2 text-slate-500 tabular-nums ${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-[11px]'}`}>
        <span className="min-w-0 truncate">
          {holdMo > 0
            ? (compact
              ? t(`月供+持有 ${fmtRM(outMo)}`, `Inst. + costs ${fmtRM(outMo)}`)
              : t(`月供 ${fmtRM(model.inst)} + 持有 ${fmtRM(holdMo)}`, `Inst. ${fmtRM(model.inst)} + costs ${fmtRM(holdMo)}`))
            : `${t('月供', 'Monthly')} ${fmtRM(model.inst)}`}
        </span>
        <span className="min-w-0 truncate text-right">{t('租金', 'Rent')} {fmtRM(model.rentMo)}</span>
      </div>
      {!compact && v?.hold && <HoldBreakdown v={v} t={t} />}
    </div>
  )
}

/** One line of holding costs, the principal share of the instalment, and a negative-leverage warning. */
export function HoldBreakdown({ v, t, className = '' }) {
  if (!v?.hold) return null
  const h = v.hold
  const r = n => fmtRM(Math.round(n))
  return (
    <div className={`mt-2 border-t border-slate-200/80 pt-2 space-y-1 text-[11px] leading-snug text-slate-500 tabular-nums ${className}`} data-testid="hold-breakdown">
      <div>
        {t(
          `持有成本 ${r(h.total)}/月：管理费 ${r(h.maint)} · 空置（每年 1 个月）${r(h.vacancy)} · 门牌税 ${r(h.assessment)} · 地税和保险 ${r(h.fixed)}`,
          `Holding costs ${r(h.total)}/mo: maintenance ${r(h.maint)} · vacancy (1 month a year) ${r(h.vacancy)} · assessment ${r(h.assessment)} · quit rent and insurance ${r(h.fixed)}`,
        )}
      </div>
      {v.principalMo > 0 && (
        <div>
          {t(
            `月供里约 ${r(v.principalMo)} 是还本金（变成你的房产净值，不是花掉的钱）。`,
            `About ${r(v.principalMo)} of the instalment repays principal (it becomes your equity, not an expense).`,
          )}
        </div>
      )}
      {v.negativeLeverage && (
        <div className="font-medium text-[#9f1239]" data-testid="negative-leverage">
          {t(
            `净回报 ${v.netYield.toFixed(2)}% 低于贷款利率：借得越多，每月倒贴越多（不计升值）。`,
            `Net yield ${v.netYield.toFixed(2)}% is below the loan rate: the more you borrow, the more you top up each month (before any capital gain).`,
          )}
        </div>
      )}
    </div>
  )
}

/** Owner-occupier view: monthly cost of owning (instalment + maintenance + assessment + quit rent/insurance)
 *  against the rent the visitor pays now. Red when owning costs more each month. */
export function ownerMonthly(v) {
  if (!v?.hold) return null
  const fees = v.hold.maint + v.hold.assessment + v.hold.fixed
  return { total: v.inst + fees, fees, inst: v.inst, principal: v.principalMo || 0, interest: v.interestMo || 0, spent: (v.interestMo || 0) + fees }
}

export function BuyVsRent({ v, currentRent, compact = false, className = '' }) {
  const { t } = useLang()
  const own = ownerMonthly(v)
  if (!own) return null
  const now = Number(currentRent) > 0 ? Number(currentRent) : null
  const r = n => fmtRM(Math.round(n))
  if (now == null) {
    return (
      <div className={`rounded-xl bg-slate-50 px-3 ${compact ? 'py-2' : 'py-2.5'} ${className}`} data-testid="buy-vs-rent">
        <div className="flex items-baseline justify-between gap-2">
          <div className={`font-semibold tabular-nums tracking-tight leading-none text-slate-900 ${compact ? 'text-[20px]' : 'text-[26px]'}`}>
            {r(own.total)}<span className={`font-medium ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{t('/月', '/mo')}</span>
          </div>
          <span className={`shrink-0 font-medium text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{t('自住每月支出', 'Monthly cost to own')}</span>
        </div>
        <div className={`text-slate-500 ${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-[11px]'}`}>
          {t(`月供 ${r(own.inst)} + 管理费等 ${r(own.fees)} · 填你现在的租金就能对比`, `Instalment ${r(own.inst)} + fees ${r(own.fees)} · add your rent to compare`)}
        </div>
        {!compact && <OwnerNotes own={own} t={t} />}
      </div>
    )
  }
  const diff = own.total - now
  const more = diff > 0
  const pal = TONE[Math.abs(diff) < 20 ? 'flat' : more ? 'bad' : 'good']
  const max = Math.max(own.total, now, 1)
  const amt = `RM${Math.round(Math.abs(diff)).toLocaleString('en-MY')}`
  return (
    <div className={`rounded-xl bg-slate-50 px-3 ${compact ? 'py-2' : 'py-2.5'} ${className}`} data-testid="buy-vs-rent">
      <div className="flex items-baseline justify-between gap-2">
        <div className={`font-semibold tabular-nums tracking-tight leading-none ${compact ? 'text-[20px]' : 'text-[26px]'}`} style={{ color: pal.text }} data-testid="buy-vs-rent-diff">
          {Math.abs(diff) < 20 ? t('差不多', 'About even') : `${more ? '+' : '−'}${amt}`}{Math.abs(diff) < 20 ? null : <span className={`font-medium ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{t('/月', '/mo')}</span>}
        </div>
        <span className={`shrink-0 font-medium text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {more ? t('买了比租房每月多付', 'Owning costs more per month') : t('买了比租房每月少付', 'Owning costs less per month')}
        </span>
      </div>
      <div className={`space-y-1 ${compact ? 'mt-1.5' : 'mt-2'}`}>
        <MiniBar label={t('自住每月支出', 'Cost to own')} value={own.total} max={max} color={pal.bar} compact={compact} />
        <MiniBar label={t('你现在的租金', 'Your rent now')} value={now} max={max} color="#64748b" compact={compact} />
      </div>
      {!compact && <OwnerNotes own={own} t={t} />}
    </div>
  )
}

function MiniBar({ label, value, max, color, compact }) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100))
  return (
    <div className={`flex items-center gap-2 tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      <span className="shrink-0 w-[5.5rem] truncate text-slate-500">{label}</span>
      <div className="flex-1 min-w-0 h-1.5 rounded-full bg-slate-200/90 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="shrink-0 font-semibold text-slate-700">{fmtRM(Math.round(value))}</span>
    </div>
  )
}

function OwnerNotes({ own, t }) {
  const r = n => fmtRM(Math.round(n))
  return (
    <div className="mt-2 border-t border-slate-200/80 pt-2 space-y-1 text-[11px] leading-snug text-slate-500 tabular-nums" data-testid="owner-notes">
      <div>{t(`月供 ${r(own.inst)} + 管理费、门牌税、地税和保险 ${r(own.fees)}。`, `Instalment ${r(own.inst)} + maintenance, assessment, quit rent and insurance ${r(own.fees)}.`)}</div>
      {own.principal > 0 && (
        <div>{t(
          `其中约 ${r(own.principal)} 是还本金，等于存进房子里；真正花掉的是利息和杂费，约 ${r(own.spent)}/月。首付本来可以赚的利息没有算进去。`,
          `About ${r(own.principal)} repays principal, which stays in the home; what is actually spent is interest and fees, about ${r(own.spent)}/mo. Returns the down payment could have earned elsewhere are not counted.`,
        )}</div>
      )}
    </div>
  )
}

export function EntryFacts({ entry, inst, compact = false, className = '' }) {
  const { t } = useLang()
  if (!entry?.total && inst == null) return null
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {entry?.total != null && (
        <Metric testId="metric-entry" icon={<IconKey size={15} />} label={t('入场', 'Entry')}>
          {fmtRM(entry.total)}
        </Metric>
      )}
      {inst != null && (
        <Metric testId="metric-inst" icon={<IconCalendar size={15} />} label={t('月供', 'Monthly')}>
          {fmtRM(inst)}{t('/月', '/mo')}
        </Metric>
      )}
    </div>
  )
}

const ENTRY_LAYERS = [
  { id: 'down', zh: '首付', en: 'Down' },
  { id: 'legal', zh: '律师', en: 'Legal' },
  { id: 'stamp', zh: '印花', en: 'Stamp' },
  { id: 'reno', zh: '装修', en: 'Reno' },
]

const LAYER_FILL = ['#0f172a', '#1e293b', '#334155', '#475569']

/** Stacked blocks with a short label and the amount on each layer. The key icon stays on the total only. */
export function EntryStack({ entry, t, className = '' }) {
  if (!entry?.total) return null
  const parts = [
    { ...ENTRY_LAYERS[0], value: entry.down },
    { ...ENTRY_LAYERS[1], value: entry.legal },
    { ...ENTRY_LAYERS[2], value: entry.stamp },
    { ...ENTRY_LAYERS[3], value: entry.renovation },
  ].filter(p => p.value > 0)
  if (!parts.length) return null
  const max = Math.max(...parts.map(p => p.value))
  const aria = parts.map(p => `${t(p.zh, p.en)} ${fmtRM(p.value)}`).join(', ')
  return (
    <div className={className} data-testid="entry-stack" role="img" aria-label={aria}>
      <div className="space-y-1.5">
        {parts.map((p, i) => {
          const width = Math.max(28, (p.value / max) * 100)
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className="shrink-0 w-10 text-[11px] font-medium text-slate-500 text-right whitespace-nowrap">
                {t(p.zh, p.en)}
              </span>
              <div className="flex-1 min-w-0 h-7 rounded-md bg-slate-200/60 overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center justify-end px-2 text-[11px] font-semibold tabular-nums text-white whitespace-nowrap"
                  style={{ width: `${width}%`, background: LAYER_FILL[i], minWidth: '4.8rem' }}
                >
                  {fmtRM(p.value)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function YieldIcons({ net, gross, psf, comps, t, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] tabular-nums text-slate-600 ${className}`}>
      {net != null ? <span className="inline-flex items-center gap-1"><IconCoins size={13} />{net.toFixed(2)}%</span> : null}
      {gross != null ? <span>{gross.toFixed(2)}%</span> : null}
      {psf ? <span>RM{Math.round(psf).toLocaleString('en-MY')}</span> : null}
      {comps ? <span>{comps}</span> : null}
    </div>
  )
}
