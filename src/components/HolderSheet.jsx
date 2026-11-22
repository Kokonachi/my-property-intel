import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../lib/i18n.jsx'
import {
  HOLD_MAX, HOLD_MIN, CITIES, DEFAULT_CITY, SEGMENTS, cityById,
  useHolder, completeOnboarding, openHolderEditor, resetOnboarding,
} from '../lib/holderProfile.js'
import { parseMoney } from '../lib/mortgage.js'
import { IconInfo, IconKey, IconCalendar, IconHouse } from './icons.jsx'

function bandOf(count) {
  if (count == null) return null
  if (count <= 0) return 'zero'
  if (count <= 2) return 'few'
  return 'many'
}

function MoneyField({ testId, label, hint, value, onChange, placeholder }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <div className="text-[12px] text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[13px] font-medium text-slate-400">RM</span>
        <input
          data-testid={testId}
          inputMode="decimal"
          className="w-full bg-transparent outline-none text-[22px] font-semibold tabular-nums text-slate-900 tracking-tight"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {hint ? <div className="mt-1 text-[11px] text-slate-400 leading-snug">{hint}</div> : null}
    </label>
  )
}

function StepDots({ step, t, isZero }) {
  const steps = isZero ? ['count', 'budget', 'city'] : ['count', 'city']
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {steps.map(s => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${s === step ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-300'}`}
        />
      ))}
      <span className="sr-only">{t(`第 ${steps.indexOf(step) + 1} 步，共 ${steps.length} 步`, `Step ${steps.indexOf(step) + 1} of ${steps.length}`)}</span>
    </div>
  )
}

export function HolderSheet({ open, onClose, initial, firstVisit = false }) {
  const { t } = useLang()
  const [count, setCount] = useState(0)
  const [rent, setRent] = useState('')
  const [salary, setSalary] = useState('')
  const [city, setCity] = useState(DEFAULT_CITY)
  const [step, setStep] = useState('count')

  useEffect(() => {
    if (!open) return
    const hasCount = initial && !initial.skipped && initial.count != null
    setCount(hasCount ? initial.count : 0)
    setRent(initial?.currentRent != null ? String(Math.round(initial.currentRent)) : '')
    setSalary(initial?.salary != null ? String(Math.round(initial.salary)) : '')
    setCity(initial?.city || DEFAULT_CITY)
    setStep('count')
  }, [open, initial])

  if (!open) return null

  const band = bandOf(count)
  const isZero = band === 'zero'
  const bump = d => setCount(c => Math.min(HOLD_MAX, Math.max(HOLD_MIN, c + d)))

  const save = (opts = {}) => {
    completeOnboarding({
      count,
      skipped: !!opts.skipped,
      currentRent: isZero && !opts.skipped ? parseMoney(rent) : null,
      salary: isZero && !opts.skipped ? parseMoney(salary) : null,
      city: city || DEFAULT_CITY,
    })
    onClose?.()
  }

  const goNextFromCount = () => setStep(isZero ? 'budget' : 'city')

  const restart = () => {
    resetOnboarding()
    setCount(0)
    setRent('')
    setSalary('')
    setCity(DEFAULT_CITY)
    setStep('count')
    onClose?.()
  }

  const sheet = (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" data-testid="holder-sheet">
      <div className="absolute inset-0 z-0 bg-slate-900/40" role="presentation" onClick={() => (firstVisit ? null : onClose?.())} />
      <div className="relative z-10 w-full min-w-0 max-w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className={`relative mb-2 ${firstVisit ? 'h-4 sm:h-0' : 'h-8'}`}>
          <div className="absolute inset-x-0 top-1.5 flex justify-center pointer-events-none">
            <div className="h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          </div>
          {!firstVisit && (
            <button type="button" data-testid="hold-restart" onClick={restart}
              className="absolute right-0 top-0 z-10 h-8 whitespace-nowrap text-[13px] font-medium text-slate-500">
              {t('重新选择', 'Start over')}
            </button>
          )}
        </div>
        <StepDots step={step} t={t} isZero={isZero} />

        {step === 'count' && (
          <>
            <h2 className="mt-3 text-[18px] font-semibold text-slate-900 tracking-tight">{t('你目前持有几套房产？', 'How many properties do you hold now?')}</h2>
            <p className="mt-1 text-[13px] text-slate-500 leading-snug">{t('我们会按这个数字调整你看到的内容。可以随时在顶部修改。', 'We’ll tailor what you see. You can change this later from the top of the page.')}</p>
            <div className="mt-5 flex items-center justify-center gap-4">
              <button type="button" data-testid="hold-minus" onClick={() => bump(-1)} disabled={count <= HOLD_MIN}
                className="h-11 w-11 rounded-full border border-slate-200 text-xl text-slate-700 disabled:text-slate-300 disabled:border-slate-100">−</button>
              <div className="min-w-[6.5rem] text-center">
                <div className="text-[52px] font-semibold tabular-nums leading-none tracking-tight text-slate-900" data-testid="hold-count">{count}</div>
                <div className="mt-1 text-[12px] text-slate-500">{t('套', 'properties')}</div>
              </div>
              <button type="button" data-testid="hold-plus" onClick={() => bump(1)} disabled={count >= HOLD_MAX}
                className="h-11 w-11 rounded-full border border-slate-200 text-xl text-slate-700 disabled:text-slate-300 disabled:border-slate-100">+</button>
            </div>
            <input type="range" min={HOLD_MIN} max={HOLD_MAX} value={count} data-testid="hold-slider"
              onChange={e => setCount(Number(e.target.value))}
              className="mt-5 w-full accent-slate-900" />
            <div className="mt-4 rounded-2xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600 leading-snug" data-testid="hold-hint">
              {band === 'zero' && t('先看买不买得起：入场要准备多少钱、月供和你现在的租金、工资怎么比。', 'We’ll start with affordability: cash to enter, and how the instalment compares with your rent and salary.')}
              {band === 'few' && t('会按投资评分排列，并对照月供和区域已建成楼盘。', 'We’ll rank by investment score, and compare instalments with completed projects in the area.')}
              {band === 'many' && t('会按净回报排列，卡片更紧凑，并可以对比多个项目。', 'We’ll rank by net yield, keep the cards compact, and let you compare projects.')}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" data-testid="hold-skip" onClick={() => save({ skipped: true })}
                className="text-[13px] font-medium text-slate-500">{t('跳过', 'Skip')}</button>
              <button type="button" data-testid="hold-continue" onClick={goNextFromCount}
                className="ml-auto h-11 px-5 rounded-full bg-slate-900 text-white text-[14px] font-medium">{t('继续', 'Continue')}</button>
            </div>
          </>
        )}

        {step === 'budget' && (
          <>
            <h2 className="mt-3 text-[18px] font-semibold text-slate-900 tracking-tight">{t('你现在的租金和工资是多少？', 'What do you pay in rent now, and what is your monthly salary?')}</h2>
            <p className="mt-1 text-[13px] text-slate-500 leading-snug">{t('都可以先不填，稍后也能补上。填了以后，我们会用白话告诉你月供高了还是低了。', 'Both are optional, and you can add them later. If you enter them, we’ll say in plain words how the instalment compares.')}</p>
            <div className="mt-4 space-y-3">
              <MoneyField testId="hold-rent" label={t('现在每月租金', 'Current monthly rent')}
                placeholder="2,500" value={rent} onChange={setRent} />
              <MoneyField testId="hold-salary" label={t('每月工资', 'Monthly salary')}
                placeholder="8,000" value={salary} onChange={setSalary} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" data-testid="hold-back" onClick={() => setStep('count')}
                className="text-[13px] font-medium text-slate-500">{t('返回', 'Back')}</button>
              <button type="button" data-testid="hold-budget-skip" onClick={() => { setRent(''); setSalary(''); setStep('city') }}
                className="text-[13px] font-medium text-slate-500">{t('跳过', 'Skip')}</button>
              <button type="button" data-testid="hold-budget-continue" onClick={() => setStep('city')}
                className="ml-auto h-11 px-5 rounded-full bg-slate-900 text-white text-[14px] font-medium">{t('继续', 'Continue')}</button>
            </div>
          </>
        )}

        {step === 'city' && (
          <>
            <h2 className="mt-3 text-[18px] font-semibold text-slate-900 tracking-tight">{t('你想看哪个城市？', 'Which city do you want to look at?')}</h2>
            <p className="mt-1 text-[13px] text-slate-500 leading-snug">{t('目前已有孟沙南的新楼盘数据，其他城市正在准备。', 'We currently have new-launch data for Bangsar South. Other cities are on the way.')}</p>
            <div className="mt-4 grid gap-2" data-testid="hold-cities">
              {CITIES.map(c => {
                const on = city === c.id
                const disabled = !c.available
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-testid={`hold-city-${c.id}`}
                    disabled={disabled}
                    onClick={() => setCity(c.id)}
                    className={`text-left rounded-2xl border px-3.5 py-3 transition ${
                      disabled
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : on
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold">{t(c.zh, c.en)}</span>
                      {disabled ? (
                        <span className={`text-[11px] font-medium ${on ? 'text-white/70' : 'text-slate-400'}`}>{t('即将推出', 'Coming soon')}</span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" data-testid="hold-back" onClick={() => setStep(isZero ? 'budget' : 'count')}
                className="text-[13px] font-medium text-slate-500">{t('返回', 'Back')}</button>
              <button type="button" data-testid="hold-finish" onClick={() => save()}
                className="ml-auto h-11 px-5 rounded-full bg-slate-900 text-white text-[14px] font-medium">{t('查看楼盘', 'See launches')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

export function RestartButton({ className = '' }) {
  const { t } = useLang()
  const { holder } = useHolder()
  if (!holder.asked) return null
  return (
    <button
      type="button"
      data-testid="hold-restart-home"
      onClick={() => resetOnboarding()}
      className={`text-[12px] font-medium text-slate-500 hover:text-slate-800 ${className}`}
    >
      {t('重新选择', 'Start over')}
    </button>
  )
}

export function HoldChip() {
  const { t, lang } = useLang()
  const { holder } = useHolder()
  const [open, setOpen] = useState(false)
  const label = holder.skipped || holder.count == null
    ? t('持有房产', 'Holdings')
    : t(`持有 ${holder.count} 套`, holder.count === 1 ? 'Holds 1' : `Holds ${holder.count}`)
  const city = cityById(holder.city)
  const cityBit = city ? (lang === 'zh' ? city.shortZh : city.shortEn) : null
  return (
    <>
      <button type="button" data-testid="hold-chip" onClick={() => { setOpen(true); openHolderEditor() }}
        className="shrink-0 max-w-[8.5rem] sm:max-w-[11rem] truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700">
        {label}{cityBit ? <span className="hidden sm:inline text-slate-400"> · {cityBit}</span> : null}
      </button>
      <HolderSheet open={open} onClose={() => setOpen(false)} initial={holder} />
    </>
  )
}

export function FirstBuyerNote({ compact = false } = {}) {
  const { t } = useLang()
  const items = [
    { icon: IconKey, text: t('入场要准备的钱 = 首付 + 律师费和印花税（估算）+ 装修预留。', 'Cash to enter = down payment + estimated legal fees and stamp duty + a renovation allowance.') },
    { icon: IconCalendar, text: t('月供是按你选定的贷款成数、利率和年期估算的，不是银行批复的数字。', 'The instalment is an estimate from the loan percentage, rate and tenure you chose — not a bank offer.') },
    { icon: IconHouse, text: t('毛回报是一年预估租金除以房价；净回报还要再扣空置、管理费、门牌税、地税和保险。', 'Gross yield is a year’s estimated rent divided by the price; net yield also subtracts vacancy, maintenance, assessment, and quit rent plus insurance.') },
  ]
  return (
    <details className={compact ? 'relative' : 'rounded-2xl bg-white ring-1 ring-slate-200/80 px-4 py-3'} data-testid="first-buyer-note">
      <summary className={`cursor-pointer list-none flex items-center ${compact ? 'justify-center h-8 w-8 rounded-full ring-1 ring-slate-200 bg-white text-slate-500 hover:text-slate-800' : 'justify-between gap-3 text-[13px] font-medium text-slate-800'}`} aria-label={t('说明', 'About')}>
        {compact ? <IconInfo size={16} /> : (
          <>
            <span>{t('第一次买房，先看这三件事', 'Buying for the first time? Start with these three things')}</span>
            <span className="text-slate-400 text-[12px] font-medium">{t('说明', 'About')}</span>
          </>
        )}
      </summary>
      <div className={compact
        ? 'absolute left-0 top-9 z-20 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-[0_8px_24px_rgba(15,23,42,.12)] space-y-2'
        : 'mt-2 space-y-1.5 text-[13px] text-slate-600 leading-snug border-t border-slate-100 pt-2'}>
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[13px] text-slate-600 leading-snug">
            <item.icon size={15} className="shrink-0 mt-0.5 text-slate-500" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

export function OnboardingHost() {
  const { holder } = useHolder()
  const [open, setOpen] = useState(() => !holder.asked)
  useEffect(() => {
    if (!holder.asked) setOpen(true)
  }, [holder.asked])
  return <HolderSheet open={open} onClose={() => setOpen(false)} initial={holder} firstVisit={!holder.asked} />
}
