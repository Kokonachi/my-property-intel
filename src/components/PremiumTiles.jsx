import { useId } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { useSkin } from '../lib/cardSkin.jsx'
import { compareBarModel, deltaLabel, shortDelta } from '../lib/compareBars.js'

function coveragePct(rentMo, inst) {
  if (!(inst > 0) || rentMo == null) return null
  return Math.round((Number(rentMo) / Number(inst)) * 100)
}

function moneyParts(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  return Math.round(Number(n)).toLocaleString('en-MY')
}

/** Semicircle gauge with a big % in the bowl. Accent only when rent covers the instalment. */
export function SemiGauge({ pct, covered, className = '' }) {
  const skin = useSkin()
  const hid = useId().replace(/:/g, '')
  const r = 52
  const cx = 64
  const cy = 62
  const C = Math.PI * r
  const shown = pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const filled = (shown / 100) * C
  const stroke = 11
  const fill = covered ? skin.accent : skin.fillShort
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  return (
    <svg viewBox="0 0 128 78" className={`block w-full ${className}`} aria-hidden="true">
      <defs>
        <pattern id={`hatch-${hid}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={skin.track} />
          <line x1="0" y1="0" x2="0" y2="6" stroke={skin.hatch} strokeWidth="2.2" />
        </pattern>
      </defs>
      <path d={d} fill="none" stroke={`url(#hatch-${hid})`} strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={fill}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C}`}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill={covered ? skin.accent : skin.ink}
        style={{ fontSize: 22, fontWeight: 650, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}
      >
        {pct == null ? '—' : `${Math.round(pct)}%`}
      </text>
    </svg>
  )
}

function Tile({ children, className = '', testId }) {
  const skin = useSkin()
  return (
    <div
      data-testid={testId}
      className={`min-w-0 rounded-[20px] px-2.5 pt-2 pb-2.5 flex flex-col ${className}`}
      style={{ background: skin.tile }}
    >
      {children}
    </div>
  )
}

function TinyLabel({ children }) {
  return (
    <div className="text-[11px] font-medium leading-none mb-1" style={{ color: 'var(--muted)' }}>
      {children}
    </div>
  )
}

/** Two dashboard tiles: coverage gauge + instalment (or net) hero. */
export function PremiumPair({ inst, currentRent, rentMo, cash, className = '' }) {
  const { t } = useLang()
  const skin = useSkin()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null) return null
  const pct = coveragePct(model.rentMo, model.inst)
  const covered = model.letVsInst != null && model.letVsInst >= 0
  const walletFlow = model.instVsNow != null ? -model.instVsNow : null
  const cashLabel = model.letVsInst == null ? null : (model.letVsInst === 0 ? 'RM0' : deltaLabel(model.letVsInst))
  const instAria = [
    pct != null ? t(`租金覆盖月供 ${pct}%`, `Rent covers ${pct}% of the instalment`) : '',
    model.letVsInst != null
      ? (covered
        ? t(`出租后每月大约剩 ${Math.abs(model.letVsInst)}`, `If rented out, about ${Math.abs(model.letVsInst)} left each month`)
        : t(`出租后每月还要补 ${Math.abs(model.letVsInst)}`, `If rented out, you'd still top up ${Math.abs(model.letVsInst)} each month`))
      : '',
  ].filter(Boolean).join('. ')

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`} data-testid="premium-pair" role="img" aria-label={instAria}>
      <Tile testId="tile-rental">
        <TinyLabel>{t('出租', 'Rent')}</TinyLabel>
        <SemiGauge pct={pct} covered={covered} />
        {cashLabel ? (
          <div
            className="mt-0.5 text-center text-[16px] font-semibold tabular-nums tracking-tight leading-none"
            style={{ color: covered ? skin.accent : skin.warn }}
          >
            {cashLabel}
          </div>
        ) : null}
      </Tile>
      <Tile testId="tile-inst">
        <TinyLabel>{t('月供', 'Monthly')}</TinyLabel>
        <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-baseline justify-center gap-0.5">
          <span className="text-[11px] font-medium" style={{ color: skin.muted }}>RM</span>
          <span className="text-[26px] sm:text-[28px] font-semibold tabular-nums tracking-tight leading-none" style={{ color: skin.ink }}>
            {moneyParts(model.inst)}
          </span>
          <span className="text-[11px] font-medium" style={{ color: skin.muted }}>{t('/月', '/mo')}</span>
        </div>
        {walletFlow != null && walletFlow !== 0 ? (
          <div
            className="mt-2 text-center text-[12px] font-semibold tabular-nums leading-none"
            style={{ color: walletFlow < 0 ? skin.warn : skin.muted }}
            data-testid="tile-rent"
          >
            {shortDelta(walletFlow)}
            <span className="ml-1 font-medium" style={{ color: skin.muted }}>{t('现在', 'Now')}</span>
          </div>
        ) : walletFlow === 0 ? (
          <div className="mt-2 text-center text-[12px] font-medium" style={{ color: skin.muted }} data-testid="tile-rent">0</div>
        ) : null}
        </div>
      </Tile>
    </div>
  )
}

export function EntryLine({ total, className = '' }) {
  const { t } = useLang()
  const skin = useSkin()
  if (total == null) return null
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${className}`}
      data-testid="metric-entry"
    >
      <span className="text-[11px] font-medium" style={{ color: skin.muted }}>{t('入场', 'Entry')}</span>
      <span className="text-[13px] font-semibold tabular-nums tracking-tight" style={{ color: skin.ink }}>
        RM {moneyParts(total)}
      </span>
    </div>
  )
}
