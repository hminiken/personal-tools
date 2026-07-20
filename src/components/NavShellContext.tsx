'use client';

import { createContext, useContext } from 'react';

// Lets a page open the sidebar even when NavigationShell hides its own header
// (Writing Desk runs with header height 0 — see NavigationShell's isWriting
// branch). Pages that need a way back into the sidebar render their own
// toggle and call this instead.
interface NavShellContextValue {
  opened: boolean;
  toggle: () => void;
}

const NavShellContext = createContext<NavShellContextValue>({ opened: false, toggle: () => {} });

export const NavShellProvider = NavShellContext.Provider;

export function useNavShell() {
  return useContext(NavShellContext);
}
