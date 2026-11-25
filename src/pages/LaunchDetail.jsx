import { useEffect, useMemo, useState } from 'react'
import { AppNav } from '../components/AppNav.jsx'
import { Footer } from '../components/ui.jsx'
import { NoteChip } from '../components/NoteChip.jsx'
import { useLang } from '../lib/i18n.jsx'
import { typRentPsf, AREA_RENT_PSF } from '../data/launches.js'
import { typYields, workingPrice, discountToTargetGross } from '../lib/launchYield.js'
import { fmtRM, yieldBand } from '../data/properties.js'
import { REAL_META } from '../data/real.js'
import { LoanVerdict, LoanAssumptionsBar, LoanPctControl, LoanRateYears } from '../components/LtvVerdict.jsx'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { launchScore, scoreBand, SCORE_WEIGHTS, entryCostOf } from '../lib/launchScore.js'
import { FirstBuyerNote, RentPrompt, GoalPrompt } from '../components/HolderSheet.jsx'
import { useHolder, SEGMENTS } from '../lib/holderProfile.js'
import { cashVsRent, entryCost, salaryBurden, parseMoney } from '../lib/mortgage.js'
import { salaryBandCopy } from '../lib/plainCopy.js'
import { EntryFacts, EntryStack, BuyVsRent } from '../components/CompareTiles.jsx'
import { DecisionSummary } from '../components/DecisionSummary.jsx'
import { IconKey, IconCalendar, IconInfo } from '../components/icons.jsx'

const pct = v => (v == null || Number.isNaN(v) ? '—' : `${v.toFixed(2)}%`)
const rm = v => (v == null || Number.isNaN(v) ? '—' : fmtRM(v))
const yColor = v => (v == null ? '#0f172a' : yieldBand(v).color)

function roomsLabel(beds, t) {
  if (beds == null) return null
  if (beds <= 0) return t('套房', 'Studio')
  return t(`${beds} 房`, beds === 1 ? '1 bed' : `${beds} beds`)
}

function shortLabel(s) {
  if (!s) return s
  return String(s).split(/[（(：:]/)[0].trim()
}

function KeyFact({ label, value }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900 leading-snug">{value}</div>
    </div>
  )
}

function NetBreakdown({ y, t }) {
  if (!y || y.net == null) return null
  const row = (label, pts) => (
    <div className="flex justify-between gap-3 tabular-nums">
      <span>{label}</span>
      <span>− {pts.toFixed(2)}%</span>
    </div>
  )
  return (
    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600 space-y-1" data-testid="net-breakdown">
      <div className="flex justify-between font-medium text-slate-800 tabular-nums">
        <span>{t('毛回报', 'Gross')}</span><span>{y.gross.toFixed(2)}%</span>
      </div>
      {row(t('空置（约 1 个月）', 'Vacancy (about 1 month)'), y.vacancyPts)}
      {row(t('门牌税（年租 4%）', 'Assessment (4% of annual rent)'), y.assessmentPts)}
      {row(t('管理费', 'Maintenance'), y.maintenancePts)}
      {row(t('地税和保险', 'Quit rent and insurance'), y.fixedPts)}
      <div className="flex justify-between font-medium text-slate-800 tabular-nums border-t border-slate-200 pt-1">
        <span>{t('净回报', 'Net')}</span><span>{y.net.toFixed(2)}%</span>
      </div>
    </div>
  )
}

function CompList({ band, t }) {
  if (!band?.listings?.length) return null
  return (
    <div className="mt-3" data-testid="comp-list">
      <div className="text-[11px] text-slate-500 mb-1">{t(`可比叫租 ${band.n} 则`, `${band.n} asking-rent comps`)}</div>
      <ul className="space-y-1 max-h-56 overflow-y-auto text-[12px] text-slate-600">
        {band.listings.map((s, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">{s.project} · {s.size.toLocaleString()} sqft{s.rooms ? ` · ${t(`${s.rooms} 房`, `${s.rooms} bed`)}` : ''}</span>
            <span className="shrink-0 tabular-nums">{rm(s.rent)}{t('/月', '/mo')} · RM{s.psf.toFixed(2)} psf</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TypCard({ p, typ, t, draft, onChange, compactLoan = false, variant = 'default', currentRent = null }) {
  const { loan } = useLoanAssumptions()
  const { psf, band } = typRentPsf(typ)
  const list = typ.price_from
  const d = draft || { mode: list ? 'pct' : 'price', pct: '', price: '' }
  const after = workingPrice({ listPrice: list, mode: d.mode, pct: d.pct, netPrice: d.price })
  const before = list ? typYields({ size: typ.size, price: list, rentPsf: psf, maintPsf: p.maint_psf }) : null
  const afterY = after ? typYields({ size: typ.size, price: after, rentPsf: psf, maintPsf: p.maint_psf }) : null
  const discounted = after && list && Math.abs(after - list) > 1
  const t5 = list && psf ? discountToTargetGross(list, typ.size, psf, 5) : null
  const t6 = list && psf ? discountToTargetGross(list, typ.size, psf, 6) : null
  const impliedRent = psf && typ.size ? psf * typ.size : null
  const [discOpen, setDiscOpen] = useState(false)
  const price = after || list
  const y = discounted ? afterY : before
  const thin = !band?.sufficient
  const bits = [
    roomsLabel(typ.beds, t),
    typ.baths ? t(`${typ.baths} 卫`, typ.baths === 1 ? '1 bath' : `${typ.baths} baths`) : null,
    typ.size ? `${typ.size.toLocaleString()} sqft` : null,
    typ.units ? t(`${typ.units} 个`, `${typ.units} units`) : null,
  ].filter(Boolean)
  const showGrid = variant !== 'simple' && (impliedRent || y?.gross != null || y?.net != null)
  const gridCols = [impliedRent, y?.gross != null, y?.net != null].filter(Boolean).length
  const v = price && impliedRent
    ? cashVsRent({ price, rentMo: impliedRent, ltv: loan.ltv, rate: loan.rate, years: loan.years, maintMo: (p.maint_psf || 0) * typ.size })
    : null
  const typEntry = v ? entryCost({ price, down: v.down, size: typ.size }) : null
  const simple = variant === 'simple'
  const pro = variant === 'pro'

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]" data-testid={`typ-${typ.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {typ.tower ? <div className="text-[11px] text-slate-500">{typ.tower}</div> : null}
          <h3 className="font-semibold text-slate-900 leading-snug">{t(typ.type_zh, typ.type)}</h3>
          <div className="text-[12px] text-slate-500 mt-0.5">{bits.join(' · ')}</div>
        </div>
        {list ? (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-500">{discounted ? t('折后价', 'After discount') : t('表价起', 'List from')}</div>
            <div className="text-[16px] font-semibold text-slate-900 tabular-nums leading-tight">{rm(discounted ? after : list)}</div>
            {discounted ? <div className="text-[11px] text-slate-400 tabular-nums line-through">{rm(list)}</div> : null}
            {!simple && !discounted && typ.psf_from ? <div className="text-[11px] text-slate-500">RM{typ.psf_from.toLocaleString('en-MY')} psf</div> : null}
            {!simple && discounted && typ.size ? <div className="text-[11px] text-slate-500">RM{Math.round(after / typ.size).toLocaleString('en-MY')} psf</div> : null}
            {!discounted && typ.price_to && typ.price_to !== list ? (
              <div className="text-[11px] text-slate-400 tabular-nums">{rm(list)}–{rm(typ.price_to)}</div>
            ) : null}
          </div>
        ) : (
          <div className="text-right shrink-0 text-[11px] text-slate-500">{t('暂无表价', 'No list price')}</div>
        )}
      </div>

      {simple && typEntry && (
        <EntryFacts entry={typEntry} inst={v?.inst} className="mt-3" />
      )}
      {simple && thin && impliedRent ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200" data-testid={`rent-estimated-${typ.id}`}>
          {t(`租金 ${rm(impliedRent)}/月是推算：附近同面积租盘不足，改用区域中位 RM${psf.toFixed(2)} psf。小户型每尺租金通常更高，这个数字可能偏低。`,
            `Rent ${rm(impliedRent)}/mo is estimated: too few same-size ads nearby, so the area median of RM${psf.toFixed(2)} psf is used. Small units usually rent for more per sqft, so this may be low.`)}
          {band?.listings?.length
            ? t(` 最近的一则：${band.listings[0].project} ${band.listings[0].size} sqft，叫租 ${rm(band.listings[0].rent)}/月。`,
              ` Nearest ad: ${band.listings[0].project} ${band.listings[0].size} sqft, asking ${rm(band.listings[0].rent)}/mo.`)
            : null}
        </div>
      ) : null}
      {simple && v?.inst != null && (
        <BuyVsRent className="mt-3" compact v={v} currentRent={currentRent} />
      )}

      {!simple && price && impliedRent ? <LoanVerdict price={price} rentMo={impliedRent} maintMo={(p.maint_psf || 0) * typ.size} className="mt-3" compact={compactLoan} /> : null}

      {showGrid && (
        <div className={`mt-3 grid gap-3 ${gridCols >= 3 ? 'grid-cols-3' : gridCols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {impliedRent ? (
            <div>
              <div className="text-[11px] text-slate-500">{t('参考月租', 'Est. rent')}</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900">{rm(impliedRent)}{t('/月', '/mo')}</div>
              <div className="text-[11px] text-slate-400 tabular-nums">RM{psf.toFixed(2)} psf</div>
            </div>
          ) : null}
          {y?.gross != null ? (
            <div>
              <div className="text-[11px] text-slate-500">{discounted ? t('折后毛回报', 'Gross after disc.') : t('毛回报', 'Gross')}</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums leading-snug" style={{ color: yColor(y.gross) }}>{pct(y.gross)}</div>
            </div>
          ) : null}
          {y?.net != null ? (
            <div>
              <div className="text-[11px] text-slate-500">{discounted ? t('折后净回报', 'Net after disc.') : t('净回报', 'Net')}</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums leading-snug" style={{ color: yColor(y.net) }}>{pct(y.net)}</div>
            </div>
          ) : null}
        </div>
      )}

      {pro && <NetBreakdown y={y} t={t} />}
      {pro && <CompList band={band} t={t} />}

      {!simple && (
        <div className="mt-2.5 flex flex-wrap items-start gap-1.5">
          {thin && (
            <NoteChip testId={`thin-sample-${typ.id}`} label={t('样本少', 'Thin sample')}>
              {t(`附近没有足够的相近面积租盘（±25% 内不足 4 则）。上面的回报改用孟沙南已建成楼盘的租金中位数 RM${psf.toFixed(2)} psf（不含组屋）。`,
                `Not enough nearby listings in the same size band (fewer than 4 ads within ±25%). Yield above uses the Bangsar South completed-project median rent of RM${psf.toFixed(2)} psf, excluding low-cost flats.`)}
              {band?.listings?.length
                ? t(` 最近的一则：${band.listings[0].project} ${band.listings[0].size} sqft，叫租 ${rm(band.listings[0].rent)}/月。`,
                  ` Nearest ad: ${band.listings[0].project} ${band.listings[0].size} sqft, asking ${rm(band.listings[0].rent)}/mo.`)
                : null}
            </NoteChip>
          )}
          {!pro && band?.sufficient && (
            <NoteChip testId={`comps-${typ.id}`} label={t(`${band.n} 则可比`, `${band.n} comps`)}>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {band.listings.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{s.project} · {s.size.toLocaleString()} sqft{s.rooms ? ` · ${t(`${s.rooms} 房`, `${s.rooms} bed`)}` : ''}</span>
                    <span className="shrink-0 tabular-nums">{rm(s.rent)}{t('/月', '/mo')} · RM{s.psf.toFixed(2)} psf</span>
                  </li>
                ))}
              </ul>
            </NoteChip>
          )}
          {(typ.price_source || typ.price_source_zh) && (
            <NoteChip testId={`typ-source-${typ.id}`} label={t('价格来源', 'Price source')}>
              {t(typ.price_source_zh || typ.price_source, typ.price_source)}
            </NoteChip>
          )}
        </div>
      )}

      <div className="mt-3">
        <button
          type="button"
          data-testid={`disc-toggle-${typ.id}`}
          aria-expanded={discOpen || discounted}
          onClick={() => setDiscOpen(v => !v)}
          className="text-[13px] font-medium text-slate-700"
        >
          {t('有销售报价？填写折扣', 'Have a sales quote? Enter discount')}
          {discounted ? <span className="ml-1.5 font-semibold tabular-nums text-slate-500">{rm(after)}</span> : null}
        </button>
        {(discOpen || discounted) && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid={`disc-box-${typ.id}`}>
            <div className="flex flex-wrap gap-2">
              {list ? (
                <>
                  <label className={`flex-1 min-w-[8rem] rounded-xl border bg-white px-3 py-2 ${d.mode === 'pct' ? 'border-slate-900' : 'border-slate-200'}`}>
                    <div className="text-[11px] text-slate-500">{t('折扣 %', 'Discount %')}</div>
                    <div className="flex items-center gap-1">
                      <input inputMode="decimal" data-testid={`disc-pct-${typ.id}`} className="w-full bg-transparent outline-none font-semibold tabular-nums"
                        placeholder={t('例如 8', 'e.g. 8')} value={d.mode === 'pct' ? d.pct : ''}
                        onChange={e => onChange({ mode: 'pct', pct: e.target.value, price: '' })} />
                      <span className="text-slate-400">%</span>
                    </div>
                  </label>
                  <span className="self-center text-[12px] text-slate-400">{t('或', 'or')}</span>
                </>
              ) : null}
              <label className={`flex-[1.3] min-w-[10rem] rounded-xl border bg-white px-3 py-2 ${d.mode === 'price' || !list ? 'border-slate-900' : 'border-slate-200'}`}>
                <div className="text-[11px] text-slate-500">{t('折后价（RM）', 'Net price (RM)')}</div>
                <input inputMode="decimal" data-testid={`disc-price-${typ.id}`} className="w-full bg-transparent outline-none font-semibold tabular-nums"
                  placeholder={list ? t(`表价 ${list.toLocaleString('en-MY')}`, `List ${list.toLocaleString('en-MY')}`) : t('例如 850000', 'e.g. 850000')}
                  value={d.mode === 'price' ? d.price : (discounted && after ? String(Math.round(after)) : '')}
                  onChange={e => onChange({ mode: 'price', price: e.target.value, pct: '' })} />
              </label>
            </div>
            {discounted && list && afterY && (
              <div className="mt-2 text-[12px] text-slate-600 tabular-nums">
                {rm(list)} → {rm(after)} · {((1 - after / list) * 100).toFixed(1)}% · {pct(before.gross)} → {pct(afterY.gross)}
              </div>
            )}
            {!simple && list && (t5 || t6) && (
              <div className="mt-2 text-[12px] text-slate-500 leading-snug space-y-0.5">
                <div>{t5?.alreadyMet
                  ? t('表价毛回报已达到 5%。', 'Gross at list already meets 5%.')
                  : t(`要到 5% 毛回报，大约需要 ${t5.discountPct.toFixed(1)}% 折扣（折后约 ${rm(t5.neededPrice)}）。`, `To reach 5% gross, about a ${t5.discountPct.toFixed(1)}% discount (around ${rm(t5.neededPrice)}).`)}</div>
                <div>{t6?.alreadyMet
                  ? t('表价毛回报已达到 6%。', 'Gross at list already meets 6%.')
                  : t(`要到 6% 毛回报，大约需要 ${t6.discountPct.toFixed(1)}% 折扣（折后约 ${rm(t6.neededPrice)}）。`, `To reach 6% gross, about a ${t6.discountPct.toFixed(1)}% discount (around ${rm(t6.neededPrice)}).`)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SalaryBox({ inst, salary, onSave, t }) {
  const [raw, setRaw] = useState(() => (salary != null ? String(Math.round(salary)) : ''))
  useEffect(() => {
    setRaw(salary != null ? String(Math.round(salary)) : '')
  }, [salary])
  const burden = salaryBurden(inst, salary)
  const bandColor = burden?.band === 'comfortable' ? '#059669' : burden?.band === 'tight' ? '#d97706' : '#e11d48'

  return (
    <section className="rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]" data-testid="salary-box">
      <div className="text-[11px] text-slate-500">{t('月供占工资的比例', 'Instalment as a share of salary')}</div>
      {burden ? (
        <>
          <div className="mt-0.5 flex items-end gap-3">
            <div className="text-[28px] font-semibold tabular-nums leading-none tracking-tight text-slate-900">{burden.pct.toFixed(0)}%</div>
            <div className="pb-0.5 text-[13px] font-medium" style={{ color: bandColor }}>{salaryBandCopy(burden.band, t)}</div>
          </div>
          <p className="mt-2 text-[12px] text-slate-500 leading-snug">
            {t(`月供 ${rm(inst)}，以你填写的月薪 ${rm(salary)} 来算。这只是一般参考：30% 以下比较轻松，30%–40% 有点紧，超过 40% 压力较大。不是银行审批标准。`,
              `The instalment is ${rm(inst)} against the monthly salary you entered, ${rm(salary)}. This is only a general guideline: under 30% is comfortable, 30–40% is tight, and over 40% is stretched. It is not a bank’s approval rule.`)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[13px] text-slate-600 leading-snug">{t('填写月薪后，可以看到月供大概占收入的多少。', 'Enter your monthly salary to see how much of it the instalment would take.')}</p>
      )}
      <label className="mt-3 flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500">{t('每月工资（RM）', 'Monthly salary (RM)')}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] text-slate-400">RM</span>
            <input
              data-testid="inline-salary"
              inputMode="decimal"
              className="w-full bg-transparent outline-none text-[16px] font-semibold tabular-nums text-slate-900"
              placeholder="8,000"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              onBlur={() => onSave(parseMoney(raw))}
            />
          </div>
        </div>
        <button type="button" data-testid="inline-salary-save" onClick={() => onSave(parseMoney(raw))}
          className="shrink-0 h-8 px-3 rounded-full bg-slate-900 text-white text-[12px] font-medium">{t('保存', 'Save')}</button>
      </label>
    </section>
  )
}

export default function LaunchDetail({ p }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const { holder, goal, segment, setBudget } = useHolder()
  const [drafts, setDrafts] = useState(() => Object.fromEntries(p.typologies.map(ty => [ty.id, { mode: ty.price_from ? 'pct' : 'price', pct: '', price: '' }])))
  const setDraft = (id, d) => setDrafts(s => ({ ...s, [id]: { ...s[id], ...d } }))
  const [selTypId, setSelTypId] = useState(null)
  const zero = segment === SEGMENTS.zero
  const [scoreOpen, setScoreOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)

  const pricedTyp = useMemo(() => p.typologies.find(ty => ty.price_from), [p])
  const scored = useMemo(() => launchScore(p, { rate: loan.rate, years: loan.years, ltv: loan.ltv }), [p, loan.rate, loan.years, loan.ltv])
  const sBand = scoreBand(scored.score)
  const entry = entryCostOf(scored)
  const selTyp = selTypId ?? scored.typ?.id ?? p.typologies[0]?.id

  const tenureLabel = /freehold/i.test(p.tenure)
    ? t('永久地契', 'Freehold')
    : t('99年租契', p.tenure_short || '99-year leasehold')
  const metaLine = [t(p.area_zh, p.area_en) || p.area_en, shortLabel(t(p.property_type_zh, p.property_type)), tenureLabel].filter(Boolean).join(' · ')
  const transitName = p.transit?.[0] ? shortLabel(t(p.transit[0].zh, p.transit[0].en)) : null
  const transitM = p.kerinchi_lrt?.official_m || (typeof p.transit?.[0]?.official_m === 'number' ? p.transit[0].official_m : null)
  const transitValue = transitName
    ? (transitM ? `${transitName} · ${transitM >= 1000 ? `${(transitM / 1000).toFixed(1)} km` : `${transitM} m`}` : transitName)
    : null
  const midValleyValue = p.mid_valley?.km != null
    ? `${Number(p.mid_valley.km).toFixed(1)} km`
    : (p.mid_valley ? shortLabel(t(p.mid_valley.zh, p.mid_valley.en)) : null)

  const unitsValue = p.total_units != null
    ? `${p.total_units.toLocaleString()}${p.units_left != null ? t(` · 余 ${p.units_left}`, ` · ${p.units_left} left`) : p.units_left_chart != null ? t(` · 余 ${p.units_left_chart}`, ` · ${p.units_left_chart} left`) : ''}`
    : null

  const facts = [
    { label: t('地契', 'Tenure'), value: tenureLabel },
    { label: t('交房', 'Handover / VP'), value: t(`${p.expected_completion_year} 年`, String(p.expected_completion_year)) },
    unitsValue ? { label: t('单位数', 'Units'), value: unitsValue } : null,
    p.maint_psf != null ? { label: t('管理费', 'Maintenance'), value: `RM${p.maint_psf.toFixed(2)} psf` } : null,
    transitValue ? { label: t('轨道交通', 'Transit'), value: transitValue } : null,
    midValleyValue ? { label: t('到 Mid Valley', 'To Mid Valley'), value: midValleyValue } : null,
    p.construction_progress_pct != null ? { label: t('开工进度', 'Construction'), value: `${p.construction_progress_pct}%` } : null,
  ].filter(Boolean)

  const typVariant = zero ? 'simple' : 'pro'
  const dataAsOf = REAL_META?.generated_at

  return (
    <div className="min-h-full bg-[#f6f7f8] flex flex-col">
      <AppNav active="launches" />
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-slate-600">
          <a href="#/" className="hover:text-slate-900">{t('← 全部新楼盘', '← All new launches')}</a>
          <a href={`#/explore/${p.id}`} className="hover:text-slate-900">{t('在地图上看', 'See on the map')}</a>
        </div>

        <GoalPrompt />

        <section className="rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          {p.render?.src ? (
            <div className="relative h-52 sm:h-72 bg-slate-200">
              <img src={p.render.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-28 sm:h-32 bg-slate-800 text-white grid place-items-center px-4">
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-wide text-slate-300">{t('暂无官方效果图', 'No official render yet')}</div>
                <div className="font-semibold text-lg mt-1">{p.name}</div>
              </div>
            </div>
          )}
          <div className="p-4 sm:p-5">
            <h1 className="text-[22px] sm:text-[26px] font-semibold text-slate-900 leading-tight tracking-tight">{p.name}</h1>
            <p className="mt-1 text-[13px] text-slate-500">{metaLine}</p>
            <p className="mt-0.5 text-[13px] text-slate-500">{p.developer}{p.developer_parent ? ` · ${p.developer_parent}` : ''}</p>

            <DecisionSummary embedded p={p} s={scored} entry={entry} goal={goal} loan={loan} currentRent={holder.currentRent} />

            {zero && entry && (
              <div className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-3.5" data-testid="entry-cost">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="grid place-items-center rounded-lg bg-white ring-1 ring-slate-200/80 text-slate-700" style={{ width: 28, height: 28 }}><IconKey size={16} /></span>
                      <div className="text-[28px] font-semibold tabular-nums leading-none tracking-tight">{rm(entry.total)}</div>
                    </div>
                  </div>
                  <details className="relative shrink-0">
                    <summary className="cursor-pointer list-none grid place-items-center h-7 w-7 rounded-full text-slate-400 hover:text-slate-700" aria-label={t('说明', 'About')}>
                      <IconInfo size={15} />
                    </summary>
                    <p className="absolute right-0 top-8 z-20 w-64 rounded-xl bg-white p-3 text-[12px] leading-snug text-slate-600 ring-1 ring-slate-200 shadow-[0_8px_24px_rgba(15,23,42,.12)]">
                      {t('律师费、印花税和装修都是估算，不是律师行或承包商的报价，也不含银行手续费或家具升级。', 'Legal fees, stamp duty and renovation are estimates, not quotes from a solicitor or contractor, and they exclude bank fees or a fuller furniture budget.')}
                    </p>
                  </details>
                </div>
                <EntryStack entry={entry} t={t} className="mt-3" />
                {scored.v?.inst != null ? (
                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="grid place-items-center rounded-lg bg-white ring-1 ring-slate-200/80 text-slate-700" style={{ width: 28, height: 28 }}><IconCalendar size={16} /></span>
                      <div className="text-[18px] font-semibold tabular-nums leading-none">{rm(scored.v.inst)}{t('/月', '/mo')}</div>
                    </div>
                    <BuyVsRent className="mt-3" v={scored.v} currentRent={holder.currentRent} />
                    <RentPrompt className="mt-2" compact />
                  </div>
                ) : null}
              </div>
            )}

            {facts.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3" data-testid="key-facts">
                {facts.map(f => <KeyFact key={f.label} label={f.label} value={f.value} />)}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-start gap-1.5">
              {p.price_conflict && (
                <NoteChip testId="price-conflict" label={t('两种起价', 'Two from-prices')}>
                  <div className="font-medium text-slate-600">{t(p.price_conflict.title_zh, p.price_conflict.title_en)}</div>
                  <p className="mt-1">{t(p.price_conflict.body_zh, p.price_conflict.body_en)}</p>
                </NoteChip>
              )}
              {p.bumi_discount_pct ? (
                <NoteChip testId="bumi-discount" label={t(`土著折扣 ${p.bumi_discount_pct}%`, `Bumi discount ${p.bumi_discount_pct}%`)}>
                  {t(`官已公布土著折扣 ${p.bumi_discount_pct}%（须符合资格），和下面你自己填的销售折扣不是同一回事，不会自动套用。`,
                    `A published Bumiputera discount of ${p.bumi_discount_pct}% (eligibility rules apply) is separate from the user-entered sales discount below, and is not applied automatically.`)}
                </NoteChip>
              ) : null}
              {!p.maint_is_published && p.maint_psf != null ? (
                <NoteChip testId="maint-note" label={t('管理费为假设', 'Assumed maintenance')}>
                  {t(`RM${p.maint_psf.toFixed(2)} psf/月未公布，用孟沙南已建成楼盘的假设。`, `RM${p.maint_psf.toFixed(2)} psf/mo is not published; this uses the Bangsar South assumption.`)}
                </NoteChip>
              ) : null}
            </div>
          </div>
        </section>

        {zero && scored.v?.inst != null && (
          <SalaryBox inst={scored.v.inst} salary={holder.salary} onSave={v => setBudget({ salary: v })} t={t} />
        )}

        
        {!zero && scored.score != null && (
          <button
            type="button"
            data-testid="launch-score"
            aria-expanded={scoreOpen}
            onClick={() => setScoreOpen(v => !v)}
            className="w-full text-left rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          >
            <div className="text-[11px] text-slate-500">{t('楼盘回报分（按表价，不随贷款变化）', 'Project score (at list price; does not move with your loan)')}</div>
            <div className="mt-0.5 flex items-end gap-3">
              <div className="text-[32px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: sBand.color }}>{scored.score.toFixed(1)}</div>
              <div className="pb-0.5 text-[13px] font-medium text-slate-600">{t(sBand.zh, sBand.en)}</div>
            </div>
            {scoreOpen && (
              <div className="mt-2.5 text-[12px] text-slate-600 tabular-nums leading-snug" data-testid="score-breakdown">
                {t('租售比', 'Rent-to-price')} {scored.parts.yield.toFixed(1)}/{SCORE_WEIGHTS.yield}
                <span className="text-slate-300"> · </span>
                {t('对比区域', 'Vs area')} {scored.parts.vsArea.toFixed(1)}/{SCORE_WEIGHTS.vsArea}
                <span className="text-slate-300"> · </span>
                {t('样本可信度', 'Comp confidence')} {scored.parts.confidence.toFixed(1)}/{SCORE_WEIGHTS.confidence}
              </div>
            )}
          </button>
        )}

        <LoanAssumptionsBar end={zero ? <FirstBuyerNote compact /> : null} />

        <h2 className="pt-1 text-[15px] font-semibold text-slate-900">{zero ? t('各户型要准备多少', 'Cash to enter by unit type') : t('按户型看回报', 'Yield by unit type')}</h2>
        <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label={t('户型', 'Unit types')} data-testid="typ-tabs">
          {p.typologies.map(typ => {
            const on = typ.id === selTyp
            const label = [roomsLabel(typ.beds, t), `${typ.size.toLocaleString()} sqft`].filter(Boolean).join(' · ')
            return (
              <button key={typ.id} type="button" role="tab" aria-selected={on} data-testid={`typ-tab-${typ.id}`} onClick={() => setSelTypId(typ.id)}
                className={`shrink-0 rounded-full px-3 h-8 text-[12px] font-medium whitespace-nowrap ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                {label}
              </button>
            )
          })}
        </div>
        <div className="space-y-3">
          {p.typologies.filter(typ => typ.id === selTyp).map(typ => (
            <TypCard key={typ.id} p={p} typ={typ} t={t} draft={drafts[typ.id]} onChange={d => setDraft(typ.id, d)} compactLoan={false} variant={typVariant} currentRent={holder.currentRent} />
          ))}
        </div>

        {(p.facilities?.length || p.extras || p.address) && (
          <details className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] group" data-testid="facilities">
            <summary className="cursor-pointer list-none px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-[15px] font-semibold text-slate-900">
              <span>{t('设施与位置', 'Facilities and location')}</span>
              <span className="text-slate-400 text-[13px] font-medium group-open:hidden">{t('展开', 'Show')}</span>
              <span className="text-slate-400 text-[13px] font-medium hidden group-open:inline">{t('收起', 'Hide')}</span>
            </summary>
            <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 text-[13px] text-slate-600">
              {p.facilities?.map(g => (
                <div key={g.group_en} className="mt-3">
                  <div className="font-medium text-slate-800">{t(g.group_zh, g.group_en)}</div>
                  <div className="leading-relaxed">{t(g.items_zh.join(' · '), g.items_en.join(' · '))}</div>
                </div>
              ))}
              {p.extras && <div className="mt-3">{p.extras.join(' · ')}</div>}
              {p.address && <div className="mt-3 text-[12px] text-slate-500">{p.address}</div>}
            </div>
          </details>
        )}

        <details
          className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] group"
          data-testid="how-calculated"
          open={howOpen}
          onToggle={e => setHowOpen(e.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-[15px] font-semibold text-slate-900">
            <span>{t('怎么计算 / 数据', 'How we calculate / Data')}</span>
            <span className="text-slate-400 text-[13px] font-medium group-open:hidden">{t('展开', 'Show')}</span>
            <span className="text-slate-400 text-[13px] font-medium hidden group-open:inline">{t('收起', 'Hide')}</span>
          </summary>
          <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 space-y-3 text-[13px] text-slate-600 leading-relaxed">
            {dataAsOf || p.units_left_as_of ? (
              <p className="mt-3 text-[12px] text-slate-500" data-testid="data-as-of">
                {dataAsOf ? t(`已建成楼盘租金数据截至 ${dataAsOf}。`, `Completed-project rent data as of ${dataAsOf}.`) : null}
                {p.units_left_as_of ? t(` 剩余单位数字截至 ${p.units_left_as_of}。`, ` Units-left figure as of ${p.units_left_as_of}.`) : null}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li>{t('参考毛回报 = 同面积段叫租中位（每平方尺）× 户型面积 × 12 ÷ 表价。净回报沿用现有算法：减去约 1 个月空置、门牌税（年租 4%）、管理费、地税和保险（公寓按每年 RM250 估）。',
                'Indicative gross = size-band median asking rent psf × typ size × 12 ÷ list price. Net yield uses the existing method: subtract about one month of vacancy, assessment tax (4% of annual rent), maintenance, and quit rent plus insurance (RM250/year for strata).')}</li>
              <li>{t('参考毛回报用的是附近已建成楼盘、接近同一面积的叫租中位数，不是地图上“每条租盘各自算完再取中位”的方法，也不能当成交房后的实际租金。', 'Indicative gross uses the median asking rent psf of nearby completed projects in the same size band. It is not the live map’s per-listing median, and it is not achieved rent after handover.')}</li>
              <li>{t(p.maint_source_zh || p.maint_source, p.maint_source)}</li>
              <li>{t('可比样本已去掉安卡莎布里组屋（租金约 RM1.88 psf，和这类新盘不可比），KL Gateway / Suezcap 的重复广告只计一次。', 'Angkasapuri low-cost flats (about RM1.88 psf) are excluded; duplicate ads under the KL Gateway / Suezcap Brickz records are counted once.')}</li>
              <li>{t('开发商给的议价折扣通常不会挂在网上。本页数字默认是表价；只有你填了销售报价之后，折扣后的回报和月供才会按折后价重算。', 'Negotiated developer discounts are rarely listed online. Figures default to the list price; after-discount yields and instalments appear only after you enter a sales quote.')}</li>
              <li>{t('月供用等额本息公式，贷款成数默认 90%，可在 50%–90% 之间改，首页、地图小窗和本页共用。年利率默认 4.3%、年期默认 35 年，可在本页修改。国行 2026 年 11 月 5 日维持隔夜政策利率 2.75%，各银行标准化基准利率（SBR）同为 2.75%。4.3% 是目前市面常见浮动房贷（约 4.10–4.75%）的中间假设，不是银行批复利率；投资客贷款可能更高。年期通常会受年龄上限（多为 70 岁）限制。租金是叫租估算，不是交房后的实收租金。',
                'The instalment uses a standard amortising formula. Loan percentage defaults to 90% and can be set from 50% to 90%; the same value is shared on the home list, the map panel and this page. Interest defaults to 4.3% p.a. over 35 years, editable here. Bank Negara held the OPR at 2.75% on 5 Nov 2026, so every bank’s SBR is 2.75%. 4.3% is a mid-market assumption among advertised floating packages in November 2026 (about 4.10–4.75%), not a bank offer; investor loans can be higher. Tenure is often capped by age (commonly 70). Rent is an asking-rent estimate, not achieved rent after handover.')}</li>
              <li>{t('入场要准备的钱 = 首付 + 买卖合约和贷款协议印花税 + 律师费（按常见律师收费表估算，并加上 8% 服务税）+ 按每平方尺 RM40 预留的装修。这些都是估算。',
                'Cash to enter = down payment + SPA and loan-agreement stamp duty + legal fees (estimated on the commonly published solicitors’ scale, plus 8% SST) + a RM40 per sqft renovation allowance. These are estimates.')}</li>
              <li>{t('楼盘回报分满分 10 分，只看楼盘本身：租售比（参考毛回报）最多 4 分（3% 得 0 分，6% 或以上得满分），与同区域已建成楼盘毛回报中位相比最多 2 分（不含组屋和租盘少于 3 则的楼盘；持平得 1 分，高或低 2 个百分点到满分或 0 分），可比租盘样本数量最多 1 分（同面积段 20 则以上得满分，样本不足改用区域中位则只得 0.2 分），合计换算成 10 分。它不随你的贷款成数变化：你借多少影响的是每月现金流，见上面的结论。评分用表价，不会编造缺失的价格或租金。',
                'The project score is out of 10 and describes the project only: up to 4 points for rent-to-price (indicative gross; 3% scores 0, 6% or more scores 4), up to 2 points versus the area’s completed-project median gross yield (excluding low-cost flats and projects with fewer than 3 rent ads; in line scores 1, ±2 percentage points reach 2 or 0), and up to 1 point for comparable-rent sample size (a size band of 20+ ads scores 1; an area-median fallback scores 0.2), scaled to 10. It does not move with your loan percentage: how much you borrow changes the monthly cash flow shown in the summary above. The score uses the list price. Missing prices or rents are not invented.')}</li>
              <li>{t('交房前利息：假设银行按施工进度放款，已完成的部分现在就放，其余到交房前平均放出，所以平均欠款 ≈ 贷款 ×（进度 +（1 − 进度）÷ 2）。这是粗估，实际按发展商的进度款时间表。',
                'Interest before handover: the bank is assumed to release the loan with construction — what is built now is drawn now, the rest evenly until handover — so the average balance ≈ loan × (progress + (1 − progress) ÷ 2). A rough estimate; the developer’s billing schedule decides the real figure.')}</li>
            </ul>
                        {(p.render?.credit_zh || p.developer_note || p.handover_note || p.handover_note_zh || p.total_units_note || p.total_units_note_zh || p.abdullah_hukum || p.transit?.[0] || p.mid_valley || p.title_note) && (
              <div className="text-[12px] text-slate-500 space-y-1.5">
                {p.render?.credit_zh ? <p>{t('效果图', 'Render')}: {t(p.render.credit_zh, p.render.credit_en)}</p> : null}
                {p.developer_note ? <p>{t('开发商主体是 Kumpulan Gapadu Sdn Bhd，母公司为 Malton Berhad。官网和销售邮箱用的是 Malton 名义。', p.developer_note)}</p> : null}
                {(p.handover_note_zh || p.handover_note) ? <p>{t('交房', 'Handover')}: {t(p.handover_note_zh || p.handover_note, p.handover_note)}</p> : null}
                {(p.total_units_note || p.total_units_note_zh) ? <p>{t(p.total_units_note_zh || p.total_units_note, p.total_units_note)}</p> : null}
                {p.transit?.[0] ? <p>{t('轨道交通', 'Transit')}: {t(p.transit[0].zh, p.transit[0].en)}{p.transit[0].official ? ` · ${p.transit[0].official}` : ''}</p> : null}
                {p.abdullah_hukum ? <p>{t('到 Abdullah Hukum LRT：官网写 3.8 km，PropLaunch 写 1.0 km，这里以官网为准并记下差异。', p.abdullah_hukum.note)}</p> : null}
                {p.mid_valley ? <p>{t('到 Mid Valley', 'To Mid Valley')}: {t(p.mid_valley.zh, p.mid_valley.en)}{p.mid_valley.source ? ` · ${p.mid_valley.source}` : ''}</p> : null}
                {p.title_note ? <p>{p.title_note}</p> : null}
              </div>
            )}
            {pricedTyp && <p className="text-[12px] text-slate-500">{t(`区域楼盘租金中位（不含组屋）为 RM${AREA_RENT_PSF.toFixed(2)} psf，仅作对照，户型回报优先用同面积段。`, `The area project-median rent (excluding flats) is RM${AREA_RENT_PSF.toFixed(2)} psf, shown only as a cross-check. Typ yields prefer the same-size band.`)}</p>}
            {p.typologies.some(ty => ty.price_source || ty.price_source_zh) && (
              <div>
                <div className="font-medium text-slate-800">{t('各户型价格来源', 'Price source by unit type')}</div>
                <ul className="mt-1 space-y-1 text-[12px]">
                  {p.typologies.filter(ty => ty.price_source || ty.price_source_zh).map(ty => (
                    <li key={ty.id}><span className="font-medium text-slate-700">{t(ty.type_zh, ty.type)}：</span>{t(ty.price_source_zh || ty.price_source, ty.price_source)}</li>
                  ))}
                </ul>
              </div>
            )}
            {p.sources?.length ? (
              <div>
                <div className="font-medium text-slate-800">{t('资料来源', 'Sources')}</div>
                <ul className="mt-1 space-y-1">
                  {p.sources.map(s => <li key={s.url}><a className="text-slate-800 underline underline-offset-2 hover:text-slate-950" href={s.url} target="_blank" rel="noreferrer">{s.name}</a></li>)}
                </ul>
              </div>
            ) : null}
            <a href="#/map" className="inline-block text-[13px] font-medium text-slate-700 hover:text-slate-950">{t('打开孟沙南已建成楼盘的租金回报地图 →', 'Open the rental-yield map of completed Bangsar South projects →')}</a>
          </div>
        </details>
      </main>
      <Footer />
    </div>
  )
}
