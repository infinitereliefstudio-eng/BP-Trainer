/** Context menus (long press) for nodes, pins, links and the "⋮" button. */
import { getDefinition } from '@core/nodes/registry';
import { addVariable } from '@core/operations/classOps';
import { addNode, connect, disconnectNode, disconnectPin, duplicateNodes, removeNodes } from '@core/operations/graphOps';
import type { PinRef } from '@core/model/project';
import type { PinSpec } from '@core/nodes/definition';
import type { EditorStore } from '@core/store/editorStore';
import { createStarterProject } from '@core/templates/starterProject';
import { duplicateActor, placeActor, removeActor } from '@core/operations/levelOps';
import { exportProject, pickProjectFile } from '@storage/persistence';
import type { MenuItem, OpenOverlay } from './overlayTypes';

export function nodeMenu(store: EditorStore, nodeId: string, openDetails: () => void): MenuItem[] {
  const ids = store.selection.has(nodeId) ? [...store.selection] : [nodeId];
  const many = ids.length > 1;
  const unique = ids.every((id) => getDefinition(store.graph.nodes[id]?.def ?? '')?.unique);
  return [
    { label: 'Détails', action: openDetails, disabled: many },
    {
      label: many ? `Dupliquer (${ids.length})` : 'Dupliquer',
      disabled: unique,
      action: () => {
        const copies = store.apply('Dupliquer', (_c, g) => duplicateNodes(g, ids));
        store.selectNodes(copies);
      },
    },
    {
      label: 'Rompre tous les liens',
      action: () => store.apply('Rompre les liens', (_c, g) => ids.forEach((id) => disconnectNode(g, id))),
    },
    ...breakpointItems(store, ids),
    ...gotoItems(store, ids),
    {
      label: many ? `Supprimer (${ids.length})` : 'Supprimer',
      danger: true,
      action: () => store.apply(many ? 'Supprimer des nœuds' : 'Supprimer un nœud', (_c, g) => removeNodes(g, ids)),
    },
  ];
}

/** Breakpoints go on nodes that execute (events and impure nodes), like UE. */
function breakpointItems(store: EditorStore, ids: string[]): MenuItem[] {
  if (ids.length !== 1) return [];
  const node = store.graph.nodes[ids[0]];
  const kind = node && getDefinition(node.def)?.kind;
  if (!node || kind === 'pure' || getDefinition(node.def)?.style === 'getter') return [];
  const on = store.breakpoints.has(node.id);
  return [
    {
      label: on ? 'Retirer le breakpoint' : 'Ajouter un breakpoint',
      hint: on ? undefined : 'pause avant ce nœud',
      action: () => store.toggleBreakpoint(node.id),
    },
  ];
}

/** "Go to definition" for calls to a function of this Blueprint. */
function gotoItems(store: EditorStore, ids: string[]): MenuItem[] {
  const node = ids.length === 1 ? store.graph.nodes[ids[0]] : undefined;
  if (!node || (node.def !== 'call.function' && node.def !== 'call.pureFunction')) return [];
  const own = !node.config.owner || node.config.owner === store.cls.id;
  if (!own) return [];
  return [{ label: 'Ouvrir la fonction', action: () => store.openGraph(String(node.config.graph)) }];
}

export function pinMenu(store: EditorStore, ref: PinRef, spec: PinSpec): MenuItem[] {
  const g = store.graph;
  const links = Object.values(g.links).filter(
    (l) => (l.from.node === ref.node && l.from.pin === ref.pin) || (l.to.node === ref.node && l.to.pin === ref.pin),
  );
  const node = g.nodes[ref.node];
  const items: MenuItem[] = [
    {
      label: links.length > 1 ? `Rompre les ${links.length} liens` : 'Rompre le lien',
      disabled: links.length === 0,
      action: () => store.apply('Rompre le lien', (_c, gr) => disconnectPin(gr, ref)),
    },
  ];
  const promotable = spec.type.category !== 'exec' && spec.type.category !== 'wildcard';
  if (promotable && node) {
    items.push({
      label: 'Promouvoir en variable',
      hint: spec.dir === 'in' ? 'crée un Get' : 'crée un Set',
      action: () => promoteToVariable(store, ref, spec),
    });
  }
  if (spec.dir === 'in' && node && ref.pin in node.defaults) {
    items.push({
      label: 'Valeur par défaut',
      hint: 'réinitialiser',
      action: () =>
        store.apply('Réinitialiser la valeur', (_c, gr) => {
          delete gr.nodes[ref.node].defaults[ref.pin];
        }),
    });
  }
  return items;
}

/** UE's "Promote to Variable": a variable of the pin's type, wired in. */
function promoteToVariable(store: EditorStore, ref: PinRef, spec: PinSpec): void {
  const node = store.graph.nodes[ref.node];
  if (!node) return;
  const base = spec.name.replace(/[^\p{L}\p{N}_]+/gu, '') || 'NewVar';
  const v = store.apply('Promouvoir en variable', (cls, g) => {
    const variable = addVariable(cls, { ...spec.type }, base);
    const ctx = store.ctx;
    if (spec.dir === 'in') {
      const get = addNode(g, 'var.get', node.x - 180, node.y + 20, { variable: variable.id });
      if (get.ok) connect(g, { node: get.value.id, pin: 'value' }, ref, ctx);
    } else {
      const set = addNode(g, 'var.set', node.x + 260, node.y, { variable: variable.id });
      if (set.ok) connect(g, ref, { node: set.value.id, pin: 'value' }, ctx);
    }
    return variable;
  });
  store.setFocus({ kind: 'variable', id: v.id });
  store.info(`Variable ${v.name} créée.`);
}

export function linkMenu(store: EditorStore, linkId: string): MenuItem[] {
  return [
    {
      label: 'Rompre ce lien',
      danger: true,
      action: () =>
        store.apply('Rompre le lien', (_c, g) => {
          delete g.links[linkId];
        }),
    },
    { label: 'Ajouter un Reroute', hint: 'étape 4', disabled: true },
  ];
}

export interface MoreMenuOptions {
  sandbox: boolean;
  onClassSettings: () => void;
}

export function moreMenu(store: EditorStore, openOverlay: OpenOverlay, opts: MoreMenuOptions): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'Class Settings', action: opts.onClassSettings },
    { label: 'Exporter le projet', hint: 'fichier .json', action: () => exportProject(store.project) },
    {
      label: 'Importer un projet',
      action: () =>
        pickProjectFile()
          .then((p) => {
            if (!p) return;
            store.replaceProject(p);
            store.info(`Projet « ${p.name} » importé.`);
          })
          .catch((e: Error) => store.error(e.message)),
    },
  ];
  if (opts.sandbox) {
    items.push({
      label: 'Nouveau projet',
      danger: true,
      action: () =>
        openOverlay({
          kind: 'confirm',
          title: 'Repartir d’un projet neuf ?',
          text: 'Le projet actuel sera remplacé. Exporte-le d’abord si tu veux le garder.',
          confirmLabel: 'Remplacer',
          onConfirm: () => store.replaceProject(createStarterProject()),
        }),
    });
  }
  items.push({ label: 'Plein écran', action: () => enterFullscreen() }, { label: 'Aide et gestes', action: () => openOverlay({ kind: 'about' }) });
  return items;
}

/** Long press on an actor in the level. */
export function actorMenu(store: EditorStore, actorId: string, openClass: (classId: string) => void): MenuItem[] {
  const a = store.project.level.actors.find((x) => x.id === actorId);
  if (!a) return [];
  return [
    { label: 'Ouvrir le Blueprint', action: () => openClass(a.classId) },
    {
      label: 'Dupliquer',
      action: () => {
        const res = store.applyProject('Dupliquer l’acteur', (p) => duplicateActor(p, actorId));
        if (res.ok) store.setFocus({ kind: 'actor', id: res.value.id });
      },
    },
    { label: 'Retirer du niveau', danger: true, action: () => store.applyProject('Retirer l’acteur', (p) => removeActor(p, actorId)) },
  ];
}

/** Long press on empty floor: place an instance of a Blueprint. */
export function placeMenu(store: EditorStore, world: { x: number; y: number }): MenuItem[] {
  return store.project.classes.map((c) => ({
    label: `Placer ${c.name}`,
    action: () => {
      const res = store.applyProject(`Placer ${c.name}`, (p) => placeActor(p, c.id, Math.round(world.x / 10) * 10, Math.round(world.y / 10) * 10));
      if (res.ok) store.setFocus({ kind: 'actor', id: res.value.id });
    },
  }));
}

export function enterFullscreen(): void {
  const el = document.documentElement;
  const p = el.requestFullscreen?.();
  p?.then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => undefined);
}
