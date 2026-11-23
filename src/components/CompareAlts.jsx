import { useLang } from '../lib/i18n.jsx'
import { compareBarModel, deltaLabel, shortDelta } from '../lib/compareBars.js'
import { IconHouse } from './icons.jsx'

const GOOD = { fg: '#176b45', bg: '#eef7f2', fill: '#059669', track: '#d1fae5' }
const BAD = { fg: '#9f1239', bg: '#f8eeee', fill: '#e11d48', track: '#fecdd3' }
const FLAT = { fg: '#334155', bg: '#f1f5f9', fill: '#94a3b8', track: '#e2e8f0' }

function palOf(n) {
  if (n == null || n === 0) return FLAT
  return n > 0 ? GOOD : BAD
}

function coverageOf(rent, inst) {
  if (!(inst > 0) || rent == null) return 0
  return Math.max(0, Math.min(1, Number(rent) / Number(inst)))
}

function useCompareModel({ inst, currentRent, rentMo, cash }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null) return null
  const hasNow = model.instVsNow != null
  const hasLet = model.letVsInst != null
  if (!hasNow && !hasLet) return null
  const walletFlow = hasNow ? -model.instVsNow : null
  const nowAria = hasNow
    ? (model.instVsNow > 0
      ? t(`月供比现在的租金多 ${Math.abs(model.instVsNow)}`, `Instalment ${Math.abs(model.instVsNow)} more than your current rent`)
      : model.instVsNow < 0
        ? t(`月供比现在的租金少 ${Math.abs(model.instVsNow)}`, `Instalment ${Math.abs(model.instVsNow)} less than your current rent`)
        : t('月供和现在的租金差不多', 'Instalment is about the same as your current rent'))
    : ''
  const letAria = hasLet
    ? (model.letVsInst >= 0
      ? t(`出租后每月大约剩 ${Math.abs(model.letVsInst)}`, `If rented out, about ${Math.abs(model.letVsInst)} left each month`)
      : t(`出租后每月还要补 ${Math.abs(model.letVsInst)}`, `If rented out, you'd still top up ${Math.abs(model.letVsInst)} each month`))
    : ''
  return {
    model, hasNow, hasLet, walletFlow,
    nowCover: hasNow ? coverageOf(model.currentRent, model.inst) : null,
    letCover: hasLet ? coverageOf(model.rentMo, model.inst) : null,
    aria: [nowAria, letAria].filter(Boolean).join('. '),
    nowLabel: t('现在', 'Now'),
    letLabel: t('出租', 'Rent'),
  }
}

function CoverageTrack({ cover, pal, className = '' }) {
  const pct = Math.max(6, Math.round((cover ?? 0) * 100))
  return (
    <div className={`h-1.5 rounded-full overflow-hidden ${className}`} style={{ background: pal.track }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pal.fill }} />
    </div>
  )
}

/** A: two coverage meters in the info column. Colour of the track is the verdict; the number is the amount. */
export function CompareGauges({ inst, currentRent, rentMo, cash, className = '' }) {
  const ctx = useCompareModel({ inst, currentRent, rentMo, cash })
  if (!ctx) return null
  const rows = []
  if (ctx.hasNow) {
    rows.push({
      id: 'now',
      label: ctx.nowLabel,
      cover: ctx.nowCover,
      value: ctx.walletFlow,
      testId: 'tile-rent',
    })
  }
  if (ctx.hasLet) {
    rows.push({
      id: 'let',
      label: ctx.letLabel,
      cover: ctx.letCover,
      value: ctx.model.letVsInst,
      testId: 'tile-rental',
    })
  }
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} data-testid="compare-gauges" role="img" aria-label={ctx.aria}>
      {rows.map(row => {
        const pal = palOf(row.value)
        return (
          <div key={row.id} className="flex items-center gap-2 min-w-0" data-testid={row.testId}>
            <span className="w-8 shrink-0 text-[11px] font-medium text-slate-500 leading-none">{row.label}</span>
            <CoverageTrack cover={row.cover} pal={pal} className="flex-1 min-w-0" />
            <span className="shrink-0 text-[13px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: pal.fg }}>
              {row.value == 0 ? '0' : shortDelta(row.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** B: full-width split footer, flush with the card. Big number + coverage tick + 2-char label. */
export function CompareFooter({ inst, currentRent, rentMo, cash }) {
  const ctx = useCompareModel({ inst, currentRent, rentMo, cash })
  if (!ctx) return null
  const cells = []
  if (ctx.hasNow) {
    cells.push({
      id: 'now',
      label: ctx.nowLabel,
      cover: ctx.nowCover,
      value: ctx.walletFlow,
      display: ctx.walletFlow === 0 ? 'RM0' : deltaLabel(ctx.walletFlow),
      testId: 'tile-rent',
    })
  }
  if (ctx.hasLet) {
    cells.push({
      id: 'let',
      label: ctx.letLabel,
      cover: ctx.letCover,
      value: ctx.model.letVsInst,
      display: ctx.model.letVsInst === 0 ? 'RM0' : deltaLabel(ctx.model.letVsInst),
      testId: 'tile-rental',
    })
  }
  const split = cells.length === 2
  if (!split) {
    const cell = cells[0]
    const pal = palOf(cell.value)
    return (
      <div
        className="border-t border-slate-100 px-3 py-2 flex items-center gap-2"
        data-testid="compare-footer"
        role="img"
        aria-label={ctx.aria}
        style={{ background: pal.bg, color: pal.fg }}
      >
        <span className="shrink-0 text-[11px] font-medium text-slate-500">{cell.label}</span>
        <CoverageTrack cover={cell.cover} pal={pal} className="flex-1 min-w-0" />
        <span data-testid={cell.testId} className="shrink-0 text-[16px] font-semibold tabular-nums leading-none tracking-tight">{cell.display}</span>
      </div>
    )
  }
  return (
    <div
      className="grid grid-cols-2 border-t border-slate-100"
      data-testid="compare-footer"
      role="img"
      aria-label={ctx.aria}
    >
      {cells.map((cell, i) => {
        const pal = palOf(cell.value)
        return (
          <div
            key={cell.id}
            data-testid={cell.testId}
            className={`px-3 py-2.5 flex flex-col items-center justify-center gap-1 ${i === 0 ? 'border-r border-slate-100/80' : ''}`}
            style={{ background: pal.bg, color: pal.fg }}
          >
            <div className="text-[17px] font-semibold tabular-nums leading-none tracking-tight">{cell.display}</div>
            <CoverageTrack cover={cell.cover} pal={pal} className="w-[4.5rem]" />
            <div className="text-[11px] font-medium leading-none text-slate-500">{cell.label}</div>
          </div>
        )
      })}
    </div>
  )
}

/** C: photo caption for the rental result. Returns null if there is no rent-vs-instalment figure. */
export function PhotoVerdict({ inst, rentMo, cash, className = '' }) {
  const ctx = useCompareModel({ inst, rentMo, cash })
  if (!ctx?.hasLet) return null
  const pal = palOf(ctx.model.letVsInst)
  const display = ctx.model.letVsInst === 0 ? 'RM0' : deltaLabel(ctx.model.letVsInst)
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 py-[5px] ${className}`}
      data-testid="tile-rental"
      role="img"
      aria-label={ctx.aria}
      style={{ background: pal.fg, color: '#fff' }}
    >
      <IconHouse size={12} />
      <span className="text-[11px] font-semibold tabular-nums leading-none tracking-tight">{display}</span>
    </div>
  )
}

/** C: compact signed delta trailing the instalment (vs current rent). */
export function InstDelta({ inst, currentRent, className = '' }) {
  const ctx = useCompareModel({ inst, currentRent })
  if (!ctx?.hasNow || ctx.walletFlow == null) return null
  const pal = palOf(ctx.walletFlow)
  return (
    <span
      data-testid="tile-rent"
      className={`ml-1.5 text-[13px] font-semibold tabular-nums tracking-tight ${className}`}
      style={{ color: pal.fg }}
    >
      {ctx.walletFlow === 0 ? '0' : shortDelta(ctx.walletFlow)}
      <span className="ml-0.5 text-[10px] font-medium text-slate-500">{ctx.nowLabel}</span>
    </span>
  )
}
