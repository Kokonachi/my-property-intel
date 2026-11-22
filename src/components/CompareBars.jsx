import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { compareBarModel, pctOf, deltaLabel } from '../lib/compareBars.js'

const PLUS = { text: '#065f46', fill: '#34d399' }
const MINUS = { text: '#9f1239', fill: '#fb7185' }

function Track({ max, inst, value, highlightFrom, highlightTo, highlightColor }) {
  const valuePct = pctOf(value, max)
  const instPct = inst != null ? pctOf(inst, max) : null
  const from = highlightFrom != null ? pctOf(highlightFrom, max) : null
  const to = highlightTo != null ? pctOf(highlightTo, max) : null
  const hi = from != null && to != null && to > from + 0.3
  return (
    <div className="relative h-1.5 sm:h-2 rounded-full bg-slate-100">
      <div className="absolute inset-y-0 left-0 rounded-full bg-slate-400" style={{ width: `${valuePct}%` }} />
      {hi && (
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${from}%`, width: `${to - from}%`, background: highlightColor }}
        />
      )}
      {instPct != null && Math.abs(instPct - valuePct) > 0.6 && (
        <div
          className="absolute top-[-3px] bottom-[-3px] w-px bg-slate-500/65"
          style={{ left: `${instPct}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

function Row({ label, value, max, inst, highlightFrom, highlightTo, highlightColor, delta, deltaTone, compact, testId }) {
  const signed = deltaLabel(delta)
  const showDelta = signed && signed !== '0' && signed !== '+RM0' && signed !== '−RM0' && deltaTone
  return (
    <div className="contents" data-testid={testId}>
      <div className={`text-slate-500 whitespace-nowrap self-center ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{label}</div>
      <div className="self-center min-w-0">
        <Track max={max} inst={inst} value={value} highlightFrom={highlightFrom} highlightTo={highlightTo} highlightColor={highlightColor} />
      </div>
      <div className={`tabular-nums text-right text-slate-700 whitespace-nowrap self-center ${compact ? 'text-[10px] leading-tight' : 'text-[12px]'}`}>
        {compact ? Math.round(value).toLocaleString('en-MY') : fmtRM(value)}
      </div>
      <div className={`tabular-nums text-right whitespace-nowrap self-center font-medium ${compact ? 'text-[10px] leading-tight' : 'text-[12px]'}`} style={{ color: showDelta ? deltaTone.text : 'transparent' }}>
        {showDelta ? signed : '\u00a0'}
      </div>
    </div>
  )
}

export function CompareBars({ inst, currentRent, rentMo, cash, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || !model.max) return null

  const instAria = model.inst != null
    ? (model.instVsNow == null
      ? t(`月供 ${fmtRM(model.inst)}`, `Instalment ${fmtRM(model.inst)}`)
      : model.instVsNow > 0
        ? t(`月供 ${fmtRM(model.inst)}，比现在的租金多 ${fmtRM(model.instVsNow)}`, `Instalment ${fmtRM(model.inst)}, ${fmtRM(model.instVsNow)} more than your current rent`)
        : model.instVsNow < 0
          ? t(`月供 ${fmtRM(model.inst)}，比现在的租金少 ${fmtRM(Math.abs(model.instVsNow))}`, `Instalment ${fmtRM(model.inst)}, ${fmtRM(Math.abs(model.instVsNow))} less than your current rent`)
          : t(`月供 ${fmtRM(model.inst)}，和现在的租金差不多`, `Instalment ${fmtRM(model.inst)}, about the same as your current rent`))
    : ''
  const nowAria = model.currentRent != null
    ? t(`现在的租金 ${fmtRM(model.currentRent)}`, `Your current rent ${fmtRM(model.currentRent)}`)
    : ''
  const letAria = model.rentMo != null
    ? (model.letVsInst == null
      ? t(`出租预估 ${fmtRM(model.rentMo)}`, `Estimated rental ${fmtRM(model.rentMo)}`)
      : model.letVsInst >= 0
        ? t(`出租预估 ${fmtRM(model.rentMo)}，覆盖月供后大约剩 ${fmtRM(model.letVsInst)}`, `Estimated rental ${fmtRM(model.rentMo)}, about ${fmtRM(model.letVsInst)} left after the instalment`)
        : t(`出租预估 ${fmtRM(model.rentMo)}，覆盖月供还差 ${fmtRM(Math.abs(model.letVsInst))}`, `Estimated rental ${fmtRM(model.rentMo)}, ${fmtRM(Math.abs(model.letVsInst))} short of the instalment`))
    : ''

  const instTone = model.instVsNow > 0 ? MINUS : model.instVsNow < 0 ? PLUS : null
  const letTone = model.letVsInst > 0 ? PLUS : model.letVsInst < 0 ? MINUS : null

  return (
    <div
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center ${compact ? 'gap-x-1.5 gap-y-1' : 'gap-x-2.5 gap-y-1.5'} ${className}`}
      data-testid="compare-bars"
      role="img"
      aria-label={[instAria, nowAria, letAria].filter(Boolean).join('. ')}
    >
      {model.inst != null && (
        <Row
          label={t('月供', 'Inst.')}
          value={model.inst}
          max={model.max}
          highlightFrom={model.instVsNow > 0 ? model.currentRent : null}
          highlightTo={model.instVsNow > 0 ? model.inst : null}
          highlightColor={MINUS.fill}
          delta={model.instVsNow}
          deltaTone={instTone}
          compact={compact}
          testId="bar-inst"
        />
      )}
      {model.currentRent != null && (
        <Row
          label={t('现租', 'Now')}
          value={model.currentRent}
          max={model.max}
          inst={model.inst}
          compact={compact}
          testId="bar-now"
        />
      )}
      {model.rentMo != null && (
        <Row
          label={t('出租', 'Rental')}
          value={model.rentMo}
          max={model.max}
          inst={model.inst}
          highlightFrom={model.letVsInst > 0 ? model.inst : model.letVsInst < 0 ? model.rentMo : null}
          highlightTo={model.letVsInst > 0 ? model.rentMo : model.letVsInst < 0 ? model.inst : null}
          highlightColor={letTone?.fill}
          delta={model.letVsInst}
          deltaTone={letTone}
          compact={compact}
          testId="bar-rental"
        />
      )}
    </div>
  )
}

const ENTRY_COLORS = ['#0f172a', '#475569', '#94a3b8', '#cbd5e1']

export function EntryStack({ entry, t, className = '' }) {
  if (!entry?.total) return null
  const parts = [
    { id: 'down', label: t('首付', 'Down'), value: entry.down },
    { id: 'legal', label: t('律师费', 'Legal'), value: entry.legal },
    { id: 'stamp', label: t('印花税', 'Stamp'), value: entry.stamp },
    { id: 'reno', label: t('装修', 'Reno'), value: entry.renovation },
  ].filter(p => p.value > 0)
  if (!parts.length) return null
  const aria = parts.map(p => `${p.label} ${fmtRM(p.value)}`).join(', ')
  return (
    <div className={className} data-testid="entry-stack">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200" role="img" aria-label={aria}>
        {parts.map((p, i) => (
          <div
            key={p.id}
            title={`${p.label} ${fmtRM(p.value)}`}
            style={{ width: `${pctOf(p.value, entry.total)}%`, background: ENTRY_COLORS[i % ENTRY_COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        {parts.map((p, i) => (
          <span key={p.id} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ENTRY_COLORS[i % ENTRY_COLORS.length] }} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
