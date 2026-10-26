import { useEffect, useSyncExternalStore } from 'react';
import { subscribe, getVersion } from './store.js';

// Call at the top of any component that reads from the store: it re-renders whenever data changes.
export function useData() {
  return useSyncExternalStore(subscribe, getVersion);
}

// Adds a class to <body> while the component is mounted (the login and share pages use their own backgrounds).
export function useBodyClass(name) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
}

export function useTitle(title) {
  useEffect(() => { document.title = title; }, [title]);
}
