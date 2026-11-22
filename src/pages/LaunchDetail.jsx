import { useMemo, useState } from 'react'
import { AppNav } from '../components/AppNav.jsx'
import { Footer } from '../components/ui.jsx'
import { useLang } from '../lib/i18n.jsx'
import { typRentPsf, AREA_RENT_PSF } from '../data/launches.js'
import { typYields, workingPrice, discountToTargetGross } from '../lib/launchYield.js'
import { fmtRM, yieldBand } from '../data/properties.js'
import { LtvChips, LtvCompare, LoanAssumptionsBar } from '../components/LtvVerdict.jsx'
import { useLoanAssumptions } from '../lib/loanAssumptions.js'
import { launchScore, scoreBand, SCORE_WEIGHTS } from '../lib/launchScore.js'

const pct = v => (v == null || Number.isNaN(v) ? '—' : `${v.toFixed(2)}%`)
const rm = v => (v == null || Number.isNaN(v) ? '—' : fmtRM(v))
const yColor = v => (v == null ? '#64748b' : yieldBand(v).color)

function roomsLabel(beds, t) {
  if (beds == null) return null
  if (beds <= 0) return t('套房', 'Studio')
  return t(`${beds} 房`, beds === 1 ? '1 bed' : `${beds} beds`)
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-slate-500">{label}</div>
      <div className="text-[13px] sm:text-[14px] font-semibold text-slate-900 leading-snug mt-0.5">{children}</div>
    </div>
  )
}

function TypCard({ p, typ, t, draft, onChange }) {
  const { psf, source, band } = typRentPsf(typ)
  const list = typ.price_from
  const after = workingPrice({ listPrice: list, mode: draft.mode, pct: draft.pct, netPrice: draft.price })
  const before = list ? typYields({ size: typ.size, price: list, rentPsf: psf, maintPsf: p.maint_psf }) : null
  const afterY = after ? typYields({ size: typ.size, price: after, rentPsf: psf, maintPsf: p.maint_psf }) : null
  const discounted = after && list && Math.abs(after - list) > 1
  const t5 = list && psf ? discountToTargetGross(list, typ.size, psf, 5) : null
  const t6 = list && psf ? discountToTargetGross(list, typ.size, psf, 6) : null
  const impliedRent = psf && typ.size ? psf * typ.size : null

  return (
    <section className="card p-4 sm:p-5" data-testid={`typ-${typ.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-slate-500">{typ.tower}</div>
          <h3 className="font-extrabold text-slate-900 leading-snug">{t(typ.type_zh, typ.type)}</h3>
          <div className="text-[13px] text-slate-600 mt-0.5">
            {[roomsLabel(typ.beds, t), typ.baths ? t(`${typ.baths} 卫`, typ.baths === 1 ? '1 bath' : `${typ.baths} baths`) : null, `${typ.size.toLocaleString()} sqft`, typ.units ? t(`${typ.units} 个单位`, `${typ.units} units`) : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {list ? (
          <div className="text-right shrink-0">
            <div className="text-[12px] text-slate-500">{t('表价起', 'List from')}</div>
            <div className="font-extrabold text-slate-900 tabular-nums">{rm(list)}</div>
            {typ.psf_from ? <div className="text-[12px] text-slate-500">RM{typ.psf_from.toLocaleString('en-MY')} psf</div> : null}
          </div>
        ) : (
          <div className="text-right shrink-0 text-[12px] text-amber-800 font-semibold max-w-[9rem]">{t('公开表价未对上户型', 'No typ-matched list price')}</div>
        )}
      </div>
      {typ.price_to && list && typ.price_to !== list && (
        <div className="text-[12px] text-slate-500 mt-1">{t(`表价区间 ${rm(list)}–${rm(typ.price_to)}，楼层越高通常越贵`, `List range ${rm(list)}–${rm(typ.price_to)}; higher floors usually cost more`)}</div>
      )}
      <p className="text-[12px] text-slate-500 mt-1.5 leading-snug">{t(typ.price_source_zh || typ.price_source, typ.price_source)}</p>

      <LtvChips price={after || list} rentMo={impliedRent} stacked className="mt-2" />

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[11px] text-slate-500">{t('参考月租', 'Indicative rent')}</div>
          <div className="font-bold text-slate-900">{impliedRent ? `${rm(impliedRent)}${t('/月', '/mo')}` : '—'}</div>
          <div className="text-[11px] text-slate-500">RM{psf.toFixed(2)} psf</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[11px] text-slate-500">{source === 'band' ? t(`同面积段（±${band.tol_pct}%，${band.n} 则）`, `Size band ±${band.tol_pct}% · ${band.n} ads`) : t('区域中位（样本不足）', 'Area median (thin sample)')}</div>
          <div className="font-bold" style={{ color: yColor(before?.gross) }}>{pct(before?.gross)}</div>
          <div className="text-[11px] text-slate-500">{t('表价毛回报', 'Gross at list')}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[11px] text-slate-500">{t('表价净回报（估）', 'Net at list (est.)')}</div>
          <div className="font-bold" style={{ color: yColor(before?.net) }}>{pct(before?.net)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <div className="text-[11px] text-slate-500">{t('折扣后毛 / 净', 'After-discount gross / net')}</div>
          <div className="font-bold tabular-nums">
            <span style={{ color: yColor(afterY?.gross) }}>{discounted || !list ? pct(afterY?.gross) : '—'}</span>
            <span className="text-slate-400 font-medium"> / </span>
            <span style={{ color: yColor(afterY?.net) }}>{discounted || !list ? pct(afterY?.net) : '—'}</span>
          </div>
          {discounted && after ? <div className="text-[11px] text-slate-500">{rm(after)}</div> : null}
        </div>
      </div>

      {!band?.sufficient && (
        <p className="mt-2 text-[12px] text-amber-800 leading-snug">
          {t(`附近没有足够的相近面积租盘（±25% 内不足 4 则）。上面的回报改用孟沙南已建成楼盘的租金中位数 RM${psf.toFixed(2)} psf（不含组屋）。`,
            `Not enough nearby listings in the same size band (fewer than 4 ads within ±25%). Yield above uses the Bangsar South completed-project median rent of RM${psf.toFixed(2)} psf, excluding low-cost flats.`)}
          {band?.listings?.length ? t(` 最近的一则：${band.listings[0].project} ${band.listings[0].size} sqft，叫租 ${rm(band.listings[0].rent)}/月。`,
            ` Nearest ad: ${band.listings[0].project} ${band.listings[0].size} sqft, asking ${rm(band.listings[0].rent)}/mo.`) : null}
        </p>
      )}

      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
        <div className="text-[13px] font-semibold text-slate-900">{t('开发商折扣（网上查不到，请填销售报价）', 'Developer discount (not published online — enter the sales quote)')}</div>
        <div className="text-[12px] text-slate-500 mt-0.5">{t('填写后只在本机显示，不会上传。可填折扣百分比，或直接填折后价。', 'Stored only in this browser tab. Enter a percent off, or the after-discount price.')}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {list ? (
            <>
              <label className={`flex-1 min-w-[8rem] rounded-xl border px-3 py-2 ${draft.mode === 'pct' ? 'border-slate-900' : 'border-slate-200'}`}>
                <div className="text-[11px] text-slate-500">{t('折扣 %', 'Discount %')}</div>
                <div className="flex items-center gap-1">
                  <input inputMode="decimal" data-testid={`disc-pct-${typ.id}`} className="w-full bg-transparent outline-none font-semibold tabular-nums"
                    placeholder={t("例如 8", "e.g. 8")} value={draft.mode === 'pct' ? draft.pct : ''}
                    onChange={e => onChange({ mode: 'pct', pct: e.target.value, price: '' })} />
                  <span className="text-slate-400">%</span>
                </div>
              </label>
              <span className="self-center text-[12px] text-slate-400">{t('或', 'or')}</span>
            </>
          ) : null}
          <label className={`flex-[1.3] min-w-[10rem] rounded-xl border px-3 py-2 ${draft.mode === 'price' || !list ? 'border-slate-900' : 'border-slate-200'}`}>
            <div className="text-[11px] text-slate-500">{t('折后价 / 销售报价（RM）', 'Net price / sales quote (RM)')}</div>
            <input inputMode="decimal" data-testid={`disc-price-${typ.id}`} className="w-full bg-transparent outline-none font-semibold tabular-nums"
              placeholder={list ? t(`表价 ${list.toLocaleString("en-MY")}`, `List ${list.toLocaleString("en-MY")}`) : t("例如 850000", "e.g. 850000")}
              value={draft.mode === 'price' ? draft.price : (discounted && after ? String(Math.round(after)) : '')}
              onChange={e => onChange({ mode: 'price', price: e.target.value, pct: '' })} />
          </label>
        </div>
        {discounted && list && afterY && (
          <div className="mt-2 text-[13px] text-slate-700">
            {t(`表价 ${rm(list)} → 折后 ${rm(after)}（少 ${rm(list - after)}，约 ${((1 - after / list) * 100).toFixed(1)}%）· 毛回报 ${pct(before.gross)} → ${pct(afterY.gross)} · 净回报 ${pct(before.net)} → ${pct(afterY.net)}`,
              `List ${rm(list)} → ${rm(after)} after discount (saves ${rm(list - after)}, about ${((1 - after / list) * 100).toFixed(1)}%) · gross ${pct(before.gross)} → ${pct(afterY.gross)} · net ${pct(before.net)} → ${pct(afterY.net)}`)}
          </div>
        )}
        {list && (t5 || t6) && (
          <div className="mt-2 text-[12px] text-slate-600 leading-snug space-y-0.5">
            <div>{t5?.alreadyMet
              ? t('表价毛回报已达到 5%。', 'Gross at list already meets 5%.')
              : t(`要到 5% 毛回报，大约需要 ${t5.discountPct.toFixed(1)}% 折扣（折后约 ${rm(t5.neededPrice)}）。`, `To reach 5% gross, about a ${t5.discountPct.toFixed(1)}% discount (around ${rm(t5.neededPrice)}).`)}</div>
            <div>{t6?.alreadyMet
              ? t('表价毛回报已达到 6%。', 'Gross at list already meets 6%.')
              : t(`要到 6% 毛回报，大约需要 ${t6.discountPct.toFixed(1)}% 折扣（折后约 ${rm(t6.neededPrice)}）。`, `To reach 6% gross, about a ${t6.discountPct.toFixed(1)}% discount (around ${rm(t6.neededPrice)}).`)}</div>
          </div>
        )}
      </div>

      <LtvCompare price={after || list} rentMo={impliedRent} maintMo={(p.maint_psf || 0) * typ.size} />

      {band?.sufficient && (
        <details className="mt-3">
          <summary className="text-[13px] font-semibold text-slate-700 cursor-pointer">{t(`可比租盘 ${band.n} 则（点击展开）`, `${band.n} comparable rent ads (show)`)}</summary>
          <ul className="mt-2 text-[12px] text-slate-600 space-y-1 max-h-48 overflow-y-auto">
            {band.listings.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{s.project} · {s.size.toLocaleString()} sqft{s.rooms ? ` · ${t(`${s.rooms} 房`, `${s.rooms} bed`)}` : ''}</span>
                <span className="shrink-0 tabular-nums">{rm(s.rent)}{t('/月', '/mo')} · RM{s.psf.toFixed(2)} psf</span>
              </li>
            ))}
          </ul>
          <div className="text-[11px] text-slate-500 mt-1">{t(`来源：孟沙南已入图楼盘的 PropertyGuru / Mudah 叫租，已去掉组屋，KL Gateway 重复广告只计一次。`, `Sources: PropertyGuru / Mudah asking rents already in our Bangsar South dataset; low-cost flats removed; duplicate KL Gateway ads counted once.`)}</div>
        </details>
      )}
    </section>
  )
}

export default function LaunchDetail({ p }) {
  const { t } = useLang()
  const { loan } = useLoanAssumptions()
  const [drafts, setDrafts] = useState(() => Object.fromEntries(p.typologies.map(ty => [ty.id, { mode: ty.price_from ? 'pct' : 'price', pct: '', price: '' }])))
  const setDraft = (id, d) => setDrafts(s => ({ ...s, [id]: { ...s[id], ...d } }))

  const entry = useMemo(() => p.typologies.find(ty => ty.price_from), [p])
  const scored = useMemo(() => launchScore(p, { rate: loan.rate, years: loan.years }), [p, loan.rate, loan.years])
  const sBand = scoreBand(scored.score)

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <AppNav active="launches" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-wrap items-center gap-3">
          <a href="#/" className="text-[13px] font-semibold text-blue-700">{t('← 全部新楼盘', '← All new launches')}</a>
          <a href={`#/explore/${p.id}`} className="text-[13px] font-semibold text-blue-700">{t('在地图上看', 'See on the map')}</a>
        </div>

        <div className="card overflow-hidden mt-3">
          {p.render?.src ? (
            <div className="relative aspect-[16/9] bg-slate-200">
              <img src={p.render.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[16/9] bg-slate-800 text-white grid place-items-center px-4">
              <div className="text-center">
                <div className="text-[12px] uppercase tracking-wide text-slate-300">{t('暂无官方效果图', 'No official render yet')}</div>
                <div className="font-bold text-xl mt-1">{p.name}</div>
              </div>
            </div>
          )}
          {p.render?.credit_zh && <div className="px-4 py-1.5 text-[11px] text-slate-500">{t(p.render.credit_zh, p.render.credit_en)}</div>}
        </div>

        <div className="mt-4">
          <div className="text-[12px] font-semibold text-blue-700">{p.area_zh} · {p.area_en}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mt-0.5">{p.name}</h1>
          <p className="text-[14px] text-slate-600 mt-1">{p.developer}{p.developer_parent ? ` · ${p.developer_parent}` : ''}</p>
          {p.developer_note && <p className="text-[12px] text-slate-500 mt-1 leading-snug">{t('开发商主体是 Kumpulan Gapadu Sdn Bhd，母公司为 Malton Berhad。官网和销售邮箱用的是 Malton 名义。', p.developer_note)}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-white border border-slate-100 p-4">
          <Fact label={t('地契', 'Tenure')}>{/freehold/i.test(p.tenure) ? t('永久地契', 'Freehold') : t(p.tenure.replace('Leasehold 99 years (expires 28 July 2118)', '99年租契（至 2118 年 7 月 28 日）'), p.tenure)}</Fact>
          <Fact label={t('交房', 'Handover / VP')}>{t(`${p.expected_completion_year} 年`, String(p.expected_completion_year))}<div className="text-[12px] font-normal text-slate-500 mt-0.5">{t(p.handover_note_zh || p.handover_note, p.handover_note)}</div></Fact>
          <Fact label={t('单位数', 'Units')}>{p.total_units.toLocaleString()}{p.units_left != null ? t(` · 余 ${p.units_left}`, ` · ${p.units_left} left`) : p.units_left_chart != null ? t(` · 价目表余 ${p.units_left_chart}/${p.units_in_current_chart}`, ` · chart ${p.units_left_chart}/${p.units_in_current_chart} left`) : null}</Fact>
          <Fact label={t('管理费', 'Maintenance')}>
            {p.maint_is_published ? t(`RM${p.maint_psf.toFixed(2)} psf/月（已公布，含偿债基金）`, `RM${p.maint_psf.toFixed(2)} psf/mo (published, incl. sinking fund)`)
              : t(`RM${p.maint_psf.toFixed(2)} psf/月（未公布，用孟沙南假设）`, `RM${p.maint_psf.toFixed(2)} psf/mo (not published; Bangsar South assumption)`)}
          </Fact>
          <Fact label={t('轨道交通', 'Transit')}>{p.transit?.[0] ? t(p.transit[0].zh, p.transit[0].en) : '—'}</Fact>
          <Fact label={t('到 Mid Valley', 'To Mid Valley')}>{p.mid_valley ? t(p.mid_valley.zh, p.mid_valley.en) : t('开发商未公布具体距离', 'No published distance')}</Fact>
          <Fact label={t('物业类型', 'Type')}>{t(p.property_type_zh, p.property_type)}</Fact>
          <Fact label={t('开工进度', 'Construction')}>{p.construction_progress_pct == null ? '—' : `${p.construction_progress_pct}%`}</Fact>
        </div>
        {p.total_units_note && <p className="text-[12px] text-slate-500 mt-2 leading-snug">{t(p.total_units_note_zh || p.total_units_note, p.total_units_note)}</p>}
        {p.abdullah_hukum && <p className="text-[12px] text-slate-500 mt-1 leading-snug">{t(`到 Abdullah Hukum LRT：官网写 3.8 km，PropLaunch 写 1.0 km，这里以官网为准并记下差异。`, p.abdullah_hukum.note)}</p>}

        {p.price_conflict && (
          <aside className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4" data-testid="price-conflict">
            <h2 className="font-bold text-slate-900">{t(p.price_conflict.title_zh, p.price_conflict.title_en)}</h2>
            <p className="text-[13px] text-slate-700 mt-1.5 leading-relaxed">{t(p.price_conflict.body_zh, p.price_conflict.body_en)}</p>
          </aside>
        )}

        {p.bumi_discount_pct && (
          <p className="mt-3 text-[13px] text-slate-600 leading-snug">
            {t(`官已公布土著折扣 ${p.bumi_discount_pct}%（须符合资格），和下面你自己填的销售折扣不是同一回事，不会自动套用。`,
              `A published Bumiputera discount of ${p.bumi_discount_pct}% (eligibility rules apply) is separate from the user-entered sales discount below, and is not applied automatically.`)}
          </p>
        )}

        {scored.score != null && (
          <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3" data-testid="launch-score">
            <div className="shrink-0 rounded-2xl px-3 py-2 text-center min-w-[4.5rem]" style={{ background: sBand.color }}>
              <div className="text-white text-[28px] font-black tabular-nums leading-none">{scored.score.toFixed(1)}</div>
              <div className="text-white/90 text-[10px] font-bold mt-0.5">{t(sBand.zh, sBand.en)}</div>
            </div>
            <div className="min-w-0 text-[12px] text-slate-600 leading-snug">
              <div className="font-semibold text-slate-900 text-[13px]">{t('投资评分（表价，可在本页改贷款假设）', 'Investment score (list price; loan assumptions are editable below)')}</div>
              <div className="mt-1 tabular-nums">
                {t('租售比', 'Rent-to-price')} {scored.parts.yield.toFixed(1)}/{SCORE_WEIGHTS.yield}
                <span className="text-slate-300"> · </span>
                {t('贷70%现金流', '70% LTV cash flow')} {scored.parts.cash70.toFixed(1)}/{SCORE_WEIGHTS.cash70}
                <span className="text-slate-300"> · </span>
                {t('对比区域', 'Vs area')} {scored.parts.vsArea.toFixed(1)}/{SCORE_WEIGHTS.vsArea}
                <span className="text-slate-300"> · </span>
                {t('样本可信度', 'Comp confidence')} {scored.parts.confidence.toFixed(1)}/{SCORE_WEIGHTS.confidence}
              </div>
            </div>
          </div>
        )}

        <h2 className="mt-6 font-extrabold text-lg text-slate-900">{t('按户型看回报', 'Yield by unit type')}</h2>
        <p className="text-[13px] text-slate-600 mt-1 leading-snug">
          {t('参考毛回报 = 同面积段叫租中位（每平方尺）× 户型面积 × 12 ÷ 表价。净回报沿用现有算法：减去约 1 个月空置、门牌税（年租 4%）、管理费、地税和保险（公寓按每年 RM250 估）。',
            'Indicative gross = size-band median asking rent psf × typ size × 12 ÷ list price. Net yield uses the existing method: subtract about one month of vacancy, assessment tax (4% of annual rent), maintenance, and quit rent plus insurance (RM250/year for strata).')}
        </p>
        <LoanAssumptionsBar />

        <div className="mt-3 space-y-3">
          {p.typologies.map(typ => (
            <TypCard key={typ.id} p={p} typ={typ} t={t} draft={drafts[typ.id]} onChange={d => setDraft(typ.id, d)} />
          ))}
        </div>

        <section className="card p-4 sm:p-5 mt-4">
          <h2 className="font-bold text-slate-900">{t('设施与位置', 'Facilities and location')}</h2>
          {p.facilities?.map(g => (
            <div key={g.group_en} className="mt-2">
              <div className="text-[13px] font-semibold text-slate-800">{t(g.group_zh, g.group_en)}</div>
              <div className="text-[13px] text-slate-600 leading-relaxed">{t(g.items_zh.join(' · '), g.items_en.join(' · '))}</div>
            </div>
          ))}
          {p.extras && <div className="text-[13px] text-slate-600 mt-2">{p.extras.join(' · ')}</div>}
          <div className="text-[12px] text-slate-500 mt-2">{p.address}</div>
        </section>

        <section className="card p-4 sm:p-5 mt-3">
          <h2 className="font-bold text-slate-900">{t('回报怎么算、有哪些保留', 'How the yield is calculated — and the caveats')}</h2>
          <ul className="mt-2 text-[13px] text-slate-600 space-y-1.5 leading-relaxed list-disc pl-5">
            <li>{t('参考毛回报用的是附近已建成楼盘、接近同一面积的叫租中位数，不是地图上“每条租盘各自算完再取中位”的方法，也不能当成交房后的实际租金。', 'Indicative gross uses the median asking rent psf of nearby completed projects in the same size band. It is not the live map’s per-listing median, and it is not achieved rent after handover.')}</li>
            <li>{t(p.maint_source_zh || p.maint_source, p.maint_source)}</li>
            <li>{t('可比样本已去掉安卡莎布里组屋（租金约 RM1.88 psf，和这类新盘不可比），KL Gateway / Suezcap 的重复广告只计一次。', 'Angkasapuri low-cost flats (about RM1.88 psf) are excluded; duplicate ads under the KL Gateway / Suezcap Brickz records are counted once.')}</li>
            <li>{t('开发商给的议价折扣通常不会挂在网上。本页数字默认是表价；只有你填了销售报价之后，折扣后的回报和月供才会按折后价重算。', 'Negotiated developer discounts are rarely listed online. Figures default to the list price; after-discount yields and instalments appear only after you enter a sales quote.')}</li>
            <li>{t('第1–2套（贷90%）和第3套起（贷70%）的月供用等额本息公式，默认年利率 4.3%、35 年，可在本页修改。这是国行对个人住宅贷款成数的上限：第一、二套最多 90%，第三套起最多 70%。4.3% 是 2026 年 11 月市面常见浮动房贷（约 4.10–4.75%）的中间假设，不是银行批复利率。租金是叫租估算，不是交房后的实收租金。', '1st–2nd-home (90%) and 3rd+ (70%) instalments use a standard amortising formula at a default 4.3% p.a. over 35 years, editable on this page. Those LTVs are Bank Negara’s caps: 90% on a first or second residential loan, 70% from the third. 4.3% is a mid-market assumption among advertised floating packages in November 2026 (about 4.10–4.75%), not a bank offer. Rent is an asking-rent estimate, not achieved rent after handover.')}</li>
            <li>{t('投资评分满分 10 分：租售比（参考毛回报）最多 4 分（3% 得 0 分，6% 或以上得满分），第3套起（贷70%）租金覆盖月供最多 3 分（覆盖率 0.85 得 0 分，1.25 或以上得满分），与同区域已建成楼盘（不含组屋）毛回报中位相比最多 2 分（持平得 1 分，高或低 2 个百分点到满分或 0 分），可比租盘样本数量最多 1 分（同面积段 20 则以上得满分，样本不足改用区域中位则只得 0.2 分）。评分用表价和当前贷款假设，不会编造缺失的价格或租金。', 'The investment score is out of 10: up to 4 points for rent-to-price (indicative gross; 3% scores 0, 6% or more scores 4), up to 3 points for whether asking rent covers a 3rd+ (70% LTV) instalment (coverage 0.85 scores 0, 1.25 or more scores 3), up to 2 points versus the area’s completed-project median gross yield excluding low-cost flats (in line scores 1; ±2 percentage points reach 2 or 0), and up to 1 point for comparable-rent sample size (a size band of 20+ ads scores 1; an area-median fallback scores 0.2). The score uses the list price and the current loan assumptions. Missing prices or rents are not invented.')}</li>
          </ul>
          {entry && <p className="text-[12px] text-slate-500 mt-2">{t(`区域楼盘租金中位（不含组屋）为 RM${AREA_RENT_PSF.toFixed(2)} psf，仅作对照，户型回报优先用同面积段。`, `The area project-median rent (excluding flats) is RM3.75 psf, shown only as a cross-check. Typ yields prefer the same-size band.`)}</p>}
        </section>

        <section className="mt-4">
          <h2 className="font-bold text-slate-900">{t('资料来源', 'Sources')}</h2>
          <ul className="mt-1 text-[13px] space-y-1">
            {p.sources.map(s => <li key={s.url}><a className="text-blue-700 font-medium underline-offset-2 hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.name}</a></li>)}
          </ul>
          <a href="#/map" className="inline-block mt-3 text-[13px] font-semibold text-blue-700">{t('打开孟沙南已建成楼盘的租金回报地图 →', 'Open the rental-yield map of completed Bangsar South projects →')}</a>
        </section>
      </main>
      <Footer />
    </div>
  )
}
