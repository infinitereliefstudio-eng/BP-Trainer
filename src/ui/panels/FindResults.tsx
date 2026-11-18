/**
 * Find Results, UE's search tab of the Blueprint editor: a search field, the
 * binoculars button (Find in all Blueprints), and the results as a tree,
 * Blueprint › graph › node. Touching a node shows it in its graph.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { findInBlueprints, hitCount } from '@core/search/find';
import { useStore } from '../hooks';

interface Props {
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
  initialQuery?: string;
}

/** Remembered while the app is open, like UE keeps the last search in the tab. */
let lastQuery = '';
let lastAll = false;

export function FindResults({ onFocusNode, initialQuery }: Props) {
  const store = useStore();
  const [query, setQuery] = useState(initialQuery ?? lastQuery);
  const [all, setAll] = useState(lastAll);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    lastQuery = query;
    lastAll = all;
  }, [query, all]);
  // Opened from the toolbar's Find: ready to type, as Ctrl+F.
  useEffect(() => {
    if (!initialQuery) field.current?.focus();
  }, []);

  const results = useMemo(() => findInBlueprints(store.project, query, all ? undefined : store.cls.id), [store.project, store.cls, query, all]);
  const count = hitCount(results);

  return (
    <div class="find-results">
      <div class="find-head">
        <input
          ref={field}
          class="field search"
          type="search"
          placeholder={all ? 'Find in all Blueprints' : `Find in ${store.cls.name}`}
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        <button class={`btn find-all${all ? ' on' : ''}`} aria-pressed={all} title="Find in all Blueprints" onClick={() => setAll((v) => !v)}>
          ⧉ All Blueprints
        </button>
      </div>
      {!query.trim() ? (
        <p class="hint">Cherche un nœud, une variable, une valeur tapée sur une pin ou un nom de Blueprint. Touche un résultat pour aller au nœud.</p>
      ) : count === 0 ? (
        <p class="hint">No Results found</p>
      ) : (
        <ul class="find-tree">
          {results.map((c) => (
            <li key={c.classId}>
              {all && <div class="find-class">{c.className}</div>}
              <ul>
                {c.graphs.map((g) => (
                  <li key={g.graphId}>
                    <div class="find-graph">{g.graphName}</div>
                    <ul>
                      {g.hits.map((h) => (
                        <li key={h.nodeId}>
                          <button class="find-hit" onClick={() => onFocusNode(g.graphId, h.nodeId, c.classId)}>
                            <span class="fh-title">{h.title}</span>
                            {h.detail && <span class="fh-detail">{h.detail}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
