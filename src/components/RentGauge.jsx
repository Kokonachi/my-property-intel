import { useId } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { compareBarModel, deltaLabel, shortDelta } from '../lib/compareBars.js'

const GOOD = '#176b45'
const GOOD_ARC = '#16a34a'
const BAD = '#9f1239'
const SHORT_ARC = '#64748b'
const TRACK = '#e2e8f0'

export function coveragePct(rentMo, inst) {
  if (!(inst > 0) || rentMo == null) return null
  return Math.round((Number(rentMo) / Number(inst)) * 100)
}

/** Compact semicircle, sized like the 28px icon chip so it sits in the same metric row. */
export function SemiGauge({ pct, covered, className = '' }) {
  const hid = useId().replace(/:/g, '')
  const r = 18
  const cx = 22
  const cy = 22
  const C = Math.PI * r
  const shown = pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const filled = (shown / 100) * C
  const stroke = 4.5
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  return (
    <svg viewBox="0 0 44 26" width="36" height="22" className={`block ${className}`} aria-hidden="true">
      <defs>
        <pattern id={`hatch-${hid}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill={TRACK} />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#cbd5e1" strokeWidth="1.6" />
        </pattern>
      </defs>
      <path d={d} fill="none" stroke={`url(#hatch-${hid})`} strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={covered ? GOOD_ARC : SHORT_ARC}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C}`}
      />
    </svg>
  )
}

/** Compact signed delta trailing the instalment (vs current rent). */
export function InstDelta({ inst, currentRent, className = '' }) {
  const model = compareBarModel({ inst, currentRent })
  if (!model || model.instVsNow == null) return null
  const flow = -model.instVsNow
  const color = flow < 0 ? BAD : flow > 0 ? GOOD : '#334155'
  return (
    <span
      data-testid="tile-rent"
      className={`ml-1.5 text-[13px] font-semibold tabular-nums tracking-tight ${className}`}
      style={{ color }}
    >
      {flow === 0 ? '0' : shortDelta(flow)}
    </span>
  )
}

/** One metric row: tiny gauge + 出租 label + the cash result. Matches 入场 / 月供. */
export function RentRow({ inst, rentMo, cash, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, rentMo, cash })
  if (!model || model.inst == null || model.letVsInst == null) return null
  const pct = coveragePct(model.rentMo, model.inst)
  const covered = model.letVsInst >= 0
  const num = model.letVsInst === 0 ? 'RM0' : deltaLabel(model.letVsInst)
  const aria = covered
    ? t(`租金覆盖月供 ${pct}%，出租后每月大约剩 ${Math.abs(model.letVsInst)}`, `Rent covers ${pct}% of the instalment; about ${Math.abs(model.letVsInst)} left each month`)
    : t(`租金覆盖月供 ${pct}%，出租后每月还要补 ${Math.abs(model.letVsInst)}`, `Rent covers ${pct}% of the instalment; you'd still top up ${Math.abs(model.letVsInst)} each month`)
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${className}`}
      data-testid="tile-rental"
      role="img"
      aria-label={aria}
      style={{ color: covered ? GOOD : BAD }}
    >
      <span className="shrink-0 flex flex-col items-center gap-0.5">
        <span className="grid place-items-center rounded-lg bg-slate-100" style={{ width: 36, height: 28 }}>
          <SemiGauge pct={pct} covered={covered} />
        </span>
        <span className="text-[11px] leading-none font-medium text-slate-500 whitespace-nowrap">{t('出租', 'Rent')}</span>
      </span>
      <span className="min-w-0 font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap text-[15px] sm:text-[16px]">
        {num}
        {pct != null ? (
          <span className="ml-1 text-[11px] font-medium text-slate-500">{pct}%</span>
        ) : null}
      </span>
    </div>
  )
}
