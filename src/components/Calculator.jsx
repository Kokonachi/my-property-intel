import { useMemo, useState } from 'react'
import { fmtRM } from '../data/properties.js'
import { useLang } from '../lib/i18n.jsx'

function Field({ label, sub, value, onChange, step = 1, suffix, prefix }) {
  return (
    <label className="block">
      <div className="text-[12px] text-slate-600 mb-1">{label}</div>
      {sub && <div className="text-[12px] text-slate-500 -mt-0.5 mb-1">{sub}</div>}
      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white px-3">
        {prefix && <span className="text-xs text-slate-500 mr-1">{prefix}</span>}
        <input type="number" step={step} value={value} onChange={e => onChange(+e.target.value)} className="w-full bg-transparent py-2 text-sm font-semibold outline-none" />
        {suffix && <span className="text-xs text-slate-500 ml-1">{suffix}</span>}
      </div>
    </label>
  )
}

function MoneyField({ label, value, onChange }) {
  const [focused, setFocused] = useState(false)
  const raw = value == null || Number.isNaN(value) ? '' : String(value)
  const display = focused ? raw : (raw === '' ? '' : Number(value).toLocaleString('en-MY'))
  return (
    <label className="block">
      <div className="text-[12px] text-slate-600 mb-1">{label}</div>
      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white px-3">
        <span className="text-xs text-slate-500 mr-1">RM</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => {
            const s = e.target.value.replace(/,/g, '').trim()
            if (s === '' || s === '-') { onChange(0); return }
            const n = Number(s)
            if (!Number.isNaN(n)) onChange(n)
          }}
          className="w-full bg-transparent py-2 text-sm font-semibold outline-none"
        />
      </div>
    </label>
  )
}

export default function Calculator({ p }) {
  const { t } = useLang()
  const [price, setPrice] = useState(p.price)
  const [ltv, setLtv] = useState(80)
  const [rate, setRate] = useState(4.0)
  const [years, setYears] = useState(35)
  const [rent, setRent] = useState(p.rent)
  const [maint, setMaint] = useState(p.maint)
  const [other, setOther] = useState(Math.round(p.otherCosts / 12))
  const [vac, setVac] = useState(8.3)

  const r = useMemo(() => {
    const loan = price * ltv / 100
    const i = rate / 100 / 12, n = years * 12
    const inst = i ? loan * i / (1 - Math.pow(1 + i, -n)) : (n ? loan / n : 0)
    const effRent = rent * (1 - vac / 100)
    const cash = effRent - inst - maint - other
    const upfront = price - loan + price * 0.04 // downpayment + approx. legal fees & stamp duty
    const gross = price ? rent * 12 / price * 100 : 0
    const net = price ? (effRent - maint - other) * 12 / price * 100 : 0
    const coc = upfront ? cash * 12 / upfront * 100 : 0
    return { loan, inst, cash, upfront, gross, net, coc }
  }, [price, ltv, rate, years, rent, maint, other, vac])

  const pos = r.cash >= 0
  return (
    <div className="card p-5 sm:p-6" data-testid="calculator">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900">{t('投资回报计算器', 'ROI / cash-flow calculator')}</h3>
          <div className="text-[12px] text-slate-600">{t('默认值按一个典型单位估算，贷款比例 80% 为假设，可自行修改', 'Defaults are for one typical unit; 80% LTV is an assumption — edit freely')}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MoneyField label={t('房价', 'Price')} value={price} onChange={setPrice} />
        <Field label={t('贷款比例（假设）', 'Loan-to-value (assumed)')} suffix="%" value={ltv} onChange={setLtv} />
        <Field label={t('利率', 'Interest rate')} suffix="% p.a." value={rate} onChange={setRate} step={0.05} />
        <Field label={t('贷款年限', 'Loan tenure')} suffix={t('年', 'yrs')} value={years} onChange={setYears} />
        <MoneyField label={t('月租', 'Rent / month')} value={rent} onChange={setRent} />
        <MoneyField label={t('管理费（月）', 'Maintenance / month')} value={maint} onChange={setMaint} />
        <MoneyField label={t('地税、门牌税、保险（估算/月）', 'Quit rent, assessment, insurance (est.) / mo')} value={other} onChange={setOther} />
        <Field label={t('空置率', 'Vacancy')} suffix="%" value={vac} onChange={setVac} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        <div className={`rounded-2xl p-4 ${pos ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div className="text-[12px] text-slate-600">{t('每月现金流', 'Monthly cash flow')}</div>
          <div className={`text-2xl font-extrabold mt-1 ${pos ? 'text-emerald-600' : 'text-rose-600'}`} data-testid="cashflow">{pos ? '+' : '−'}{fmtRM(Math.abs(r.cash))}</div>
        </div>
        <div className="rounded-2xl p-4 bg-blue-50">
          <div className="text-[12px] text-slate-600">{t('月供', 'Installment')}</div>
          <div className="text-2xl font-extrabold mt-1 text-blue-700">{fmtRM(r.inst)}</div>
        </div>
        <div className="rounded-2xl p-4 bg-slate-50">
          <div className="text-[12px] text-slate-600">{t('毛 / 净回报', 'Gross / net yield')}</div>
          <div className="text-2xl font-extrabold mt-1 text-slate-800">{r.gross.toFixed(2)}% <span className="text-base text-slate-600">/ {r.net.toFixed(2)}%</span></div>
        </div>
        <div className="rounded-2xl p-4 bg-slate-50" data-testid="upfront">
          <div className="text-[12px] text-slate-600">{t('首付+杂费', 'Upfront (down + costs)')}</div>
          <div className="text-2xl font-extrabold mt-1 text-slate-800">{fmtRM(r.upfront)}</div>
        </div>
        <div className="rounded-2xl p-4 bg-slate-50 col-span-2 lg:col-span-1" data-testid="cash-on-cash">
          <div className="text-[12px] text-slate-600">{t('现金回报', 'Cash-on-cash')}</div>
          <div className={`text-2xl font-extrabold mt-1 ${r.coc >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.coc.toFixed(1)}%</div>
        </div>
      </div>
      <p className="text-[12px] text-slate-600 mt-3">{t('※ 首付+杂费 = 首付 + 约 4% 律师费及印花税估算。计算仅供参考。', '※ Upfront = down payment + ~4% est. legal fees & stamp duty. Indicative only.')}</p>
    </div>
  )
}
