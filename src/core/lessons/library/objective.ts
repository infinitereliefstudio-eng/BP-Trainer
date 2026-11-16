/**
 * V6, Confirmé: "Ajouter un objectif sans tout casser" (E22). A working
 * mission (get the card, reach the exit) gains a second condition (restore
 * the power). The lesson is as much about what must keep working as about
 * what is added: the checks replay the old behaviour too.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { editable, getVar, goTo, nodeOf, nodesOf, override, ref, say, setVar, varId } from './kit';
import { playerBlueprint } from './props';

const DONE = 'Mission accomplie';
const NO_CARD = 'Il manque la carte';
const NO_POWER = 'Le courant est coupé';

const EXIT: ScenarioStep[] = [...goTo(600, 0), ...goTo(250, 0)];
const CARD = goTo(0, -300);
const POWER = goTo(0, 300);

function missionProject() {
  const pb = new ProjectBuilder('Ajouter un objectif');
  const { b: player } = playerBlueprint(pb);
  const hasCard = player.variable('bCarte', T.bool, false);

  const card = pb.blueprint('BP_Carte');
  card.component('StaticMesh', 'Carte', { sizeX: 40, sizeY: 26, color: '#38bdf8', blocks: false });
  card.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  const co = card.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cc = card.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
  const cs = card.node('var.setExternal', { owner: player.cls.id, variable: hasCard }, { value: true }, [680, 96]);
  const cp = say(card, [1000, 96], 'Carte ramassée');
  card.link(co, 'then', cc, 'exec').link(co, 'other', cc, 'object').link(cc, 'then', cs, 'exec').link(cc, 'as', cs, 'target').link(cs, 'then', cp, 'exec').link(cp, 'then', card.node('actor.destroy', {}, {}, [1300, 96]), 'exec');

  const gen = pb.blueprint('BP_Generateur');
  gen.component('StaticMesh', 'Moteur', { sizeX: 100, sizeY: 70, color: '#3f6212', blocks: false });
  gen.component('BoxCollision', 'Zone', { sizeX: 180, sizeY: 180 });
  gen.variable('bEnMarche', T.bool, false);
  const go = gen.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const off = gen.node('flow.branch', {}, {}, [360, 96]);
  const on = setVar(gen, 'bEnMarche', [660, 200], true);
  gen.link(go, 'then', off, 'exec').link(getVar(gen, 'bEnMarche', [180, 280]), 'value', off, 'condition').link(off, 'false', on, 'exec').link(on, 'then', say(gen, [960, 200], 'Courant rétabli'), 'exec');

  const exit = pb.blueprint('BP_Sortie');
  exit.component('StaticMesh', 'Sas', { sizeX: 30, sizeY: 200, x: 110, color: '#52525b', blocks: false });
  exit.component('PointLight', 'Voyant', { visible: false, radius: 260, color: '#22c55e' });
  exit.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  const power = editable(exit, 'Generateur', T.object('BP_Generateur'));
  const eo = exit.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const ec = exit.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
  const got = exit.node('var.getExternal', { owner: player.cls.id, variable: hasCard }, {}, [560, 320]);
  const ok = exit.node('flow.branch', {}, {}, [760, 96]);
  const once = exit.node('flow.doOnce', {}, {}, [1060, 40]);
  const win = say(exit, [1340, 40], DONE);
  const lit = exit.node('component.setVisibility', {}, { visible: true }, [1640, 40]);
  const no = say(exit, [1340, 360], NO_CARD);
  exit.link(eo, 'then', ec, 'exec').link(eo, 'other', ec, 'object').link(ec, 'then', ok, 'exec').link(ec, 'as', got, 'target').link(got, 'value', ok, 'condition');
  exit.link(ok, 'true', once, 'exec').link(once, 'completed', win, 'exec').link(win, 'then', lit, 'exec').target('Voyant', lit).link(ok, 'false', no, 'exec');

  pb.place(card, 0, -300);
  const g = pb.place(gen, 0, 300);
  const e = pb.place(exit, 600, 0);
  override(pb, e, power, ref(g));
  pb.playerStart(-300, 0);
  return pb.project;
}

const n = (cx: CheckContext, text: string) => countPrints(cx, text);

function counts(id: string, at: string | undefined, label: string, want: [number, number, number], why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const got = [n(cx, DONE), n(cx, NO_CARD), n(cx, NO_POWER)];
      if (got.every((v, i) => v === want[i])) return true;
      return `Jusqu’ici : « ${DONE} » ×${got[0]}, « ${NO_CARD} » ×${got[1]}, « ${NO_POWER} » ×${got[2]} ; attendu ×${want[0]}, ×${want[1]}, ×${want[2]}. ${why}`;
    },
  };
}

export const lessonObjective: Lesson = {
  id: 'l-objectif',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'Ajouter un objectif sans tout casser',
  situation:
    'La mission marche : ramasser la carte, puis rejoindre la sortie, qui annonce « Mission accomplie » (sans la carte : « Il manque la carte »). On ajoute un objectif : rétablir le courant au générateur. La sortie doit maintenant exiger les deux, dans n’importe quel ordre, et dire ce qui manque. Le générateur est déjà posé et relié à la sortie.',
  notions: ['Faire évoluer un graphe', 'AND Boolean', 'Variable d’un autre Blueprint', 'Sequence', 'DoOnce', 'Test de régression'],
  remember:
    'Avant de modifier un graphe qui marche, écris la liste de ce qu’il fait déjà : c’est ta liste de tests, à rejouer après le changement avec les nouveaux cas. Et garde les conditions dans des variables d’état (bCarte, bEnMarche) qu’on relit au moment de décider : l’ordre dans lequel le joueur fait les choses n’a alors plus d’importance.',
  cards: [
    {
      title: 'Lire avant de toucher',
      body:
        'Ouvre **BP_Sortie**. Quand le joueur entre dans sa Zone : **Cast To BP_Joueur**, lecture de `bCarte` sur le joueur, puis un **Branch**.\n\n' +
        '- True : un **DoOnce**, puis « Mission accomplie » et le voyant vert. Le DoOnce garantit une seule annonce même si le joueur repasse.\n' +
        '- False : « Il manque la carte ».\n\n' +
        'Note ce comportement, c’est ce qui ne doit **pas changer** : sans carte, le message ; avec, l’annonce, une fois.\n\n' +
        '**BP_Generateur** est nouveau : quand le joueur le touche, `bEnMarche` passe à vrai et il affiche « Courant rétabli ». La sortie a une variable `Generateur`, déjà reliée dans le niveau (la flèche, hors Play).',
    },
    {
      title: 'La nouvelle règle',
      body:
        'La mission est accomplie quand le joueur a la carte **et** que le courant est rétabli. Deux Boolean, un **AND Boolean** : vrai seulement si les deux le sont.\n\n' +
        'Le second Boolean se lit sur le générateur : tire un fil depuis **Get Generateur** et cherche `bEnMarche`. C’est la lecture d’une variable d’un autre Blueprint, comme `bCarte` sur le joueur.\n\n' +
        'Remplace la condition du Branch par ce AND. Le côté True ne change pas.\n\n' +
        'Remarque : la sortie **relit** les deux variables à chaque passage. Elle n’a pas besoin de savoir lequel des deux a été fait en premier, ni d’être prévenue quand ça arrive.',
    },
    {
      title: 'Dire ce qui manque',
      body:
        'Côté False, il peut manquer la carte, le courant, ou les deux. Deux questions indépendantes, donc deux Branch, l’un après l’autre.\n\n' +
        '**Sequence** exécute ses sorties dans l’ordre : Then 0 jusqu’au bout, puis Then 1. Mets-en un sur False :\n\n' +
        '- Then 0 : Branch sur `bCarte` ; False → « Il manque la carte » (le Print String existant).\n' +
        '- Then 1 : Branch sur `bEnMarche` ; False → « Le courant est coupé ».\n\n' +
        'Sans Sequence, on enchaînerait les deux Branch par leurs sorties, et le graphe deviendrait un escalier difficile à relire.',
    },
    {
      title: 'Rejouer tous les cas',
      body:
        'Le test joue la matrice complète, anciens cas compris :\n\n' +
        '- la sortie trop tôt : les deux messages, pas d’annonce ;\n' +
        '- la carte seule, puis la sortie : seul « Le courant est coupé » ;\n' +
        '- le courant rétabli, puis la sortie : « Mission accomplie » et le voyant ;\n' +
        '- la sortie une seconde fois : rien de plus.\n\n' +
        'Puis « Et si… » rejoue l’autre ordre : le courant d’abord, la carte ensuite.\n\n' +
        'Dans UE, prends l’habitude de cette liste écrite avant chaque évolution. Un changement « qui marche » sur le nouveau cas et casse un ancien est le bug le plus courant d’un projet qui grandit.',
    },
  ],
  objectives: [
    'La sortie n’annonce « Mission accomplie » que si le joueur a la carte ET que le générateur est en marche.',
    'Sans la carte : « Il manque la carte ». Sans courant : « Le courant est coupé ». Les deux s’il manque les deux.',
    'L’annonce et le voyant restent uniques, même si le joueur repasse.',
  ],
  hints: [
    'Tout se passe dans BP_Sortie, autour du Branch existant : sa condition, et ce qui suit sa sortie False.',
    'Nœuds : Get Generateur, Get bEnMarche (sur le générateur), AND Boolean, Sequence, deux Branch, un Print String.',
    'Solution : Branch (bCarte AND bEnMarche) → True : inchangé. False : Sequence → Then 0 : Branch (bCarte) → False : « Il manque la carte » ; Then 1 : Branch (bEnMarche) → False : « Le courant est coupé ».',
  ],
  challenge: 'Ajoute un objectif facultatif : une seconde carte, bonus. La sortie affiche « Bonus trouvé » dans son annonce si le joueur l’a, mais ne l’exige pas.',
  setup: missionProject,
  scenario: [{ wait: 0.2 }, ...EXIT, { checkpoint: 'tot' }, ...CARD, ...EXIT, { checkpoint: 'carte' }, ...POWER, ...EXIT, { checkpoint: 'tout' }, ...EXIT],
  checks: [
    counts('early', 'tot', 'La sortie trop tôt : les deux messages, pas d’annonce', [0, 1, 1], 'Sans carte ni courant, la sortie doit dire les deux choses qui manquent.'),
    counts('card', 'carte', 'Avec la carte mais sans courant : seulement « Le courant est coupé »', [0, 1, 2], 'La carte ne suffit plus : la condition du Branch doit être « bCarte AND bEnMarche », et le message de la carte ne doit s’afficher que si elle manque.'),
    counts('both', 'tout', 'La carte et le courant : « Mission accomplie »', [1, 1, 2], 'Avec la carte et le générateur en marche, la sortie doit annoncer la réussite.'),
    {
      id: 'light',
      label: 'Le voyant de la sortie s’allume à la réussite',
      at: 'tout',
      test: (cx) => (cx.component('BP_Sortie', 'Voyant')?.props.visible ? true : 'Le voyant de la sortie est resté éteint : le côté True du Branch ne doit pas changer.'),
    },
    counts('once', undefined, 'Repasser par la sortie n’annonce rien de plus', [1, 1, 2], 'L’annonce doit rester unique : garde le DoOnce sur le côté True.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const exit = edit(p, 'BP_Sortie');
    const gen = edit(p, 'BP_Generateur');
    const g = exit.graph;
    const ok = nodeOf(g, 'flow.branch');
    const got = nodeOf(g, 'var.getExternal');
    const no = nodesOf(g, 'debug.printString').find((x) => x.defaults.text === NO_CARD)!.id;
    for (const l of Object.values(g.links)) if (l.to.node === ok && l.to.pin === 'condition') delete g.links[l.id];
    for (const l of Object.values(g.links)) if (l.from.node === ok && l.from.pin === 'false') delete g.links[l.id];
    const running = exit.node('var.getExternal', { owner: gen.cls.id, variable: varId(gen, 'bEnMarche') }, {}, [560, 460]);
    const both = exit.node('logic.and', {}, {}, [760, 360]);
    exit.link(getVar(exit, 'Generateur', [360, 470]), 'value', running, 'target').link(got, 'value', both, 'a').link(running, 'value', both, 'b').link(both, 'result', ok, 'condition');
    const seq = exit.node('flow.sequence', {}, {}, [1000, 420]);
    const card = exit.node('flow.branch', {}, {}, [1240, 360]);
    const power = exit.node('flow.branch', {}, {}, [1240, 620]);
    exit.graph.nodes[no].x = 1540;
    exit.graph.nodes[no].y = 420;
    const dark = say(exit, [1540, 680], NO_POWER);
    exit.link(ok, 'false', seq, 'exec').link(seq, 'then0', card, 'exec').link(seq, 'then1', power, 'exec');
    exit.link(got, 'value', card, 'condition').link(card, 'false', no, 'exec').link(running, 'value', power, 'condition').link(power, 'false', dark, 'exec');
  },
  robustness: [
    {
      id: 'order',
      label: 'le joueur rétablit le courant avant de ramasser la carte',
      advice: 'La sortie doit relire bCarte et bEnMarche à chaque passage, sans supposer d’ordre entre les deux.',
      scenario: [{ wait: 0.2 }, ...POWER, ...EXIT, { checkpoint: 'courant' }, ...CARD, ...EXIT],
      checks: [
        counts('power-first', 'courant', 'le courant seul : « Il manque la carte »', [0, 1, 0], 'Avec le courant mais sans carte, seul le message de la carte doit s’afficher.'),
        counts('then-card', undefined, 'puis la carte : réussite', [1, 1, 0], 'L’ordre des deux objectifs ne doit pas compter.'),
      ],
    },
  ],
};
