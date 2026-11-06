import { createContext } from 'preact';
import { useContext, useEffect, useReducer } from 'preact/hooks';
import type { EditorStore } from '@core/store/editorStore';

export const StoreContext = createContext<EditorStore | null>(null);

/** Read the store and re-render whenever it changes. */
export function useStore(): EditorStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext missing');
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => store.subscribe(() => force(0)), [store]);
  return store;
}
