/**
 * V7.20, Actor Components: Débogue D22 « Le scanner et le chariot ». A
 * scanner reads the Vie of whatever enters it with Get Component by Class.
 * The player has a health, the parked cart has none: Get Component by Class
 * gives None, and reading through it is Accessed None. The fix is Is Valid,
 * with a message for what has nothing to measure.
 */
import type { Project } from '../../model/project';
import { ProjectBuilder, edit, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { Lesson } from '../types';
import { healthComponent } from './health';
import { DEBUG_METHOD, goTo, wipe } from './kit';
import { playerBlueprint } from './props';

const SCANNER: [number, number] = [0, 0];
const NOTHING = 'Rien à mesurer';

/** Overlap → Get Component by Class (Other Actor, BP_Sante) → Vie → « Vie : … ». With `fixed`, Is Valid first. */
function scannerGraph(b: ClassBuilder, santeId: string, vie: string, fixed: boolean): void {
  const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const find = b.node('actor.getComponentByClass', {}, { componentClass: santeId }, [300, 320]);
  const read = b.node('var.getExternal', { owner: santeId, variable: vie }, {}, [620, 320]);
  const text = b.node('conv.intToString', {}, {}, [860, 320]);
  const join = b.node('string.append', {}, { in0: 'Vie : ' }, [1060, 320]);
  const show = b.node('debug.printString', {}, {}, [1100, 96]);
  b.link(ev, 'other', find, 'target').link(find, 'result', read, 'target').link(read, 'value', text, 'in').link(text, 'result', join, 'in1').link(join, 'result', show, 'text');
  if (!fixed) {
    b.link(ev, 'then', show, 'exec');
    return;
  }
  const valid = b.node('flow.isValid', {}, {}, [700, 96]);
  const none = b.node('debug.printString', {}, { text: NOTHING }, [1100, 520]);
  b.link(ev, 'then', valid, 'exec').link(find, 'result', valid, 'object').link(valid, 'valid', show, 'exec').link(valid, 'notValid', none, 'exec');
}

function project(): Project {
  const pb = new ProjectBuilder('Le scanner et le chariot');
  const { b: player } = playerBlueprint(pb);
  const health = healthComponent(pb, 100);
  player.logic(health.b, 'BP_Sante');
  const cart = pb.blueprint('BP_Chariot');
  cart.component('StaticMesh', 'Plateau', { sizeX: 110, sizeY: 70, color: '#78716c', blocks: false });
  cart.component('BoxCollision', 'Corps', { sizeX: 110, sizeY: 70 });
  const scanner = pb.blueprint('BP_Scanner');
  scanner.component('StaticMesh', 'Arche', { sizeX: 260, sizeY: 30, y: -130, color: '#0f766e' });
  scanner.component('BoxCollision', 'Zone', { sizeX: 240, sizeY: 220 });
  scannerGraph(scanner, health.b.cls.id, health.vie, false);
  pb.place(scanner, ...SCANNER);
  pb.place(cart, 70, 30);
  pb.playerStart(0, 380);
  return pb.project;
}

export const debug22: Lesson = {
  id: 'd22-scanner',
  kind: 'debug',
  code: 'D22',
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'Le scanner et le chariot',
  situation:
    'Le scanner médical affiche la Vie de ce qui passe dessous. Pour le joueur, ça marche. Mais un chariot est garé sous l’arche, et l’Output Log se remplit d’erreurs. Trouve pourquoi et corrige.',
  recalls: ['print'],
  notions: ['Get Component by Class', 'Accessed None', 'Is Valid'],
  remember:
    'Get Component by Class renvoie None quand l’acteur n’a pas ce composant : c’est normal, pas une erreur. Ce qui est une erreur, c’est de s’en servir sans Is Valid.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Sante** est l’Actor Component de « La santé est partout » : une Vie, InfligerDegats, OnMort. **BP_Joueur** le porte (Vie 100).\n\n' +
        '**BP_Scanner** : **ActorBeginOverlap** → **Get Component by Class** (Target = Other Actor, Component Class = BP_Sante) → Get Vie → Print « Vie : … ».\n\n' +
        '**BP_Chariot** est garé sous l’arche dès le lancement. Il n’a pas de santé.',
    },
    {
      title: 'Ce qu’on attend',
      body:
        '- Pour le joueur : « Vie : 100 ».\n- Pour tout ce qui n’a pas de santé : « Rien à mesurer ».\n- Aucune erreur dans l’Output Log.',
    },
    {
      title: 'Ce qui est nouveau : Get Component by Class',
      body:
        '**Get Component by Class** cherche, sur l’acteur relié à Target, un composant de la classe choisie, **sans savoir ce qu’est l’acteur** : pas besoin de Cast vers BP_Joueur, BP_Robot… Sa sortie est typée BP_Sante : ses variables et fonctions s’y branchent.\n\n' +
        'Si l’acteur n’a pas ce composant, la sortie vaut **None**.',
    },
    DEBUG_METHOD,
  ],
  objectives: ['Lance Play et lis l’Output Log : quelle erreur, sur quel nœud ?', 'Pour le joueur : « Vie : 100 » ; pour le chariot : « Rien à mesurer ».', 'Plus aucune erreur.'],
  hints: [
    'Quel acteur déclenche l’erreur : le joueur ou le chariot ? Que renvoie Get Component by Class pour un acteur qui n’a pas de BP_Sante ?',
    'Is Valid, Print String.',
    'Solution : entre ActorBeginOverlap et le Print, un Is Valid sur la sortie de Get Component by Class. Is Valid → Print « Vie : … » ; Is Not Valid → Print « Rien à mesurer ».',
  ],
  challenge: 'Le scanner pourrait aussi soigner : appelle une fonction Soigner de BP_Sante quand la Vie est sous 50. Où écrire Soigner pour que tout ce qui a une santé en profite ?',
  setup: project,
  scenario: [{ wait: 0.3 }, ...goTo(...SCANNER, 0.3)],
  checks: [
    {
      id: 'player',
      label: 'Pour le joueur : « Vie : 100 »',
      test: (cx) => (cx.prints().some((p) => p.trim() === 'Vie : 100') ? true : `Messages : ${cx.prints().map((p) => `« ${p} »`).join(', ') || 'aucun'}. Le joueur devrait donner « Vie : 100 ».`),
    },
    {
      id: 'cart',
      label: 'Pour le chariot : « Rien à mesurer »',
      test: (cx) => (countPrints(cx, NOTHING) > 0 ? true : 'Le chariot n’a pas de santé : le scanner devrait afficher « Rien à mesurer » pour lui.'),
    },
    {
      id: 'zero',
      label: 'Pas de « Vie : 0 » inventée',
      test: (cx) => (cx.prints().some((p) => p.trim() === 'Vie : 0') ? 'Le scanner affiche « Vie : 0 » pour le chariot : il lit une santé qui n’existe pas.' : true),
    },
    notion(usesNode('valid', 'BP_Scanner', ['flow.isValid', 'util.isValid'], 'Le scanner vérifie le composant avec Is Valid', 'Place un Is Valid sur la sortie de Get Component by Class.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Scanner');
    const sante = p.classes.find((c) => c.name === 'BP_Sante')!;
    wipe(b.graph);
    scannerGraph(b, sante.id, sante.variables.find((v) => v.name === 'Vie')!.id, true);
  },
};
