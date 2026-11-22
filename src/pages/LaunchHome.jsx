import { LangToggle, useLang } from '../lib/i18n.jsx'
import { LAUNCHES } from '../data/launches.js'
import { fmtRM } from '../data/properties.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { rankedLaunches, scoreBand, headlineVerdict, downLabel } from '../lib/launchScore.js'
import { LoanPctControl, LoanVerdict } from '../components/LtvVerdict.jsx'

function ScoreMark({ score }) {
  const { t } = useLang()
  const b = scoreBand(score)
  return (
    <div className="shrink-0 text-right" data-testid="score-mark">
      <div className="text-[22px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: b.color }}>
        {score == null ? '—' : score.toFixed(1)}
      </div>
      <div className="text-[10px] font-medium text-slate-500 mt-0.5">{t(b.zh, b.en)}</div>
    </div>
  )
}

function RankCard({ p, s }) {
  const { t } = useLang()
  const y = s.yields
  const photo = p.render?.card || p.render?.pin || p.render?.src
  const verdict = headlineVerdict(s, t)
  const down = downLabel(s.down, t)
  return (
    <a href={`#/explore/${p.id}`} data-testid={`score-card-${p.id}`}
      className="group flex gap-3 rounded-2xl bg-white p-2.5 pr-3 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:ring-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,.08)] transition">
      <div className="relative shrink-0 w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-xl overflow-hidden bg-slate-100">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[11px] text-slate-400 px-2 text-center">{t('暂无效果图', 'No render yet')}</div>
        )}
        <span className="absolute top-1.5 left-1.5 rounded-md bg-white/95 text-slate-800 text-[9px] font-semibold tracking-wide px-1.5 py-0.5 shadow-sm">{t('新盘', 'NEW')}</span>
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-[15px] text-slate-900 leading-snug truncate">{p.card_name || p.name}</div>
            <div className="mt-0.5 text-[13px] tabular-nums text-slate-700">
              {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
              {s.price ? <span className="text-slate-400 font-normal">{t(' 起', ' from')}</span> : null}
              {y ? <span className="text-slate-400 font-normal"> · {y.gross.toFixed(2)}%</span> : null}
            </div>
          </div>
          <ScoreMark score={s.score} />
        </div>
        {verdict && (
          <LoanVerdict price={s.price} rentMo={y?.rentMo} className="mt-1.5" />
        )}
        {!verdict && down && <div className="mt-1 text-[11px] text-slate-500">{down}</div>}
      </div>
    </a>
  )
}

export default function LaunchHome() {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const rows = rankedLaunches(LAUNCHES, { rate: loan.rate, years: loan.years, ltv: loan.ltv })

  return (
    <div className="min-h-full bg-[#f6f7f8] flex flex-col" data-testid="launch-home">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="flex items-center gap-2 px-3 sm:px-5 h-12">
          <a href="#/" className="shrink-0 flex items-center gap-2" aria-label={t('马来西亚房地产智能平台', 'Malaysia Property Intelligence')}>
            <span className="h-7 w-7 rounded-full bg-slate-900 text-white grid place-items-center font-semibold text-[10px] tracking-tight">MY</span>
            <span className="text-[13px] font-semibold text-slate-900">{t('新楼盘', 'New launches')}</span>
          </a>
          <div className="flex-1 min-w-0" />
          <a href="#/map" data-testid="nav-map"
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 h-8 text-[12px] font-medium text-slate-700">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2.2" /><circle cx="16.5" cy="15" r="2.2" /><path d="M8 10.2v6.3c0 .7.6 1.2 1.2.9L16.5 13" /></svg>
            {t('回报地图', 'Yield map')}
          </a>
          <LangToggle />
        </div>
        <div className="px-3 sm:px-5 pb-2 max-w-xl mx-auto w-full">
          <LoanPctControl variant="header" className="rounded-xl bg-slate-50 border border-slate-200/80 px-2 py-1" />
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-5">
        <p className="text-[12.5px] text-slate-500 mb-2.5 px-0.5 leading-snug">
          {t('按租售比与当前贷款成数下的月供覆盖排序，高分在前', 'Ranked by rent-to-price and whether rent covers the instalment at your loan percentage')}
        </p>
        <div className="flex flex-col gap-2.5">
          {rows.map(({ p, s }) => <RankCard key={p.id} p={p} s={s} />)}
        </div>
      </main>
    </div>
  )
}
