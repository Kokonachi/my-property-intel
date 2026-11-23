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
import { PremiumPair, EntryLine } from '../components/PremiumTiles.jsx'
import { useSkin, skinHref } from '../lib/cardSkin.jsx'
import { IconKey, IconCoins, IconPsf, IconScore } from '../components/icons.jsx'
import { useCompare, COMPARE_MAX } from '../lib/compareDraft.js'
import { CompareTable, CompareBar } from '../components/CompareTable.jsx'

function ScoreMark({ score }) {
  const { t } = useLang()
  const skin = useSkin()
  const b = scoreBand(score)
  return (
    <div className="shrink-0 text-right" data-testid="score-mark">
      <div className="text-[22px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: skin.ink }}>
        {score == null ? '—' : score.toFixed(1)}
      </div>
      <div className="text-[10px] font-medium mt-0.5" style={{ color: skin.muted }}>{t(b.zh, b.en)}</div>
    </div>
  )
}

function RankCard({ p, s, segment, compare }) {
  const { t } = useLang()
  const skin = useSkin()
  const { holder } = useHolder()
  const y = s.yields
  const photo = p.render?.card || p.render?.pin || p.render?.src
  const entry = entryCostOf(s)
  const inst = s.v?.inst
  const many = segment === SEGMENTS.many
  const zero = segment === SEGMENTS.zero
  const selected = compare?.has(p.id)
  const blocked = many && !selected && !compare?.canAdd
  const rentMo = s.v?.rentMo ?? y?.rentMo
  const cash = s.v?.cash
  const currentRent = zero ? holder.currentRent : undefined
  const hasPair = inst != null && rentMo != null
  const href = skinHref(`#/explore/${p.id}`)

  return (
    <div
      className="group overflow-hidden rounded-[22px]"
      style={{ background: skin.card, boxShadow: skin.shadow }}
      data-testid={`score-card-${p.id}`}
    >
      <div className="relative h-36 sm:h-40 bg-black/10">
        <a href={href} className="absolute inset-0" aria-hidden="true" tabIndex={-1}>
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[11px] px-2 text-center" style={{ color: skin.muted }}>{t('暂无效果图', 'No render yet')}</div>
          )}
        </a>
        <span
          className="pointer-events-none absolute top-2.5 left-2.5 rounded-md text-[9px] font-semibold tracking-wide px-1.5 py-0.5"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#141416' }}
        >{t('新盘', 'NEW')}</span>
        {many && (
          <button
            type="button"
            data-testid={`compare-toggle-${p.id}`}
            disabled={blocked}
            onClick={() => compare.toggle(p.id)}
            className="absolute z-10 top-2.5 right-2.5 rounded-md px-1.5 h-6 text-[10px] font-semibold"
            style={
              selected
                ? { background: skin.ink, color: skin.card }
                : blocked
                  ? { background: 'rgba(255,255,255,0.45)', color: '#94a3b8' }
                  : { background: 'rgba(255,255,255,0.92)', color: '#141416' }
            }
          >
            {selected ? t('已选', 'Selected') : t('对比', 'Compare')}
          </button>
        )}
      </div>
      <a href={href} className="block px-3.5 pt-3 pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[16px] leading-snug truncate" style={{ color: skin.ink }}>{p.card_name || p.name}</div>
            {zero && entry ? (
              <EntryLine total={entry.total} className="mt-1.5" />
            ) : (
              <div className="mt-0.5 text-[12px] tabular-nums" style={{ color: skin.muted }}>
                {s.price ? fmtRM(s.price) : t('待报价', 'Ask')}
                {many && s.psf ? <span> · RM{Math.round(s.psf).toLocaleString('en-MY')}</span> : null}
                {!many && y?.gross != null ? <span> · {y.gross.toFixed(2)}%</span> : null}
                {many && y?.net != null ? <span> · {y.net.toFixed(2)}%</span> : null}
              </div>
            )}
          </div>
          {!zero && <ScoreMark score={s.score} />}
        </div>
        {hasPair ? (
          <PremiumPair
            className="mt-3"
            inst={inst}
            currentRent={currentRent}
            rentMo={rentMo}
            cash={cash}
          />
        ) : null}
      </a>
    </div>
  )
}


export default function LaunchHome() {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const { segment, sortBy, setSort } = useHolder()
  const compare = useCompare()
  const [compareOpen, setCompareOpen] = useState(false)
  const skin = useSkin()
  const rows = rankedLaunches(LAUNCHES, { rate: loan.rate, years: loan.years, ltv: loan.ltv, sortBy })
  const sorts = SEGMENT_SORTS[segment] || SEGMENT_SORTS.few
  const compareItems = rows.filter(r => compare.ids.includes(r.p.id))


  return (
    <div className="min-h-full flex flex-col" data-testid="launch-home" data-segment={segment} style={{ background: skin.bg, color: skin.ink }}>
      <AppNav
        active="launches"
        below={(
          <div className="flex items-center gap-2 rounded-xl px-2 py-1" style={{ background: skin.tile, border: `1px solid ${skin.line}` }}>
            <LoanPctControl variant="header" className="flex-1 min-w-0" />
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
                    className="inline-flex items-center gap-1 rounded-full px-2.5 h-8 text-[12px] font-medium"
                    style={on ? { background: skin.navOn, color: skin.navOnInk } : { background: skin.card, color: skin.muted, boxShadow: `inset 0 0 0 1px ${skin.line}` }}
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
