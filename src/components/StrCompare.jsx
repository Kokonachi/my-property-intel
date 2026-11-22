import { STR_META } from '../data/real.js'
import { yieldBand, fmtRM } from '../data/properties.js'
import { useLang } from '../lib/i18n.jsx'

const pct = v => (v == null ? '—' : `${v.toFixed(2)}%`)
const yColor = v => (v == null ? '#64748b' : yieldBand(v).color)
const rm = v => (v == null ? '—' : 'RM ' + Math.round(v).toLocaleString('en-MY'))

export default function StrCompare({ p }) {
  const { t } = useLang()
  const str = p.str
  if (!str) {
    return (
      <section className="card p-5 sm:p-6" data-testid="str-compare">
        <h3 className="font-bold text-slate-900">{t('短租回报（试做）', 'Short-term yield (pilot)')}</h3>
        <p className="mt-2 text-[13px] text-slate-700">{t('未纳入本轮短租试做。本轮覆盖 Bangsar South、KLCC 和 First Subang（SS15）一带的楼盘。', 'Not in this short-term pilot. This round covers Bangsar South, KLCC and the First Subang (SS15) cluster.')}</p>
      </section>
    )
  }

  const ok = str.status === 'ok'
  const occPct = str.occ != null ? `${Math.round(str.occ * 100)}%` : '—'
  const occNote = t('区域假设，非日历入住率（Airbnb 日历接口目前不可用）', 'Area assumption, not calendar occupancy (Airbnb calendar endpoint is currently unavailable)')

  return (
    <section className="card p-5 sm:p-6" data-testid="str-compare">
      <h3 className="font-bold text-slate-900">{t('短租回报（试做）', 'Short-term yield (pilot)')}</h3>
      <p className="mt-1 text-[12px] text-slate-600">{t('与长租分开计算，不混在同一个数字里。仅统计 Airbnb 整套房源，已排除单间/合租。', 'Shown separately from long-term yield. Entire-place Airbnb listings only; private/shared rooms are excluded.')}</p>

      {ok ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3 bg-slate-50">
            <div className="text-[12px] text-slate-600">{t('长租', 'Long-term')}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-bold tabular-nums" style={{ color: yColor(p.gross) }}>{pct(p.gross)} <span className="font-normal text-slate-600">{t('毛', 'Gross')}</span></span>
              <span className="font-bold tabular-nums" style={{ color: yColor(p.net) }}>{pct(p.net)} <span className="font-normal text-slate-600">{t('净', 'Net')}</span></span>
            </div>
            <div className="text-[12px] text-slate-600 mt-1">{t('按整套长租广告中位数', 'Median of whole-unit long-term ads')}</div>
          </div>
          <div className="rounded-2xl p-3 text-white" style={{ background: yColor(str.gross) }}>
            <div className="text-[12px] opacity-90">{t('短租', 'Short-term')}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-extrabold tabular-nums text-lg leading-tight">{pct(str.gross)} <span className="font-normal text-[12px] opacity-90">{t('毛', 'Gross')}</span></span>
              <span className="font-extrabold tabular-nums text-lg leading-tight">{pct(str.net)} <span className="font-normal text-[12px] opacity-90">{t('净', 'Net')}</span></span>
            </div>
            <div className="text-[12px] opacity-90 mt-1">{t(`${str.n} 个整套房源 · 中位每晚 ${fmtRM(str.adr)} · 入住率 ${occPct}`, `${str.n} entire-place listings · median ${fmtRM(str.adr)}/night · occupancy ${occPct}`)}</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-800" data-testid="str-insufficient">
          {str.n > 0
            ? t(`短租样本不足：只匹配到 ${str.n} 个整套房源（至少 3 个才计算回报），不硬估一个数字。`, `Not enough short-term samples: only ${str.n} entire-place listing(s) matched (need at least 3). No figure is forced.`)
            : t('短租样本不足：本轮搜索没有匹配到该楼盘的整套 Airbnb 房源，不硬估一个数字。', 'Not enough short-term samples: no entire-place Airbnb listing matched this project in this round. No figure is forced.')}
        </div>
      )}

      <p className="mt-3 text-[12px] text-slate-600">
        {t(`入住率 ${occPct}：${occNote}。费用假设：平台佣金 3%、清洁 RM120/次（按平均 3 晚一订）、水电网 RM400/月、家具按年摊销、代管 20%，再扣门牌税、管理费、地税保险（与长租同一估值基准）。来源：Airbnb 公开搜索，${STR_META.stay || '2026-12-08 至 11，3 晚，2 位成人，MYR，整套'}。`,
          `Occupancy ${occPct}: ${occNote}. Cost assumptions: 3% platform fee, RM120 cleaning per stay (avg 3-night stay), RM400/mo utilities, annual furnishing amortisation, 20% management, plus assessment, maintenance and quit rent/insurance on the same value basis as long-term yield. Source: public Airbnb search, ${STR_META.stay || '8–11 Dec 2026, 3 nights, 2 adults, MYR, entire home'}.`)}
      </p>

      {ok && str.costs && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12px] text-slate-700">
            <thead><tr className="text-slate-600 text-left"><th className="py-1 font-medium">{t('短租费用（年）', 'Short-term costs (yearly)')}</th><th className="py-1 font-medium text-right">RM</th></tr></thead>
            <tbody>
              {[
                [t('平台佣金 3%', 'Platform fee 3%'), str.costs.platform],
                [t('清洁', 'Cleaning'), str.costs.cleaning],
                [t('水电与网络', 'Utilities & wifi'), str.costs.utilities],
                [t('家具摊销', 'Furnishing amortisation'), str.costs.furnish],
                [t('代管 20%', 'Management 20%'), str.costs.management],
                [t('门牌税', 'Assessment'), str.costs.assessment],
                [t('管理费 + 偿债基金', 'Maintenance + sinking fund'), str.costs.maintenance],
                [t('地税、保险', 'Quit rent, insurance'), str.costs.quit_rent_insurance],
              ].map(([label, amt]) => (
                <tr key={label} className="border-t border-slate-100"><td className="py-1">{label}</td><td className="py-1 text-right tabular-nums">{rm(amt)}</td></tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold text-slate-900"><td className="py-1">{t('合计', 'Total')}</td><td className="py-1 text-right tabular-nums">{rm(str.costs.total)}</td></tr>
              <tr><td className="py-1">{t('短租年收入（估）', 'Estimated STR revenue')}</td><td className="py-1 text-right tabular-nums">{rm(str.revenue)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
