import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'night' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: 'light' | 'dark' | 'night'
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const DARK_RULES = `
.dark { color-scheme: dark; }
.dark body { background-color: #1a1a2e !important; color: #c0c8d0 !important; }
.dark .bg-white { background-color: #16213e !important; }
.dark .bg-\\[\\#f3f3f3\\] { background-color: #1a1a2e !important; }
.dark .bg-\\[\\#e8f4fe\\] { background-color: #1e2a4a !important; }
.dark .bg-\\[\\#fef0f0\\] { background-color: #3d1f2a !important; }
.dark .bg-\\[\\#0070d2\\] { background-color: #1e40af !important; }
.dark .bg-slate-50 { background-color: #1a1a2e !important; }
.dark .bg-slate-100 { background-color: #252542 !important; }
.dark .bg-gray-50 { background-color: #1a1a2e !important; }
.dark .bg-gray-100 { background-color: #252542 !important; }
.dark .border-\\[\\#dddbda\\] { border-color: #2a2a4a !important; }
.dark .border-slate-200 { border-color: #2a2a4a !important; }
.dark .border-slate-100 { border-color: #252542 !important; }
.dark .border-gray-200 { border-color: #2a2a4a !important; }
.dark .text-\\[\\#16325c\\] { color: #a0c4ff !important; }
.dark .text-\\[\\#514f4d\\] { color: #c0c8d0 !important; }
.dark .text-\\[\\#0070d2\\] { color: #60a5fa !important; }
.dark .text-\\[\\#007a33\\] { color: #34d399 !important; }
.dark .text-\\[\\#c23934\\] { color: #f87171 !important; }
.dark .text-slate-500 { color: #8899aa !important; }
.dark .text-slate-400 { color: #667788 !important; }
.dark .text-gray-500 { color: #8899aa !important; }
.dark .text-gray-700 { color: #b0b8c0 !important; }
.dark .text-gray-600 { color: #a0a8b0 !important; }
.dark .shadow-sm { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.4) !important; }
.dark .shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.5) !important; }
.dark .hover\\:bg-gray-50:hover { background-color: #252542 !important; }
.dark .hover\\:bg-slate-100:hover { background-color: #252542 !important; }
.dark .hover\\:bg-\\[\\#f3f3f3\\]:hover { background-color: #252542 !important; }
`

const NIGHT_RULES = `
.dark { color-scheme: dark; }
.dark body { background-color: #121212 !important; color: #c8c8c8 !important; }
.dark .bg-white { background-color: #1e1e1e !important; }
.dark .bg-\\[\\#f3f3f3\\] { background-color: #121212 !important; }
.dark .bg-\\[\\#e8f4fe\\] { background-color: #1a2a3a !important; }
.dark .bg-\\[\\#fef0f0\\] { background-color: #2a1a1a !important; }
.dark .bg-\\[\\#0070d2\\] { background-color: #1a3a5a !important; }
.dark .bg-slate-50 { background-color: #121212 !important; }
.dark .bg-slate-100 { background-color: #1e1e1e !important; }
.dark .bg-gray-50 { background-color: #121212 !important; }
.dark .bg-gray-100 { background-color: #1e1e1e !important; }
.dark .border-\\[\\#dddbda\\] { border-color: #333333 !important; }
.dark .border-slate-200 { border-color: #333333 !important; }
.dark .border-slate-100 { border-color: #282828 !important; }
.dark .border-gray-200 { border-color: #333333 !important; }
.dark .text-\\[\\#16325c\\] { color: #e0e0e0 !important; }
.dark .text-\\[\\#514f4d\\] { color: #c8c8c8 !important; }
.dark .text-\\[\\#0070d2\\] { color: #60a5fa !important; }
.dark .text-\\[\\#007a33\\] { color: #4ade80 !important; }
.dark .text-\\[\\#c23934\\] { color: #f87171 !important; }
.dark .text-slate-500 { color: #9ca3af !important; }
.dark .text-slate-400 { color: #6b7280 !important; }
.dark .text-gray-500 { color: #9ca3af !important; }
.dark .text-gray-700 { color: #d1d5db !important; }
.dark .text-gray-600 { color: #b0b0b0 !important; }
.dark .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.6) !important; }
.dark .shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.7) !important; }
.dark .hover\\:bg-gray-50:hover { background-color: #282828 !important; }
.dark .hover\\:bg-slate-100:hover { background-color: #282828 !important; }
.dark .hover\\:bg-\\[\\#f3f3f3\\]:hover { background-color: #282828 !important; }
`

function getStored(): Theme {
  try {
    const v = localStorage.getItem('tolmai_theme')
    if (v === 'light' || v === 'dark' || v === 'night' || v === 'system') return v
  } catch { /* ignore */ }
  return 'light'
}

function resolveTheme(t: Theme): 'light' | 'dark' | 'night' {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

let injectedStyle: HTMLStyleElement | null = null

function applyTheme(resolved: 'light' | 'dark' | 'night') {
  const isDark = resolved === 'dark' || resolved === 'night'
  document.documentElement.classList.toggle('dark', isDark)
  if (injectedStyle) {
    injectedStyle.remove()
    injectedStyle = null
  }
  if (isDark) {
    injectedStyle = document.createElement('style')
    injectedStyle.setAttribute('data-theme', resolved)
    injectedStyle.textContent = resolved === 'night' ? NIGHT_RULES : DARK_RULES
    document.head.appendChild(injectedStyle)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStored)
  const [resolved, setResolved] = useState<'light' | 'dark' | 'night'>(() => resolveTheme(theme))

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    const r = resolveTheme(t)
    setResolved(r)
    applyTheme(r)
    try { localStorage.setItem('tolmai_theme', t) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        const r = resolveTheme('system')
        setResolved(r)
        applyTheme(r)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
