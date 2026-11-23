import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { compareBarModel, deltaLabel } from '../lib/compareBars.js'
import {
  IconWallet, IconCalendar, IconKey, IconCoins, HouseFill,
} from './icons.jsx'

const TONE = {
  good: { bg: '#eef7f2', text: '#176b45' },
  bad: { bg: '#f8eeee', text: '#9f1239' },
  flat: { bg: '#f1f5f9', text: '#334155' },
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

/** Wallet (vs current rent) on the left, house (rent vs instalment) on the right.
 *  Sign rule: money out is − and red, money in is + and green. */
export function CompareTiles({ inst, currentRent, rentMo, cash, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null) return null

  const hasNow = model.instVsNow != null
  const hasLet = model.letVsInst != null
  if (!hasNow && !hasLet) return null

  const coverage = model.rentMo && model.inst ? model.rentMo / model.inst : null
  // Wallet: paying more than current rent is money out → negate instVsNow for display.
  const walletFlow = hasNow ? -model.instVsNow : null
  const rentTone = toneOf(walletFlow)
  const letTone = toneOf(model.letVsInst)
  const houseSurplus = model.letVsInst != null && model.letVsInst >= 0
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
  const nowNumber = deltaLabel(walletFlow) === '0' ? 'RM0' : deltaLabel(walletFlow)

  return (
    <div
      className={`flex items-center ${hasNow && hasLet ? 'justify-between gap-3' : 'gap-3'} ${className}`}
      data-testid="compare-tiles"
      role="img"
      aria-label={[rentAria, letAria].filter(Boolean).join('. ')}
    >
      {hasNow && (
        <Metric testId="tile-rent" tone={rentTone} label={t('多付', 'Extra')} icon={<IconWallet size={15} />}>
          {nowNumber}
        </Metric>
      )}
      {hasLet && (
        <div className="flex items-center gap-1.5 min-w-0" data-testid="tile-rental" style={{ color: (TONE[letTone] || TONE.flat).text }}>
          <span className="shrink-0 flex flex-col items-center gap-0.5">
            <HouseFill coverage={coverage} surplus={houseSurplus} size={houseSize} />
            <span className="text-[11px] leading-none font-medium text-slate-500 whitespace-nowrap">{t('租金', 'Rent')}</span>
          </span>
          <span className={`font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap ${compact ? 'text-[15px] sm:text-[16px]' : 'text-[20px] sm:text-[24px]'}`}>
            {letNumber}
          </span>
        </div>
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
