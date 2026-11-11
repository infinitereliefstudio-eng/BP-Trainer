/**
 * The node index: every node of the palette, searchable outside the editor,
 * with its traps, how it differs in UE, and the lessons that use it.
 */
import { useMemo, useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { lessonLabel } from '@core/lessons/types';
import type { NodeKind } from '@core/nodes/definition';
import { lessonsByNode, nodeCards, type NodeCard } from '@core/reference/nodeIndex';
import { plain } from './text';

const KIND_LABEL: Record<NodeKind, string> = {
  event: 'Événement',
  function: 'Fonction',
  pure: 'Pur',
  latent: 'Latent',
  flow: 'Contrôle de flux',
  entry: 'Entrée de fonction',
  variable: 'Variable',
  comment: 'Commentaire',
};

type Filter = 'all' | 'traps';

export function NodeIndex({ onOpenLesson }: { onOpenLesson: (lessonId: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const all = useMemo(nodeCards, []);
  const q = plain(query.trim());
  const found = all.filter(
    (n) => (filter === 'all' || !!n.trap) && (!q || plain(`${n.title} ${n.category} ${n.keywords.join(' ')} ${n.description}`).includes(q)),
  );
  const groups = new Map<string, NodeCard[]>();
  for (const n of found) groups.set(n.category, [...(groups.get(n.category) ?? []), n]);

  return (
    <main class="home-path notebook">
      <p class="muted">
        Les {all.length} nœuds de BP Trainer, avec leurs pièges. Les noms sont ceux d’Unreal Engine : ce que tu cherches ici se cherche pareil dans UE.
      </p>
      <div class="search-row">
        <input
          class="field search"
          type="search"
          placeholder="Chercher un nœud : Delay, Cast, tableau…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
        <div class="home-tabs">
          <button class={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Tous
          </button>
          <button class={filter === 'traps' ? 'active' : ''} onClick={() => setFilter('traps')}>
            Avec un piège
          </button>
        </div>
      </div>
      {found.length === 0 && <p class="muted">Aucun nœud ne correspond à « {query} ».</p>}
      {[...groups].map(([category, list]) => (
        <section key={category} class="module">
          <h2>{category}</h2>
          <div class="node-list">
            {list.map((n) => (
              <div key={n.id} class={`node-item kind-${n.kind}${openId === n.id ? ' open' : ''}`}>
                <button class="node-head" aria-expanded={openId === n.id} onClick={() => setOpenId(openId === n.id ? null : n.id)}>
                  <span class="node-dot" />
                  <strong>{n.title}</strong>
                  {n.trap && <span class="tag trap">piège</span>}
                  <span class="muted small node-kind">{KIND_LABEL[n.kind]}</span>
                </button>
                {openId === n.id && <NodeBody node={n} onOpenLesson={onOpenLesson} />}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function NodeBody({ node, onOpenLesson }: { node: NodeCard; onOpenLesson: (lessonId: string) => void }) {
  const lessons = (lessonsByNode().get(node.id) ?? []).map(getLesson).filter((l) => !!l);
  return (
    <div class="node-body">
      <p>{node.description}</p>
      {node.trap && (
        <p class="node-note">
          <span class="note-tag trap">Piège</span>
          {node.trap}
        </p>
      )}
      {node.inUe && (
        <p class="node-note">
          <span class="note-tag in-ue">Dans UE</span>
          {node.inUe}
        </p>
      )}
      {lessons.length > 0 && (
        <div class="chip-row">
          <span class="muted small">Vu dans :</span>
          {lessons.slice(0, 6).map((l) => (
            <button key={l.id} class="link-chip" onClick={() => onOpenLesson(l.id)}>
              {lessonLabel(l)} · {l.title}
            </button>
          ))}
          {lessons.length > 6 && <span class="muted small">et {lessons.length - 6} autres</span>}
        </div>
      )}
    </div>
  );
}
