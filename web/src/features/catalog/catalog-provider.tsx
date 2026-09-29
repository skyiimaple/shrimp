import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ToolCategory } from '../../tools/types';

export type CatalogCategory = '全部' | ToolCategory;

interface CatalogState {
  query: string;
  setQuery: (value: string) => void;
  category: CatalogCategory;
  setCategory: (value: CatalogCategory) => void;
}

const CatalogContext = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CatalogCategory>('全部');
  return (
    <CatalogContext.Provider value={{ query, setQuery, category, setCategory }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog 必须在 CatalogProvider 内使用');
  return value;
}
