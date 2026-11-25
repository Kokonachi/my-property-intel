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
export function CompareTiles({ inst, currentRent, rentMo, cash, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null || model.letVsInst == null || model.rentMo == null) return null

  const leftover = model.letVsInst
  const tone = toneOf(leftover)
  const pal = TONE[tone] || TONE.flat
  const over = leftover < 0
  const fill = model.rentMo > 0
    ? Math.max(0, Math.min(100, (model.inst / model.rentMo) * 100))
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
      <div
        className={`font-semibold tabular-nums tracking-tight leading-none ${compact ? 'text-[20px]' : 'text-[26px]'}`}
        style={{ color: pal.text }}
        data-testid="tile-rental"
      >
        {hero}
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
        <span className="min-w-0 truncate">{t('月供', 'Monthly')} {fmtRM(model.inst)}</span>
        <span className="min-w-0 truncate text-right">{t('租金', 'Rent')} {fmtRM(model.rentMo)}</span>
      </div>
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
