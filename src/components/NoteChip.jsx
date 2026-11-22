import { useState } from 'react'

/** Subtle muted chip that expands a short note on tap. */
export function NoteChip({ label, children, testId, className = '' }) {
  const [open, setOpen] = useState(false)
  if (!children) return null
  return (
    <div className={className}>
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5"
      >
        <span>{label}</span>
        <span className="text-slate-400 text-[10px] leading-none" aria-hidden="true">{open ? '▴' : 'i'}</span>
      </button>
      {open && (
        <div className="mt-1.5 text-[12px] leading-snug text-slate-500" data-testid={testId ? `${testId}-note` : undefined}>
          {children}
        </div>
      )}
    </div>
  )
}
