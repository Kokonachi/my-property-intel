import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { LAUNCHES } from '../data/launches.js'
import { fmtRM } from '../data/properties.js'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { rankedLaunches, scoreBand, headlineVerdict, downLabel, entryCostOf } from '../lib/launchScore.js'
import { AppNav } from '../components/AppNav.jsx'
import { LoanPctControl, LoanVerdict } from '../components/LtvVerdict.jsx'
import { FirstBuyerNote, RestartButton } from '../components/HolderSheet.jsx'
import { useHolder, SEGMENT_SORTS, SEGMENTS } from '../lib/holderProfile.js'
import { CompareTiles, EntryFacts } from '../components/CompareTiles.jsx'
import { IconKey, IconCoins, IconPsf, IconScore } from '../components/icons.jsx'
import { useCompare, COMPARE_MAX } from '../lib/compareDraft.js'
import { CompareTable, CompareBar } from '../components/CompareTable.jsx'

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

function RankCard({ p, s, segment, compare }) {
  const { t } = useLang()
  const { holder } = useHolder()
  const y = s.yields
  const photo = p.render?.card || p.render?.pin || p.render?.src
  const verdict = headlineVerdict(s, t)
  const down = downLabel(s.down, t)
  const entry = entryCostOf(s)
  const inst = s.v?.inst
  const many = segment === SEGMENTS.many
  const zero = segment === SEGMENTS.zero
  const showTiles = zero && inst != null
  const selected = compare?.has(p.id)
  const blocked = many && !selected && !compare?.canAdd

  return (
    <div className="group flex flex-col gap-2 rounded-2xl bg-white p-2.5 pr-3 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:ring-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,.08)] transition" data-testid={`score-card-${p.id}`}>
      <div className="flex gap-3">
        <div className="relative shrink-0 w-24 h-24 sm:w-[104px] sm:h-[104px] rounded-xl overflow-hidden bg-slate-100">
          <a href={`#/explore/${p.id}`} className="absolute inset-0" aria-hidden="true" tabIndex={-1}>
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[11px] text-slate-400 px-2 text-center">{t('暂无效果图', 'No render yet')}</div>
            )}
          </a>
          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-white/95 text-slate-800 text-[9px] font-semibold tracking-wide px-1.5 py-0.5 shadow-sm">{t('新盘', 'NEW')}</span>
          {many && (
            <button
              type="button"
              data-testid={`compare-toggle-${p.id}`}
              disabled={blocked}
              onClick={() => compare.toggle(p.id)}
              className={`absolute z-10 bottom-1.5 right-1.5 rounded-md px-1.5 h-6 text-[10px] font-semibold shadow-sm ${
                selected ? 'bg-slate-900 text-white' : blocked ? 'bg-white/70 text-slate-300' : 'bg-white/95 text-slate-700'
              }`}
            >
              {selected ? t('已选', 'Selected') : t('对比', 'Compare')}
            </button>
          )}
        </div>
        <a href={`#/explore/${p.id}`} className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-[15px] text-slate-900 leading-snug truncate">{p.card_name || p.name}</div>
              {zero && entry ? (
                <EntryFacts entry={entry} inst={inst} className="mt-1.5" />
              ) : many ? (
                <div className="mt-0.5">
                  <div className="text-[13px] tabular-nums text-slate-700">
                    {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
                    {s.psf ? <span className="text-slate-400 font-normal"> · RM{Math.round(s.psf).toLocaleString('en-MY')}</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-slate-600">
                    {y?.net != null ? <span className="inline-flex items-center gap-1"><IconCoins size={13} />{y.net.toFixed(2)}%</span> : null}
                    {y?.gross != null ? <span>{y.gross.toFixed(2)}%</span> : null}
                    {s.bandN ? <span>{s.bandN}</span> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-0.5 text-[13px] tabular-nums text-slate-700">
                  {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
                  {y ? <span className="text-slate-400 font-normal"> · {y.gross.toFixed(2)}%</span> : null}
                </div>
              )}
            </div>
            {!zero && <ScoreMark score={s.score} />}
          </div>
          {(!zero && inst != null && (s.v?.rentMo ?? y?.rentMo)) ? (
            <CompareTiles className="mt-1.5" compact inst={inst} rentMo={s.v?.rentMo ?? y?.rentMo} cash={s.v?.cash} />
          ) : (!zero && verdict) ? (
            <LoanVerdict price={s.price} rentMo={y?.rentMo} className="mt-1.5" compact={many} />
          ) : (!zero && down) ? (
            <div className="mt-1 text-[11px] text-slate-500">{down}</div>
          ) : null}
        </a>
      </div>
      {showTiles ? (
        <a href={`#/explore/${p.id}`} className="block">
          <CompareTiles
            inst={inst}
            currentRent={holder.currentRent}
            rentMo={s.v?.rentMo ?? y?.rentMo}
            cash={s.v?.cash}
          />
        </a>
      ) : null}
    </div>
  )
}

export default function LaunchHome() {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const { segment, sortBy, setSort } = useHolder()
  const compare = useCompare()
  const [compareOpen, setCompareOpen] = useState(false)
  const rows = rankedLaunches(LAUNCHES, { rate: loan.rate, years: loan.years, ltv: loan.ltv, sortBy })
  const sorts = SEGMENT_SORTS[segment] || SEGMENT_SORTS.few
  const compareItems = rows.filter(r => compare.ids.includes(r.p.id))


  return (
    <div className="min-h-full bg-[#f6f7f8] flex flex-col" data-testid="launch-home" data-segment={segment}>
      <AppNav
        active="launches"
        below={(
          <div className="flex items-center gap-2">
            <LoanPctControl variant="header" className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-200/80 px-2 py-1" />
            {segment === SEGMENTS.zero && <FirstBuyerNote compact />}
          </div>
        )}
      />

      <main className="flex-1 max-w-xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-5">
        <div className="mb-2.5 flex items-center gap-2">
          {sorts.length > 1 && (
            <div className="flex flex-wrap gap-1.5 min-w-0" data-testid="sort-chips" role="tablist" aria-label={t('排序', 'Sort')}>
              {sorts.map(s => {
                const on = sortBy === s.id
                const Icon = s.id === 'entry' ? IconKey : s.id === 'score' ? IconScore : s.id === 'net' ? IconCoins : IconPsf
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    data-testid={`sort-${s.id}`}
                    onClick={() => setSort(s.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 h-8 text-[12px] font-medium ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                  >
                    <Icon size={13} />
                    {t(s.zh, s.en)}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex-1 min-w-0" />
          <RestartButton className="shrink-0 whitespace-nowrap" />
        </div>
        <div className="flex flex-col gap-2.5">
          {rows.map(({ p, s }) => <RankCard key={p.id} p={p} s={s} segment={segment} compare={segment === SEGMENTS.many ? compare : null} />)}
        </div>
        {segment === SEGMENTS.many && (
          <CompareBar
            count={compare.ids.length}
            ready={compare.ready}
            onOpen={() => setCompareOpen(true)}
            onClear={compare.clear}
          />
        )}
      </main>
      {compareOpen && segment === SEGMENTS.many && (
        <CompareTable
          items={compareItems}
          onClose={() => setCompareOpen(false)}
          onRemove={id => compare.toggle(id)}
          onClear={() => { compare.clear(); setCompareOpen(false) }}
        />
      )}
    </div>
  )
}
