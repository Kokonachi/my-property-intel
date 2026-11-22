import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { compareBarModel, deltaLabel } from '../lib/compareBars.js'

const TONE = {
  good: { bg: '#eef7f2', text: '#176b45' },
  bad: { bg: '#f8eeee', text: '#9f1239' },
  flat: { bg: '#f1f5f9', text: '#334155' },
}

function Arrow({ dir, color, size }) {
  if (!dir) return null
  const up = dir === 'up'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {up ? (
        <path d="M8 3.2v9.6M8 3.2L3.8 7.4M8 3.2l4.2 4.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 12.8V3.2M8 12.8L3.8 8.6M8 12.8l4.2-4.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function Tile({ label, delta, unit, caption, tone, arrow, compact, testId }) {
  const pal = TONE[tone] || TONE.flat
  const signed = deltaLabel(delta)
  const number = signed === '0' || signed == null ? 'RM0' : signed
  return (
    <div
      className={`rounded-xl min-w-0 ${compact ? 'px-2.5 py-2' : 'px-3.5 py-3'}`}
      style={{ background: pal.bg }}
      data-testid={testId}
    >
      <div className={`font-medium ${compact ? 'text-[10px] leading-tight' : 'text-[12px]'} text-slate-500`}>
        {label}
      </div>
      <div
        className={`mt-0.5 flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums tracking-tight leading-none ${
          compact ? 'text-[17px] sm:text-[18px]' : 'text-[20px] sm:text-[26px]'
        }`}
        style={{ color: pal.text }}
      >
        <Arrow dir={arrow} color={pal.text} size={compact ? 13 : 16} />
        <span className="flex items-baseline gap-0.5">
          <span>{number}</span>
          <span className={`font-medium tracking-normal ${compact ? 'text-[10px]' : 'text-[13px]'}`}>{unit}</span>
        </span>
      </div>
      <div className={`mt-1 leading-tight ${compact ? 'text-[10px]' : 'text-[12px]'}`} style={{ color: pal.text }}>
        {caption}
      </div>
    </div>
  )
}

export function CompareTiles({ inst, currentRent, rentMo, cash, compact = false, className = '' }) {
  const { t } = useLang()
  const model = compareBarModel({ inst, currentRent, rentMo, cash })
  if (!model || model.inst == null) return null

  const hasNow = model.instVsNow != null
  const hasLet = model.letVsInst != null
  if (!hasNow && !hasLet) return null

  const rentTone = model.instVsNow > 0 ? 'bad' : model.instVsNow < 0 ? 'good' : 'flat'
  const rentArrow = model.instVsNow > 0 ? 'up' : model.instVsNow < 0 ? 'down' : null
  const rentCaption = model.instVsNow > 0
    ? t('比房租多', 'more than rent')
    : model.instVsNow < 0
      ? t('比房租少', 'less than rent')
      : t('和房租一样', 'same as rent')

  const letTone = model.letVsInst > 0 ? 'good' : model.letVsInst < 0 ? 'bad' : 'flat'
  const letArrow = model.letVsInst > 0 ? 'up' : model.letVsInst < 0 ? 'down' : null
  const letCaption = model.letVsInst > 0
    ? t('每月有余', 'left each month')
    : model.letVsInst < 0
      ? t('每月要补', "you'd top up")
      : t('刚好覆盖', 'covers the loan')

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

  return (
    <div
      className={`${hasNow && hasLet ? 'grid grid-cols-2 gap-2' : ''} ${className}`}
      data-testid="compare-tiles"
      role="img"
      aria-label={[rentAria, letAria].filter(Boolean).join('. ')}
    >
      {hasNow && (
        <Tile
          label={t('比现在房租', 'vs your rent')}
          delta={model.instVsNow}
          unit={t('/月', '/mo')}
          caption={rentCaption}
          tone={rentTone}
          arrow={rentArrow}
          compact={compact}
          testId="tile-rent"
        />
      )}
      {hasLet && (
        <Tile
          label={t('出租后', 'if rented out')}
          delta={model.letVsInst}
          unit={t('/月', '/mo')}
          caption={letCaption}
          tone={letTone}
          arrow={letArrow}
          compact={compact}
          testId="tile-rental"
        />
      )}
    </div>
  )
}
