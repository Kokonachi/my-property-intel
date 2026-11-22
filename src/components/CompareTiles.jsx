import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { compareBarModel, deltaLabel } from '../lib/compareBars.js'
import {
  IconKey, IconWallet, IconCalendar, IconArrowUp, IconArrowDown,
  IconCoins, IconFile, IconStamp, IconBrush, HouseFill,
} from './icons.jsx'

const TONE = {
  good: { bg: '#eef7f2', text: '#176b45' },
  bad: { bg: '#f8eeee', text: '#9f1239' },
  flat: { bg: '#f1f5f9', text: '#334155' },
}

function toneOf(n, invert = false) {
  if (n == null || n === 0) return 'flat'
  const good = invert ? n < 0 : n > 0
  return good ? 'good' : 'bad'
}

function Metric({ icon, tone = 'flat', children, testId, className = '' }) {
  const pal = TONE[tone] || TONE.flat
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${className}`}
      data-testid={testId}
      style={{ color: pal.text }}
    >
      <span
        className="shrink-0 grid place-items-center rounded-lg"
        style={{ background: pal.bg, width: 28, height: 28 }}
      >
        {icon}
      </span>
      <span className="min-w-0 font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap text-[15px] sm:text-[16px]">
        {children}
      </span>
    </div>
  )
}

/** Icon + big delta. No sentence captions. */
export function CompareTiles({ inst, currentRent, rentMo, cash, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null) return null

  const hasNow = model.instVsNow != null
  const hasLet = model.letVsInst != null
  if (!hasNow && !hasLet) return null

  const coverage = model.rentMo && model.inst ? model.rentMo / model.inst : null
  const rentTone = toneOf(model.instVsNow, true)
  const letTone = toneOf(model.letVsInst, false)
  const rentArrow = model.instVsNow > 0 ? 'up' : model.instVsNow < 0 ? 'down' : null
  const houseSize = compact ? 42 : 56

  const rentAria = hasNow
    ? (model.instVsNow > 0
      ? t(`月供比现在的租金多 ${fmtRM(model.instVsNow)}`, `Instalment ${fmtRM(model.instVsNow)} more than your current rent`)
      : model.instVsNow < 0
        ? t(`月供比现在的租金少 ${fmtRM(Math.abs(model.instVsNow))}`, `Instalment ${fmtRM(Math.abs(model.instVsNow))} less than your current rent`)
        : t('月供和现在的租金差不多', 'Instalment is about the same as your current rent'))
    : ''
  const letAria = hasLet
    ? (model.letVsInst >= 0
      ? t(`出租后每月大约剩 ${fmtRM(model.letVsInst)}`, `If rented out, about ${fmtRM(model.letVsInst)} left each month`)
      : t(`出租后每月还要补 ${fmtRM(Math.abs(model.letVsInst))}`, `If rented out, you'd still top up ${fmtRM(Math.abs(model.letVsInst))} each month`))
    : ''

  const letNumber = deltaLabel(model.letVsInst) === '0' ? 'RM0' : deltaLabel(model.letVsInst)
  const nowNumber = deltaLabel(model.instVsNow) === '0' ? 'RM0' : deltaLabel(model.instVsNow)

  return (
    <div
      className={`flex items-center ${hasNow && hasLet ? 'justify-between gap-3' : 'gap-3'} ${className}`}
      data-testid="compare-tiles"
      role="img"
      aria-label={[rentAria, letAria].filter(Boolean).join('. ')}
    >
      {hasNow && (
        <Metric
          testId="tile-rent"
          tone={rentTone}
          icon={<IconWallet size={15} />}
        >
          <span className="inline-flex items-center gap-0.5">
            {rentArrow === 'up' ? <IconArrowUp size={13} /> : rentArrow === 'down' ? <IconArrowDown size={13} /> : null}
            {nowNumber}
          </span>
        </Metric>
      )}
      {hasLet && (
        <div className="flex items-center gap-1.5 min-w-0" data-testid="tile-rental" style={{ color: (TONE[letTone] || TONE.flat).text }}>
          <HouseFill coverage={coverage} size={houseSize} data-testid="house-fill" />
          <span className={`font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap ${compact ? 'text-[15px] sm:text-[16px]' : 'text-[20px] sm:text-[24px]'}`}>
            {letNumber}
          </span>
        </div>
      )}
    </div>
  )
}

export function EntryFacts({ entry, inst, compact = false, className = '' }) {
  if (!entry?.total && inst == null) return null
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {entry?.total != null && (
        <Metric testId="metric-entry" icon={<IconKey size={15} />}>
          {fmtRM(entry.total)}
        </Metric>
      )}
      {inst != null && (
        <Metric testId="metric-inst" icon={<IconCalendar size={15} />}>
          {fmtRM(inst)}
        </Metric>
      )}
    </div>
  )
}

const ENTRY_LAYERS = [
  { id: 'down', icon: IconKey, zh: '首付', en: 'Down' },
  { id: 'legal', icon: IconFile, zh: '律师', en: 'Legal', key: 'legal' },
  { id: 'stamp', icon: IconStamp, zh: '印花', en: 'Stamp', key: 'stamp' },
  { id: 'reno', icon: IconBrush, zh: '装修', en: 'Reno', key: 'renovation' },
]

const LAYER_FILL = ['#0f172a', '#334155', '#64748b', '#94a3b8']

/** Stacked blocks with the amount on each layer. One short word + icon. */
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
          const IconCmp = p.icon
          const width = Math.max(28, (p.value / max) * 100)
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className="shrink-0 grid place-items-center rounded-md bg-slate-200/80 text-slate-700" style={{ width: 22, height: 22 }}>
                <IconCmp size={13} />
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
