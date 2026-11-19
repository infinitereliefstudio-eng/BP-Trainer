/**
 * Lot 2b of the path plan: « Appuyer ou fouiller », the transfer rung of
 * Enhanced Input. One key, two meanings: a short press opens the chest, a
 * hold searches it. Built as a UE5 project (ue5Input.ts), the trigger is the
 * learner's to set.
 */
import type { Project } from '../../model/project';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { playerBlueprint } from './props';

const hold = (seconds: number): ScenarioStep[] => [{ press: 'E' }, { wait: seconds }, { release: 'E' }, { wait: 0.1 }];

function chestProject(): Project {
  const pb = new ProjectBuilder('Appuyer ou fouiller');
  playerBlueprint(pb);
  const chest = pb.blueprint('BP_Coffre');
  chest.component('StaticMesh', 'Coffre', { sizeX: 100, sizeY: 60, color: '#7c4a1e' });
  chest.component('StaticMesh', 'Couvercle', { sizeX: 110, sizeY: 70, color: '#a16207', blocks: false });
  chest.cls.autoReceiveInput = true;
  pb.place(chest, 150, 0);
  pb.playerStart(-200, 0);
  const p = pb.project;
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  return p;
}

const said = (cx: CheckContext, word: string) => cx.prints().filter((t) => normText(t).includes(word)).length;
const lidOpen = (cx: CheckContext) => cx.component('BP_Coffre', 'Couvercle')?.props.visible === false;

export const transferChest: Lesson = {
  id: 't2-coffre',
  code: 'T2',
  chain: { notion: 'enhanced-input', step: 'transfer' },
  module: 'Enhanced Input',
  level: 'intermediaire',
  number: 0,
  title: 'Appuyer ou fouiller',
  situation: 'Une seule touche pour le coffre : un appui bref l’ouvre, tenir E une seconde le fouille.',
  notions: ['Déclencheur Hold', 'Canceled'],
  remember:
    'Un même Input Action peut porter deux sens : avec un déclencheur Hold, Triggered dit « tenu assez longtemps », Canceled dit « relâché avant ». C’est le Mapping Context qui fixe la durée, pas le graphe.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Coffre** : le Coffre et son **Couvercle**, graphe vide, Auto Receive Input sur Player 0. Le projet est réglé comme le template UE5 : **IMC_Joueur** relie E à **IA_Interagir**, sans déclencheur, et BP_PlayerController l’ajoute au BeginPlay.\n\n' +
        '- Un **appui bref** sur E (relâché avant une seconde) **ouvre** le coffre : le Couvercle disparaît, et un message dit qu’il s’ouvre (avec le mot « ouvre »).\n' +
        '- **Tenir E une seconde** le **fouille** : un message avec le mot « fouille ».\n' +
        '- Tenir E ne doit **pas** ouvrir le coffre au passage.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'C’est la même idée que « Maintenir pour ouvrir », dans une autre situation : pas de liste de nœuds. Avant de poser quoi que ce soit :\n\n' +
        '1. Où se règle la durée d’un appui ?\n2. Quelle sortie de l’événement d’action dit « tenu assez longtemps » ?\n3. Et laquelle dit « relâché trop tôt » ?\n\n' +
        'Teste avec ▶ Play, un appui bref puis un long. Les indices s’ouvrent après un premier essai.',
    },
  ],
  objectives: ['Un appui bref ouvre le coffre (Couvercle caché, message « ouvre »).', 'Tenir E une seconde le fouille (message « fouille »).', 'Tenir E ne l’ouvre pas.'],
  hints: [
    'Une seule action, un déclencheur qui mesure le temps, et deux sorties de l’événement : une pour chaque sens.',
    'IMC_Joueur › ligne E → IA_Interagir › déclencheur Hold (1 s, One Shot). Événement IA_Interagir : Triggered pour fouiller, Canceled pour ouvrir.',
    'Solution : déclencheur Hold 1 s, One Shot. BP_Coffre : IA_Interagir Triggered → Print String « Tu fouilles le coffre ». Canceled → Set Visibility (Couvercle, décoché) → Print String « Le coffre s’ouvre ».',
  ],
  challenge: 'Pendant qu’on tient E (Ongoing), affiche la progression de la fouille avec Elapsed Seconds.',
  setup: chestProject,
  scenario: [{ wait: 0.2 }, ...hold(0.3), { checkpoint: 'bref' }, ...hold(1.3)],
  checks: [
    {
      id: 'short-opens',
      label: 'Un appui bref ouvre le coffre',
      at: 'bref',
      test: (cx) => {
        if (said(cx, 'fouille')) return 'Un appui de 0,3 s a déjà fouillé le coffre : la durée se règle avec un déclencheur Hold dans IMC_Joueur.';
        if (!lidOpen(cx)) return 'Après un appui bref, le Couvercle est toujours là.';
        return said(cx, 'ouvre') ? true : 'Le Couvercle a disparu, mais aucun message avec le mot « ouvre ».';
      },
    },
    {
      id: 'hold-searches',
      label: 'Tenir E une seconde fouille le coffre',
      test: (cx) => (said(cx, 'fouille') ? true : 'Après 1,3 s d’appui, aucun message avec le mot « fouille ».'),
    },
    {
      id: 'hold-not-open',
      label: 'Tenir E ne l’ouvre pas une seconde fois',
      test: (cx) =>
        said(cx, 'ouvre') <= 1 ? true : 'Le message « ouvre » est revenu pendant l’appui long : ouvre seulement quand la touche est relâchée avant le seuil (Canceled).',
    },
    notion({
      id: 'hold',
      label: 'La ligne E → IA_Interagir a un déclencheur Hold',
      test: (cx) =>
        cx.project.mappingContexts.some((c) => c.mappings.some((m) => m.key === 'E' && m.triggers.some((t) => t.kind === 'Hold')))
          ? true
          : 'Mesure la durée avec un déclencheur Hold dans IMC_Joueur, plutôt que dans le graphe.',
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const context = p.mappingContexts.find((c) => c.name === 'IMC_Joueur')!;
    const action = p.inputActions.find((a) => a.name === 'IA_Interagir')!.id;
    for (const m of context.mappings) if (m.action === action) m.triggers = [{ kind: 'Hold', holdTime: 1, oneShot: true }];
    const b = edit(p, 'BP_Coffre');
    const ev = b.node('input.action', { action }, {}, [64, 200]);
    const search = b.node('debug.printString', {}, { text: 'Tu fouilles le coffre' }, [420, 40]);
    const open = b.node('component.setVisibility', {}, { visible: false }, [420, 360]);
    const say = b.node('debug.printString', {}, { text: 'Le coffre s’ouvre' }, [760, 360]);
    b.link(ev, 'triggered', search, 'exec').link(ev, 'canceled', open, 'exec').target('Couvercle', open).link(open, 'then', say, 'exec');
  },
};
