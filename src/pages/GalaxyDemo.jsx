import { useState } from 'react'
import { GalaxyButton, GalaxyCard, GalaxyForm, GalaxyInput } from '../components/galaxy'

export default function GalaxyDemo() {
  const [value, setValue] = useState('')
  const [clicks, setClicks] = useState(0)

  return (
    <main className="min-h-screen bg-[#0f1115] text-zinc-100">
      <header className="px-4 pt-6 pb-4 sm:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Galaxy / Uiverse demo</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Button, card, form, and input</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          These are React wrappers of MIT-licensed snippets from{' '}
          <a className="underline decoration-zinc-600 underline-offset-2 hover:text-white" href="https://github.com/uiverse-io/galaxy" target="_blank" rel="noreferrer">uiverse-io/galaxy</a>.
          This page is a sandbox only — the new-launch and rental-yield pages are unchanged.{' '}
          <a className="underline decoration-zinc-600 underline-offset-2 hover:text-white" href="#/">Back to the site</a>.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 pb-16 sm:px-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-lg font-medium">Button</h2>
          <p className="mt-1 text-sm text-zinc-400">adamgiebl / fluffy-liger-17 — animated gradient.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <GalaxyButton onClick={() => setClicks((n) => n + 1)}>Hover me</GalaxyButton>
            <span className="text-sm text-zinc-400">{clicks ? `${clicks} click${clicks === 1 ? '' : 's'}` : 'Click to confirm it is interactive'}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#1a1430] p-5 sm:p-6">
          <h2 className="text-lg font-medium">Card</h2>
          <p className="mt-1 text-sm text-zinc-400">joe-watson-sbf / honest-bullfrog-6 — glass effect (dark background required).</p>
          <div className="mt-6 flex justify-center">
            <GalaxyCard
              title="GLASS EFFECT"
              name="UIVERSE / GALAXY"
              detail="MIT · scoped CSS module"
              metaLabel="PINNED"
              metaValue="adbd2ad"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-lg font-medium">Input</h2>
          <p className="mt-1 text-sm text-zinc-400">Cksunandh / purple-moose-3 — dark rounded field.</p>
          <div className="mt-6 max-w-xs">
            <GalaxyInput
              placeholder="Username"
              name="username"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="username"
            />
            {value ? <p className="mt-3 text-sm text-zinc-400">Value: {value}</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-200/10 p-5 sm:p-6">
          <h2 className="text-lg font-medium">Form</h2>
          <p className="mt-1 mb-6 text-sm text-zinc-400">gharsh11032000 / nasty-insect-66 — login form, submit is demo-only.</p>
          <div className="flex justify-center">
            <GalaxyForm />
          </div>
        </section>
      </div>
    </main>
  )
}
