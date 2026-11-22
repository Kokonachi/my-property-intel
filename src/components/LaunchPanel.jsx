import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { launchScore, scoreBand, railChip, takeaway } from '../lib/launchScore.js'
import { LtvChips } from './LtvVerdict.jsx'

const cal = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4M16 4v4M4 10h16" /></svg>
)
const keyI = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="8" cy="14" r="3.5" /><path d="M11 14h9l-2 2 2 2" /></svg>
)
const unitI = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></svg>
)
const pinI = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.2" /></svg>
)

function Chip({ icon, children }) {
  if (!children) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/10 text-slate-800 text-[11px] font-semibold px-2 py-0.5">
      {icon}{children}
    </span>
  )
}

function vsLabel(delta, t) {
  if (delta == null) return null
  const pp = Math.abs(delta).toFixed(2)
  if (Math.abs(delta) < 0.05) return t('与区域持平', 'in line with the area')
  if (delta > 0) return t(`↑ 比区域高 ${pp} 个百分点`, `↑ ${pp} pp above the area`)
  return t(`↓ 比区域低 ${pp} 个百分点`, `↓ ${pp} pp below the area`)
}

export default function LaunchPanel({ p, onClose }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const s = launchScore(p, { rate: loan.rate, years: loan.years })
  const b = scoreBand(s.score)
  const tenure = /freehold/i.test(p.tenure) ? t('永久', 'Freehold') : t('99年', '99-yr')
  const rail = railChip(p, t)
  const line = takeaway(s, t)
  const vs = vsLabel(s.yieldDelta, t)

  return (
    <aside
      data-testid="launch-panel"
      className="launch-panel pointer-events-auto flex flex-col overflow-hidden"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div className="relative shrink-0">
        {p.render?.src ? (
          <img src={p.render.src} alt="" className="w-full h-28 sm:h-32 object-cover" />
        ) : (
          <div className="w-full h-28 sm:h-32 bg-slate-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button type="button" data-testid="panel-close" onClick={onClose} aria-label={t('关闭', 'Close')}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 text-slate-800 grid place-items-center font-bold shadow">
          ×
        </button>
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="min-w-0 text-white">
            <span className="inline-block rounded-full bg-[#fde047] text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5">{t('新盘', 'NEW')}</span>
            <div className="font-extrabold text-[16px] leading-tight mt-1 drop-shadow">{p.card_name || p.name}</div>
          </div>
          {s.score != null && (
            <div className="shrink-0 rounded-2xl px-2 py-1 text-center" style={{ background: b.color }}>
              <div className="text-white text-[22px] font-black tabular-nums leading-none">{s.score.toFixed(1)}</div>
              <div className="text-white/90 text-[9px] font-bold">{t(b.zh, b.en)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="font-extrabold text-slate-900 tabular-nums text-[20px] leading-none">
              {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
              {s.price ? <span className="ml-0.5 text-[11px] font-semibold text-slate-500">{t(' 起', ' from')}</span> : null}
            </div>
            {s.psf ? <div className="text-[12px] text-slate-500 mt-0.5">RM{Math.round(s.psf).toLocaleString('en-MY')} psf</div> : null}
          </div>
        </div>

        <LtvChips price={s.price} rentMo={s.yields?.rentMo} stacked />

        {s.yields && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px]">
            <div>
              <span className="text-slate-500">{t('毛回报', 'Gross')}</span>{' '}
              <span className="font-extrabold tabular-nums text-slate-900">{s.yields.gross.toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-slate-500">{t('净回报', 'Net')}</span>{' '}
              <span className="font-extrabold tabular-nums text-slate-900">{s.yields.net.toFixed(2)}%</span>
            </div>
            {vs && <div className={`font-semibold ${s.yieldDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{vs}</div>}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <Chip icon={cal}>{p.expected_completion_year}</Chip>
          <Chip icon={keyI}>{tenure}</Chip>
          <Chip icon={unitI}>{p.total_units?.toLocaleString('en-MY')}</Chip>
          <Chip icon={pinI}>{rail}</Chip>
        </div>

        {line && <p className="text-[12px] leading-snug text-slate-700">{line}</p>}

        <a href={`#/launch/${p.id}`} data-testid="panel-cta"
          className="block text-center rounded-2xl bg-slate-900 text-white font-bold text-[13px] py-2.5">
          {t('看户型与折扣', 'Unit types and discount')}
        </a>
      </div>
    </aside>
  )
}
