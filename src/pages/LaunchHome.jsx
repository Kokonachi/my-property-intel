import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { LAUNCHES } from '../data/launches.js'
import { REAL } from '../data/real.js'
import { fmtRM } from '../data/properties.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { rankedLaunches, scoreBand, entryCostOf, areaCompletedStats } from '../lib/launchScore.js'
import { AppNav } from '../components/AppNav.jsx'
import { LoanPctControl } from '../components/LtvVerdict.jsx'
import { FirstBuyerNote, GoalPrompt, RentPrompt, LoansControl } from '../components/HolderSheet.jsx'
import { useHolder, GOALS } from '../lib/holderProfile.js'
import { CompareTiles, EntryFacts, BuyVsRent } from '../components/CompareTiles.jsx'
import { CompareTable } from '../components/CompareTable.jsx'

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

/** "x% above completed projects nearby" — the first thing a buyer should know about a new-launch price. */
function PremiumTag({ psf, area }) {
  const { t } = useLang()
  if (!psf || !area?.medianPsf) return null
  const d = (psf / area.medianPsf - 1) * 100
  const up = d >= 0
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${up ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}`}
      data-testid="premium-tag"
      title={t(`表价 RM${Math.round(psf)} psf；同区已建成楼盘成交中位 RM${area.medianPsf} psf（${area.n} 个楼盘）`, `List RM${Math.round(psf)} psf; completed projects nearby transact at a median RM${area.medianPsf} psf (${area.n} projects)`)}
    >
      {up
        ? t(`比同区二手贵 ${Math.round(d)}%`, `${Math.round(d)}% above resale nearby`)
        : t(`比同区二手便宜 ${Math.round(-d)}%`, `${Math.round(-d)}% below resale nearby`)}
    </span>
  )
}

function RankCard({ p, s, goal }) {
  const { t } = useLang()
  const { holder } = useHolder()
  const y = s.yields
  const photo = p.render?.card || p.render?.pin || p.render?.src
  const entry = entryCostOf(s)
  const inst = s.v?.inst
  const home = goal === GOALS.home
  const area = s.area

  return (
    <div className="group flex flex-col gap-2 rounded-2xl bg-white p-2.5 pr-3 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:ring-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,.08)] transition" data-testid={`score-card-${p.id}`}>
      <a href={`#/launch/${p.id}`} className="flex gap-3">
        <div className="relative shrink-0 w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-xl overflow-hidden bg-slate-100">
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[11px] text-slate-400 px-2 text-center">{t('暂无效果图', 'No render yet')}</div>
          )}
          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-white/95 text-slate-800 text-[9px] font-semibold tracking-wide px-1.5 py-0.5 shadow-sm">{t('新盘', 'NEW')}</span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-[15px] text-slate-900 leading-snug truncate">{p.card_name || p.name}</div>
              <div className="mt-0.5 text-[13px] tabular-nums text-slate-700">
                {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
                {s.typ?.size ? <span className="text-slate-400 font-normal"> · {s.typ.size.toLocaleString()} sqft</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <PremiumTag psf={s.psf} area={area} />
                {p.expected_completion_year ? <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{t(`${p.expected_completion_year} 年交房`, `Ready ${p.expected_completion_year}`)}</span> : null}
              </div>
            </div>
            {!home && <ScoreMark score={s.score} />}
          </div>
          {home && entry ? <EntryFacts entry={entry} inst={inst} className="mt-1.5" /> : null}
        </div>
      </a>
      <a href={`#/launch/${p.id}`} className="block">
        {home
          ? <BuyVsRent v={s.v} currentRent={holder.currentRent} compact />
          : (inst != null && (s.v?.rentMo ?? y?.rentMo))
            ? <CompareTiles compact inst={inst} rentMo={s.v?.rentMo ?? y?.rentMo} cash={s.v?.cash} v={s.v} />
            : null}
      </a>
    </div>
  )
}

export default function LaunchHome() {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const { goal, holder } = useHolder()
  const [compareOpen, setCompareOpen] = useState(false)
  const home = goal === GOALS.home
  const rows = rankedLaunches(LAUNCHES, { rate: loan.rate, years: loan.years, ltv: loan.ltv, sortBy: home ? 'entry' : 'score' })
  const areaN = REAL.filter(p => p.area === 'bss').length
  const area = areaCompletedStats('bss')

  return (
    <div className="min-h-full bg-[#f6f7f8] flex flex-col" data-testid="launch-home" data-goal={goal || 'none'}>
      <AppNav active="launches" />

      <main className="flex-1 max-w-xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-slate-900 tracking-tight">{t('孟沙南新楼盘', 'New launches in Bangsar South')}</h1>
            <p className="mt-0.5 text-[12px] text-slate-500 leading-snug" data-testid="scope-line">
              {t(`收录 ${LAUNCHES.length} 个新盘，拿同区已建成楼盘做对照：二手成交中位 RM${area.medianPsf} psf（${area.n} 个楼盘）。`,
                `${LAUNCHES.length} launches, checked against completed projects nearby: resale median RM${area.medianPsf} psf (${area.n} projects).`)}
            </p>
          </div>
          {home && <FirstBuyerNote compact />}
        </div>

        <GoalPrompt />

        <section className="rounded-2xl bg-white p-2.5 ring-1 ring-slate-200/80 space-y-2" data-testid="assumptions">
          <LoanPctControl variant="header" className="rounded-xl bg-slate-50 border border-slate-200/80 px-2 py-1" />
          <LoansControl className="px-1" />
          {home && <RentPrompt compact />}
        </section>

        <div className="flex flex-col gap-2.5">
          {rows.map(({ p, s }) => <RankCard key={p.id} p={p} s={s} goal={goal} />)}
        </div>

        {rows.length >= 2 && (
          <button type="button" data-testid="compare-all" onClick={() => setCompareOpen(true)}
            className="w-full h-11 rounded-full bg-slate-900 text-white text-[14px] font-medium">
            {t(`并排对比这 ${rows.length} 个新盘`, `Compare these ${rows.length} side by side`)}
          </button>
        )}
        <a href="#/map" className="block text-center text-[13px] font-medium text-slate-600 hover:text-slate-900 py-1" data-testid="to-map">
          {t(`看同区 ${areaN} 个已建成楼盘的租金回报 →`, `See yields at ${areaN} completed projects nearby →`)}
        </a>
      </main>
      {compareOpen && (
        <CompareTable items={rows} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  )
}
