import { useLang } from '../lib/i18n.jsx'
import { fmtRM } from '../data/properties.js'
import { scoreBand } from '../lib/launchScore.js'
import { COMPARE_MAX } from '../lib/compareDraft.js'

const rm = v => (v == null || Number.isNaN(v) ? '—' : fmtRM(v))

export function CompareTable({ items, onClose, onRemove, onClear }) {
  const { t } = useLang()
  if (!items?.length) return null

  const rows = [
    { key: 'price', label: t('表价起', 'List from'), render: it => it.s.price ? rm(it.s.price) : '—' },
    { key: 'psf', label: t('每尺价', 'Price psf'), render: it => it.s.psf ? `RM${Math.round(it.s.psf).toLocaleString('en-MY')}` : '—' },
    { key: 'net', label: t('净回报', 'Net yield'), render: it => it.s.yields?.net != null ? `${it.s.yields.net.toFixed(2)}%` : '—' },
    { key: 'gross', label: t('毛回报', 'Gross yield'), render: it => it.s.yields?.gross != null ? `${it.s.yields.gross.toFixed(2)}%` : '—' },
    { key: 'score', label: t('评分', 'Score'), render: it => {
      if (it.s.score == null) return '—'
      const b = scoreBand(it.s.score)
      return `${it.s.score.toFixed(1)} · ${t(b.zh, b.en)}`
    } },
    { key: 'inst', label: t('月供', 'Instalment'), render: it => it.s.v?.inst != null ? `${rm(it.s.v.inst)}${t('/月', '/mo')}` : '—' },
    { key: 'cash', label: t('每月净现金流', 'Net cash flow'), render: it => {
      const c = it.s.v?.cash
      if (c == null) return '—'
      const n = Math.round(c)
      return n >= 0 ? t(`每月剩 ${fmtRM(n)}`, `${fmtRM(n)} /mo left`) : t(`每月补 ${fmtRM(Math.abs(n))}`, `${fmtRM(Math.abs(n))} /mo short`)
    } },
    { key: 'down', label: t('首付', 'Down payment'), render: it => it.s.down != null ? rm(it.s.down) : '—' },
    { key: 'comps', label: t('可比租盘', 'Rent comps'), render: it => it.s.bandN ? t(`${it.s.bandN} 则`, `${it.s.bandN} ads`) : '—' },
    { key: 'vp', label: t('交房', 'Handover'), render: it => it.p.expected_completion_year || '—' },
    { key: 'tenure', label: t('地契', 'Tenure'), render: it => /freehold/i.test(it.p.tenure) ? t('永久地契', 'Freehold') : t('99年租契', it.p.tenure_short || '99-year leasehold') },
  ]

  return (
    <div className="fixed inset-0 z-[1900] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" data-testid="compare-sheet">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label={t('关闭', 'Close')} onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl sm:mx-4 max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
          <div>
            <div className="text-[16px] font-semibold text-slate-900">{t('项目对比', 'Compare projects')}</div>
            <div className="text-[12px] text-slate-500 mt-0.5">{t(`最多 ${COMPARE_MAX} 个`, `Up to ${COMPARE_MAX}`)}</div>
          </div>
          <div className="flex items-center gap-2">
            {onClear ? (
              <button type="button" data-testid="compare-clear" onClick={onClear} className="text-[13px] font-medium text-slate-500">{t('清除', 'Clear')}</button>
            ) : null}
            <button type="button" data-testid="compare-close" onClick={onClose} className="text-[13px] font-medium text-slate-700">{t('关闭', 'Close')}</button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto" data-testid="compare-table-scroll">
          <table className="min-w-[36rem] w-full text-[13px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left font-medium text-slate-400 w-28 px-4 py-3 border-b border-slate-100" />
                {items.map(it => {
                  const photo = it.p.render?.card || it.p.render?.pin || it.p.render?.src
                  return (
                    <th key={it.p.id} className="align-bottom text-left font-semibold text-slate-900 px-3 py-3 border-b border-slate-100 min-w-[10.5rem]">
                      <div className="h-16 w-full rounded-lg overflow-hidden bg-slate-100 mb-2">
                        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <a href={`#/launch/${it.p.id}`} className="hover:underline" onClick={onClose}>{it.p.card_name || it.p.name}</a>
                      {onRemove ? (
                        <button type="button" className="block mt-1 text-[11px] font-medium text-slate-400" onClick={() => onRemove(it.p.id)}>
                          {t('去掉', 'Remove')}
                        </button>
                      ) : null}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key} className={i % 2 ? 'bg-slate-50/80' : 'bg-white'}>
                  <th className={`sticky left-0 z-10 text-left font-medium text-slate-500 px-4 py-2.5 whitespace-nowrap ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>{row.label}</th>
                  {items.map(it => (
                    <td key={it.p.id} className="px-3 py-2.5 tabular-nums text-slate-800 whitespace-nowrap">{row.render(it)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function CompareBar({ count, ready, onOpen, onClear }) {
  const { t } = useLang()
  if (count < 1) return null
  return (
    <div className="sticky bottom-3 z-40 mx-auto max-w-xl px-1" data-testid="compare-bar">
      <div className="flex items-center gap-2 rounded-full bg-slate-900 text-white shadow-lg px-2 py-1.5 pl-4">
        <div className="text-[13px] font-medium">{t(`已选 ${count} 个`, count === 1 ? '1 selected' : `${count} selected`)}</div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" data-testid="compare-bar-clear" onClick={onClear} className="h-9 px-3 rounded-full text-[12px] font-medium text-white/70">{t('清除', 'Clear')}</button>
          <button type="button" data-testid="compare-bar-open" disabled={!ready} onClick={onOpen}
            className="h-9 px-4 rounded-full bg-white text-slate-900 text-[13px] font-medium disabled:bg-white/40 disabled:text-slate-500">
            {t('对比', 'Compare')}
          </button>
        </div>
      </div>
    </div>
  )
}
