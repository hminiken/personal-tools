'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Lets a page contribute a suffix to the header title (e.g. the current folder
// name in the Writing Desk). The NavigationShell reads `suffix`; pages set it
// by rendering <SetPageTitleSuffix value={...} />.
interface PageTitleContextValue {
  suffix: string | null;
  setSuffix: (s: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({ suffix: null, setSuffix: () => {} });

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [suffix, setSuffix] = useState<string | null>(null);
  return <PageTitleContext.Provider value={{ suffix, setSuffix }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleSuffix() {
  return useContext(PageTitleContext);
}

// Drop this into any page to set (or clear, with value=null) the header suffix.
// Setting on every render keeps it correct across client-side navigation.
export function SetPageTitleSuffix({ value }: { value: string | null }) {
  const { setSuffix } = usePageTitleSuffix();
  useEffect(() => {
    setSuffix(value);
  }, [value, setSuffix]);
  return null;
}
