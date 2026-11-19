/**
 * Details of an Actor Component made in Blueprint, in the actor's Blueprint:
 * its name and class, the values of its Instance Editable variables for this
 * actor class, and its Event Dispatchers as UE's green + buttons (an event
 * already bound, "On OnMort (Sante)").
 */
import { inheritedView } from '@core/model/inheritance';
import { findClass, type Component } from '@core/model/project';
import { removeComponent, renameComponent, setComponentValue } from '@core/operations/classOps';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { ValueInput } from '../widgets/ValueInput';
import { AppHelp, Field, Group } from './fields';

interface Props {
  c: Component;
  placeNode?: (def: string, config: Record<string, Value>) => void;
  onOpenClass?: (classId: string) => void;
}

export function LogicComponentDetails({ c, placeNode, onOpenClass }: Props) {
  const store = useStore();
  const own = c.classId ? findClass(store.project, c.classId) : undefined;
  const of = own && inheritedView(own, store.project);
  const vars = of?.variables.filter((v) => v.instanceEditable) ?? [];
  const categories = [...new Set(vars.map((v) => v.category || 'Default'))];
  const events = Object.values(store.cls.graphs.flatMap((g) => Object.values(g.nodes))).filter(
    (n) => n.def === 'event.componentDispatcher' && n.config.component === c.id,
  );
  const addEvent = (dispatcher: string) => {
    if (!placeNode) return;
    const graph = store.graph.kind === 'event' ? store.graph : store.cls.graphs.find((g) => g.kind === 'event');
    if (graph && graph.id !== store.graphId) store.openGraph(graph.id);
    placeNode('event.componentDispatcher', { component: c.id, dispatcher });
  };

  return (
    <>
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField value={c.name} onCommit={(name) => store.apply('Renommer le composant', (cl) => renameComponent(cl, c.id, name))} />
        </Field>
        <Field label="Component Class">
          <span>{of?.name ?? 'introuvable'}</span>
        </Field>
        {of && onOpenClass && (
          <button class="btn" onClick={() => onOpenClass(of.id)}>
            Edit Blueprint
          </button>
        )}
      </Group>

      {categories.map((cat) => (
        <Group key={cat} title={cat}>
          {vars
            .filter((v) => (v.category || 'Default') === cat)
            .map((v) => (
              <Field key={v.id} label={v.name}>
                <ValueInput
                  type={v.type}
                  value={c.values && v.id in c.values ? c.values[v.id] : v.defaultValue}
                  onChange={(val) => store.apply('Régler une variable du composant', (cl) => setComponentValue(cl, c.id, v.id, val))}
                />
              </Field>
            ))}
        </Group>
      ))}

      {of && of.dispatchers.length > 0 && (
        <Group title="Events">
          {of.dispatchers.map((d) => {
            const placed = events.some((n) => n.config.dispatcher === d.id);
            return (
              <Field key={d.id} label={d.name}>
                <button class="btn event-add" disabled={placed} onClick={() => addEvent(d.id)}>
                  {placed ? 'dans le graphe' : '+'}
                </button>
              </Field>
            );
          })}
        </Group>
      )}

      <Group title="Composant" app>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.apply('Supprimer le composant', (cl) => removeComponent(cl, c.id));
            if (!res.ok) store.warn(res.reason);
          }}
        >
          Supprimer le composant
        </button>
      </Group>

      <AppHelp>
        <p>
          <b>Actor Component</b> : de la logique sans place dans le monde (pas de position, pas de forme). Chaque acteur qui le porte a sa propre copie, avec
          ses propres variables. Dans les graphes de {of?.name ?? 'son Blueprint'}, Self est le composant ; Get Owner donne l’acteur qui le porte.
        </p>
        {vars.length > 0 ? (
          <p>
            Les variables cochées <b>Instance Editable</b> dans {of?.name} se règlent ici pour tous les {store.cls.name}, puis acteur par acteur dans les Details
            d’un acteur posé.
          </p>
        ) : (
          <p>Coche Instance Editable sur une variable de {of?.name ?? 'son Blueprint'} pour la régler ici, acteur par acteur.</p>
        )}
        {of && of.dispatchers.length > 0 && (
          <p>
            <b>Events</b> : le + ajoute l’événement « On … ({c.name}) » dans l’Event Graph. Il se déclenche quand le composant appelle cet Event Dispatcher,
            sans Bind Event : UE fait l’abonnement lui-même.
          </p>
        )}
      </AppHelp>
    </>
  );
}
