import { createContext, useContext, useMemo, useState } from 'react'
import { tools } from '../../tools/registry'
import { readFavorites, writeFavorites } from './storage'
const FavoritesContext = createContext<{ favorites: Set<string>; toggle: (slug: string) => void } | null>(null)
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const valid = useMemo(() => new Set(tools.map((tool) => tool.slug)), [])
  const [favorites, setFavorites] = useState(() => new Set(readFavorites(valid)))
  const toggle = (slug: string) => setFavorites((current) => { const next = new Set(current); next.has(slug) ? next.delete(slug) : next.add(slug); writeFavorites([...next]); return next })
  return <FavoritesContext.Provider value={{ favorites, toggle }}>{children}</FavoritesContext.Provider>
}
export function useFavorites() { const value = useContext(FavoritesContext); if (!value) throw new Error('useFavorites 必须在 FavoritesProvider 内使用'); return value }
