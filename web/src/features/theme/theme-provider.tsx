import { createContext, useContext, useEffect, useState } from 'react'
export type Theme = 'light' | 'dark' | 'system'
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null)
function storedTheme(): Theme { const value = localStorage.getItem('shrimp:theme'); return value === 'light' || value === 'dark' || value === 'system' ? value : 'system' }
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme)
  useEffect(() => {
    const preference = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { const dark = theme === 'dark' || (theme === 'system' && preference.matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }
    apply(); preference.addEventListener('change', apply)
    return () => preference.removeEventListener('change', apply)
  }, [theme])
  const setTheme = (value: Theme) => { localStorage.setItem('shrimp:theme', value); setThemeState(value) }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('主题上下文缺失'); return value }
