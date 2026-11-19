/**
 * V7.21, Actor Components, usage: « Le sac et le coffre ». One inventory
 * component, BP_Inventaire, carried by the chest (already filled) and, once
 * the learner adds it, by the player. The chest hands its contents to
 * whatever enters it with an inventory, the fuse box takes a fuse from it.
 * Neither knows the player: they ask for the component.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { carries, classBuilder, componentVar } from './health';
import { fnDef, fnOf, goTo } from './kit';
import { playerBlueprint } from './props';

const BOX: [number, number] = [-380, 0];
const CHEST: [number, number] = [380, 0];
const OUT: [number, number] = [0, 380];
const MISSING = 'Il manque un fusible';
const FIXED = 'Fusible posé';
const CONTENTS = ['Fusible', 'Badge'];

function project(): Project {
  const pb = new ProjectBuilder('Le sac et le coffre');
  const p = pb.project;
  playerBlueprint(pb);

  const inv = pb.blueprint('BP_Inventaire', 'ActorComponent');
  const items = inv.variable('Objets', T.array(T.name), []);
  inv.cls.variables.find((v) => v.id === items)!.instanceEditable = true;
  const add = fnDef(p, inv, 'Ajouter', [['Objet', T.name]], []);
  const push = add.f.node('array.add', {}, {}, [360, 96]);
  add.f.link(add.entry, 'then', push, 'exec').link(add.f.node('var.get', { variable: items }, {}, [120, 300]), 'value', push, 'array').link(add.entry, add.pin.Objet, push, 'item');
  const clear = fnDef(p, inv, 'Vider', [], []);
  const wipe = clear.f.node('array.clear', {}, {}, [360, 96]);
  clear.f.link(clear.entry, 'then', wipe, 'exec').link(clear.f.node('var.get', { variable: items }, {}, [120, 300]), 'value', wipe, 'array');
  // Retirer is declared, its body is the learner's.
  fnDef(p, inv, 'Retirer', [['Objet', T.name]], [['Retire', T.bool]]);

  const chest = pb.blueprint('BP_Coffre');
  chest.component('StaticMesh', 'Coffre', { sizeX: 100, sizeY: 64, color: '#92400e', blocks: false });
  chest.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  chest.logic(inv, 'Inventaire', { [items]: [...CONTENTS] });

  const box = pb.blueprint('BP_Casier');
  box.component('StaticMesh', 'Boitier', { sizeX: 70, sizeY: 90, color: '#475569', blocks: false });
  box.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });

  pb.place(box, ...BOX);
  pb.place(chest, ...CHEST);
  pb.playerStart(...OUT);
  return p;
}

const listOf = (cx: CheckContext, label: string): string[] | undefined => {
  const v = componentVar(cx, label, 'BP_Inventaire', 'Objets');
  return Array.isArray(v) ? v.map(String) : undefined;
};
const show = (list: string[] | undefined) => (list === undefined ? 'pas d’inventaire' : list.length ? list.join(', ') : 'vide');
const state = (cx: CheckContext) =>
  `joueur : ${show(listOf(cx, 'Joueur'))} ; coffre : ${show(listOf(cx, 'BP_Coffre'))} ; « ${MISSING} » ${countPrints(cx, MISSING)} fois, « ${FIXED} » ${countPrints(cx, FIXED)} fois`;
const holds = (cx: CheckContext, label: string, want: string[]) => (listOf(cx, label) ?? ['?']).join() === want.join();

export const lessonComponentInventory: Lesson = {
  id: 'l-sac-coffre',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Le sac et le coffre',
  situation:
    'Le coffre a un inventaire : un fusible et un badge. Le joueur doit pouvoir les ramasser, et le boîtier électrique doit lui prendre le fusible. Un seul Blueprint d’inventaire pour tout ce qui transporte des objets.',
  recalls: ['arrays', 'loops', 'functions'],
  notions: ['Actor Component', 'Get Component by Class', 'Is Valid', 'Tableau (Array)', 'For Each Loop'],
  remember:
    'Un inventaire est un composant : le coffre et le joueur ont le même, chacun avec ses objets. Pour échanger, on ne demande pas « es-tu le joueur ? » mais « as-tu un inventaire ? », et on passe par ses fonctions (Ajouter, Retirer), pas par son tableau.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BP_Inventaire**, un Actor Component, avec un tableau **Objets** (Name, Instance Editable) et deux fonctions écrites, **Ajouter** (Objet) et **Vider**. Sa fonction **Retirer** (Objet → Retire) est déclarée, vide. **BP_Coffre** porte un BP_Inventaire qui contient **Fusible** et **Badge**. **BP_Casier**, le boîtier électrique, a une Zone et un graphe vide.\n\n' +
        '- **Retirer** enlève l’objet du tableau et dit s’il y était (Retire).\n' +
        '- Le joueur porte **son propre** BP_Inventaire, vide au départ.\n' +
        '- Ce qui entre dans le coffre **avec un inventaire** reçoit tout son contenu ; le coffre est alors vide. Repasser n’ajoute rien.\n' +
        '- Ce qui entre dans le boîtier avec un inventaire : s’il a un Fusible, il le perd et « Fusible posé » s’affiche ; sinon « Il manque un fusible ».\n' +
        '- Ni le coffre ni le boîtier ne font de Cast.',
    },
    {
      title: 'Le plan',
      body:
        '1. **Retirer** : **Remove Item** (Target Array = Objets, Item = Objet) → Return Node (Retire = Return Value de Remove Item).\n' +
        '2. BP_Joueur : Components › **+ Add › BP_Inventaire**.\n' +
        '3. BP_Coffre : **ActorBeginOverlap** → **Get Component by Class** (Other Actor, BP_Inventaire) → **Is Valid** → **For Each Loop** sur les Objets de **son** Inventaire (glisse le composant Inventaire, puis Get Objets) → Loop Body : **Ajouter** (Target = le composant trouvé, Objet = Array Element) ; Completed : **Vider** (Target = son Inventaire).\n' +
        '4. BP_Casier : ActorBeginOverlap → Get Component by Class → Is Valid → **Retirer** (Objet « Fusible ») → **Branch** (Retire) : « Fusible posé » ou « Il manque un fusible ».',
    },
    {
      title: 'Pourquoi passer par les fonctions',
      body:
        'Le coffre pourrait lire et écrire directement le tableau Objets du joueur. Mais le jour où l’inventaire aura une capacité, un poids, ou préviendra l’interface quand il change, il faudrait corriger chaque Blueprint qui touche au tableau. Avec Ajouter et Retirer, c’est l’inventaire qui décide : une seule correction.',
    },
  ],
  objectives: [
    'Écris Retirer ; le joueur porte un BP_Inventaire.',
    'Au boîtier sans fusible : « Il manque un fusible ».',
    'Au coffre, le joueur reçoit Fusible et Badge, et le coffre se vide ; repasser n’ajoute rien.',
    'Revenu au boîtier : « Fusible posé », il ne reste que le Badge.',
  ],
  hints: [
    'Le coffre et le boîtier ne savent pas qui entre : comment demander à l’acteur s’il a un inventaire ? Et pour donner tout le contenu du coffre, que faut-il parcourir ?',
    'Remove Item, Get Component by Class, Is Valid, For Each Loop, Ajouter, Vider, Retirer, Branch, Print String.',
    'Solution : Retirer = Remove Item (Objets, Objet) → Return (Retire). BP_Joueur : + Add › BP_Inventaire. BP_Coffre : ActorBeginOverlap → Get Component by Class (Other Actor, BP_Inventaire) → Is Valid → For Each Loop (Inventaire › Objets) → Ajouter (Target = trouvé, Objet = Array Element) ; Completed → Vider (Inventaire). BP_Casier : Overlap → Get Component by Class → Is Valid → Retirer (« Fusible ») → Branch : « Fusible posé » / « Il manque un fusible ».',
  ],
  challenge: 'Donne un BP_Inventaire à un drone qui passe par le coffre avant toi : qu’est-ce qui change dans le coffre ? Rien : c’est tout l’intérêt.',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...BOX, 0.3),
    { checkpoint: 'casier' },
    ...goTo(...OUT),
    ...goTo(...CHEST, 0.3),
    { checkpoint: 'coffre' },
    ...goTo(...OUT),
    ...goTo(...CHEST, 0.3),
    { checkpoint: 'coffre-2' },
    ...goTo(...OUT),
    ...goTo(...BOX, 0.3),
  ],
  checks: [
    {
      id: 'carried',
      label: 'Le joueur porte un BP_Inventaire',
      test: (cx) => (carries(cx.project, 'BP_Joueur', 'BP_Inventaire') ? true : 'BP_Joueur ne porte pas de BP_Inventaire : Components › + Add.'),
    },
    {
      id: 'missing',
      label: 'Au boîtier, sans fusible : « Il manque un fusible »',
      at: 'casier',
      test: (cx) => (countPrints(cx, MISSING) === 1 && countPrints(cx, FIXED) === 0 ? true : `Au premier passage au boîtier : ${state(cx)}.`),
    },
    {
      id: 'taken',
      label: 'Au coffre, le joueur reçoit Fusible et Badge ; le coffre est vide',
      at: 'coffre',
      test: (cx) => (holds(cx, 'Joueur', CONTENTS) && holds(cx, 'BP_Coffre', []) ? true : `Après le coffre : ${state(cx)}.`),
    },
    {
      id: 'again',
      label: 'Repasser au coffre n’ajoute rien',
      at: 'coffre-2',
      test: (cx) => (holds(cx, 'Joueur', CONTENTS) ? true : `Après un second passage au coffre : ${state(cx)}. Le coffre doit se vider quand il donne.`),
    },
    {
      id: 'fixed',
      label: 'Revenu au boîtier : « Fusible posé », il reste le Badge',
      test: (cx) => (countPrints(cx, FIXED) === 1 && countPrints(cx, MISSING) === 1 && holds(cx, 'Joueur', ['Badge']) ? true : `En fin de parcours : ${state(cx)}.`),
    },
    notUsing('no-cast', 'BP_Coffre', ['cast.to'], 'Le coffre ne fait pas de Cast', 'BP_Coffre fait un Cast : demande à l’acteur s’il a un BP_Inventaire (Get Component by Class).'),
    notUsing('no-cast-box', 'BP_Casier', ['cast.to'], 'Le boîtier ne fait pas de Cast', 'BP_Casier fait un Cast : demande à l’acteur s’il a un BP_Inventaire (Get Component by Class).'),
    notion(usesNode('find', 'BP_Coffre', ['actor.getComponentByClass', 'actor.getComponentsByClass'], 'Le coffre cherche l’inventaire de qui entre', 'Utilise Get Component by Class sur Other Actor.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'three-items',
      label: 'le coffre contient Clé, Fusible et Carte',
      mutate: (p) => {
        const inv = p.classes.find((c) => c.name === 'BP_Inventaire');
        const items = inv?.variables.find((v) => v.name === 'Objets');
        const comp = p.classes.find((c) => c.name === 'BP_Coffre')?.components.find((k) => k.classId === inv?.id);
        if (comp && items) comp.values = { ...comp.values, [items.id]: ['Cle', 'Fusible', 'Carte'] };
      },
      scenario: [{ wait: 0.2 }, ...goTo(...CHEST, 0.3), ...goTo(...OUT), ...goTo(...BOX, 0.3)],
      checks: [
        {
          id: 'three-left',
          label: 'il reste au joueur Cle et Carte',
          test: (cx) => (holds(cx, 'Joueur', ['Cle', 'Carte']) && countPrints(cx, FIXED) === 1 ? true : `En fin de parcours : ${state(cx)}.`),
        },
      ],
      advice: 'Le coffre doit donner tout son contenu, quel qu’il soit (For Each Loop sur ses Objets), et le boîtier retirer le seul Fusible (Remove Item).',
    },
  ],
  solve(p) {
    const inv = classBuilder(p, 'BP_Inventaire');
    const items = inv.cls.variables.find((v) => v.name === 'Objets')!.id;
    const take = fnOf(inv, 'Retirer');
    const rm = take.f.node('array.removeItem', {}, {}, [360, 96]);
    take.f.link(take.entry, 'then', rm, 'exec').link(take.f.node('var.get', { variable: items }, {}, [120, 300]), 'value', rm, 'array').link(take.entry, take.pin.Objet, rm, 'item');
    take.f.link(rm, 'then', take.ret, 'exec').link(rm, 'result', take.ret, take.pin.Retire);
    const add = fnOf(inv, 'Ajouter').graph.id;
    const clear = fnOf(inv, 'Vider').graph.id;

    edit(p, 'BP_Joueur').logic(inv, 'Inventaire');

    const chest = edit(p, 'BP_Coffre');
    const own = chest.componentId('Inventaire');
    const ev = chest.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const find = chest.node('actor.getComponentByClass', {}, { componentClass: inv.cls.id }, [300, 320]);
    const valid = chest.node('flow.isValid', {}, {}, [560, 96]);
    const mine = chest.node('var.component', { component: own }, {}, [600, 480]);
    const list = chest.node('var.getExternal', { owner: inv.cls.id, variable: items }, {}, [780, 480]);
    const loop = chest.node('flow.forEachLoop', {}, {}, [860, 96]);
    const give = chest.node('call.function', { owner: inv.cls.id, graph: add }, {}, [1200, 60]);
    const empty = chest.node('call.function', { owner: inv.cls.id, graph: clear }, {}, [1200, 320]);
    chest.link(ev, 'then', valid, 'exec').link(ev, 'other', find, 'target').link(find, 'result', valid, 'object');
    chest.link(mine, 'value', list, 'target').link(list, 'value', loop, 'array').link(valid, 'valid', loop, 'exec');
    chest.link(loop, 'body', give, 'exec').link(find, 'result', give, 'target').link(loop, 'element', give, fnOf(inv, 'Ajouter').pin.Objet);
    chest.link(loop, 'completed', empty, 'exec').link(mine, 'value', empty, 'target');

    const box = edit(p, 'BP_Casier');
    const bev = box.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const bfind = box.node('actor.getComponentByClass', {}, { componentClass: inv.cls.id }, [300, 320]);
    const bvalid = box.node('flow.isValid', {}, {}, [560, 96]);
    const use = box.node('call.function', { owner: inv.cls.id, graph: take.graph.id }, { [take.pin.Objet]: 'Fusible' }, [860, 96]);
    const branch = box.node('flow.branch', {}, {}, [1180, 96]);
    box.link(bev, 'then', bvalid, 'exec').link(bev, 'other', bfind, 'target').link(bfind, 'result', bvalid, 'object');
    box.link(bvalid, 'valid', use, 'exec').link(bfind, 'result', use, 'target').link(use, 'then', branch, 'exec').link(use, take.pin.Retire, branch, 'condition');
    box.link(branch, 'true', box.node('debug.printString', {}, { text: FIXED }, [1480, 40]), 'exec');
    box.link(branch, 'false', box.node('debug.printString', {}, { text: MISSING }, [1480, 240]), 'exec');
  },
};
