/**
 * V6, Confirmé: "Débogue D12 — La régie et ses panneaux" (E25). Two classic
 * Event Dispatcher mistakes: a subscriber that never reads the state it
 * missed, and one that changes source without unsubscribing from the old
 * one. First lesson where Unbind is needed.
 */
import { addDispatcher, addDispatcherParam } from '../../operations/classOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { Check, Lesson } from '../types';
import { DEBUG_METHOD, editable, getVar, nodeOf, nodesOf, override, ref, setVar, tap, varId, SHARED_KEYS } from './kit';

function stageProject() {
  const pb = new ProjectBuilder('Débogue D12');
  // The control desk: E toggles desk 1, F toggles desk 2, and each announces its changes.
  const desk = pb.blueprint('BP_Regie');
  desk.component('StaticMesh', 'Pupitre', { sizeX: 110, sizeY: 60, color: '#7c3aed' });
  desk.component('TextRender', 'Etiquette', { y: -60, text: 'Régie' });
  desk.cls.autoReceiveInput = true;
  editable(desk, 'Numero', T.int, 1);
  editable(desk, 'EnCours', T.bool, false);
  const d = addDispatcher(desk.cls, 'OnEtatChange');
  addDispatcherParam(desk.cls, d.id, T.bool);
  d.params[0].name = 'EnCours';
  const toggle = desk.node('event.custom', { name: 'Basculer' }, {}, [64, 620]);
  const not = desk.node('logic.not', {}, {}, [240, 820]);
  const set = setVar(desk, 'EnCours', [400, 620]);
  const call = desk.node('dispatcher.call', { owner: desk.cls.id, dispatcher: d.id }, {}, [720, 620]);
  desk.link(toggle, 'then', set, 'exec').link(getVar(desk, 'EnCours', [64, 830]), 'value', not, 'a').link(not, 'result', set, 'value');
  desk.link(set, 'then', call, 'exec').link(set, 'out', call, d.params[0].id);
  for (const [key, num, y] of [
    ['E', 1, 96],
    ['F', 2, 340],
  ] as const) {
    const k = desk.node('event.inputKey', { key, consumeInput: false }, {}, [64, y]);
    const eq = desk.node('math.equalInt', {}, { b: num }, [220, y + 150]);
    const br = desk.node('flow.branch', {}, {}, [400, y]);
    const go = desk.node('call.custom', { event: 'Basculer' }, {}, [700, y]);
    desk.link(k, 'pressed', br, 'exec').link(getVar(desk, 'Numero', [64, y + 160]), 'value', eq, 'a').link(eq, 'result', br, 'condition').link(br, 'true', go, 'exec');
  }

  // The panel: lit while the show of its desk is on. Space moves a mobile panel to its other desk.
  const panel = pb.blueprint('BP_Panneau');
  panel.component('StaticMesh', 'Cadre', { sizeX: 90, sizeY: 30, color: '#334155', blocks: false });
  panel.component('PointLight', 'Voyant', { visible: false, radius: 240, color: '#22c55e' });
  panel.cls.autoReceiveInput = true;
  const source = editable(panel, 'Regie', T.object('BP_Regie'));
  const other = editable(panel, 'Autre', T.object('BP_Regie'));
  const mobile = editable(panel, 'Mobile', T.bool, false);
  const begin = panel.node('event.beginPlay', {}, {}, [64, 96]);
  const bind = panel.node('dispatcher.bind', { owner: desk.cls.id, dispatcher: d.id }, {}, [400, 96]);
  const upd = panel.node('event.custom', { name: 'Maj', signature: d.id, signatureOwner: desk.cls.id }, {}, [64, 400]);
  const vis = panel.node('component.setVisibility', {}, {}, [400, 400]);
  panel.link(begin, 'then', bind, 'exec').link(getVar(panel, 'Regie', [160, 270]), 'value', bind, 'target').link(upd, 'delegate', bind, 'event');
  panel.link(upd, 'then', vis, 'exec').link(upd, d.params[0].id, vis, 'visible').target('Voyant', vis);
  const space = panel.node('event.inputKey', { key: 'SpaceBar', consumeInput: false }, {}, [64, 700]);
  const isMobile = panel.node('flow.branch', {}, {}, [340, 700]);
  const change = setVar(panel, 'Regie', [640, 700]);
  const rebind = panel.node('dispatcher.bind', { owner: desk.cls.id, dispatcher: d.id }, {}, [960, 700]);
  panel.link(space, 'pressed', isMobile, 'exec').link(getVar(panel, 'Mobile', [160, 880]), 'value', isMobile, 'condition');
  panel.link(isMobile, 'true', change, 'exec').link(getVar(panel, 'Autre', [460, 880]), 'value', change, 'value');
  panel.link(change, 'then', rebind, 'exec').link(change, 'out', rebind, 'target').link(upd, 'delegate', rebind, 'event');

  const a = pb.place(desk, -300, -220);
  const b = pb.place(desk, 300, -220);
  override(pb, a, varId(desk, 'EnCours'), true); // the first show has already begun
  override(pb, b, varId(desk, 'Numero'), 2);
  const fixed = pb.place(panel, -300, 80);
  const moving = pb.place(panel, 0, 80);
  override(pb, fixed, source, ref(a));
  override(pb, moving, source, ref(a));
  override(pb, moving, other, ref(b));
  override(pb, moving, mobile, true);
  pb.playerStart(0, 320);
  return pb.project;
}

const FIXED = 'BP_Panneau';
const MOVING = 'BP_Panneau2';

function lit(id: string, at: string | undefined, label: string, want: [boolean, boolean], why: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const got = [FIXED, MOVING].map((l) => !!cx.component(l, 'Voyant')?.props.visible);
      if (got[0] === want[0] && got[1] === want[1]) return true;
      const word = (v: boolean) => (v ? 'allumé' : 'éteint');
      return `Panneau fixe ${word(got[0])}, panneau mobile ${word(got[1])} ; attendu : ${word(want[0])} et ${word(want[1])}. ${why}`;
    },
  };
}

export const debug12: Lesson = {
  id: 'd12-regie',
  kind: 'debug',
  code: 'D12',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'La régie et ses panneaux',
  situation:
    'Deux régies de spectacle (E bascule la première, F la seconde) et deux panneaux qui s’allument quand le spectacle de leur régie est en cours. Le premier spectacle a déjà commencé au lancement, pourtant les panneaux restent éteints. Et le panneau mobile (Espace le fait passer sur la seconde régie) continue d’obéir à l’ancienne.',
  notions: ['Event Dispatcher', 'Bind Event', 'Unbind Event', 'État courant et changement', 'Variable d’un autre Blueprint'],
  remember:
    'Un Event Dispatcher n’annonce que les changements à venir : en s’abonnant, on lit aussi l’état courant de la source. Et un abonnement dure jusqu’à son Unbind : avant de changer de source, on se désabonne de l’ancienne.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Regie** garde `EnCours` (vrai pendant le spectacle). Son événement `Basculer` inverse `EnCours`, puis fait **Call OnEtatChange** : tous les abonnés reçoivent la nouvelle valeur.\n\n' +
        '**BP_Panneau** a une référence `Regie` (réglée dans le niveau). Au BeginPlay il fait **Bind Event to OnEtatChange** : son événement `Maj` sera appelé à chaque Call, avec le paramètre `EnCours`, et règle le Voyant.\n\n' +
        'Le panneau mobile a aussi `Autre` : sur **Espace**, il range `Autre` dans `Regie` et s’abonne à cette nouvelle régie.\n\n' +
        'Dans le niveau, hors Play, une flèche relie chaque panneau à sa régie. La régie de gauche a `EnCours` coché dans Details : son spectacle est déjà lancé.\n\n' + SHARED_KEYS,
    },
    {
      title: 'Un Dispatcher ne raconte pas le passé',
      body:
        '**Call** prévient ceux qui sont abonnés **à ce moment-là**. Il ne rejoue rien pour celui qui s’abonne plus tard.\n\n' +
        'Ici, la première régie a `EnCours` à vrai dès le départ : aucun Call n’a eu lieu, et aucun n’aura lieu avant le prochain changement. Le panneau s’abonne, attend… et reste sur sa valeur de départ, éteint.\n\n' +
        'La règle : **s’abonner, puis lire l’état courant**. Juste après le Bind, lis `EnCours` sur la régie (tire un fil depuis Get Regie et cherche `EnCours`) et règle le Voyant avec. Cela vaut à chaque abonnement : au BeginPlay comme après un changement de régie.',
    },
    {
      title: 'Un abonnement ne s’en va pas tout seul',
      body:
        'Changer la variable `Regie` ne change pas les abonnements déjà faits : le Bind a été enregistré **chez l’ancienne régie**, et il y reste. Après Espace, le panneau mobile est donc abonné aux **deux** régies, et obéit à la dernière qui parle.\n\n' +
        '**Unbind Event from OnEtatChange** retire un abonnement. Ses pins sont celles du Bind :\n\n' +
        '- **Target** : la régie dont on se désabonne. Ici l’ancienne, donc `Regie` **avant** le Set.\n' +
        '- **Event** (carré rouge) : le même événement que celui du Bind, `Maj`.\n\n' +
        'L’ordre compte : Unbind (ancienne régie) → Set Regie → Bind (nouvelle régie) → lire son état.',
    },
    {
      title: 'Éviter de recopier',
      body:
        '« Lire l’état de la régie et régler le Voyant » sert deux fois : au BeginPlay et après Espace. Plutôt que de poser les mêmes nœuds deux fois, mets-les dans un **Custom Event** (par exemple `Synchroniser`) et appelle-le aux deux endroits.\n\n' +
        'Dans UE, on irait plus loin : la régie offrirait une fonction `GetEtat`, pour que les panneaux ne lisent pas sa variable directement. La leçon « Qui modifie quoi » en parle.',
    },
  ],
  objectives: [
    'Au lancement, les deux panneaux montrent déjà le spectacle en cours de la première régie.',
    'Après Espace, le panneau mobile montre tout de suite l’état de la seconde régie.',
    'Il n’obéit plus à la première : seul le panneau fixe la suit encore.',
  ],
  hints: [
    'Deux manques, tous deux dans BP_Panneau : rien ne lit l’état de la régie au moment de s’abonner, et rien ne retire l’abonnement à l’ancienne régie.',
    'Nœuds : Get EnCours (sur Regie), Set Visibility, Unbind Event from OnEtatChange, et un Custom Event pour ne pas recopier la lecture de l’état.',
    'Solution : Custom Event Synchroniser → Set Visibility (Voyant) avec EnCours lu sur Regie. BeginPlay → Bind → Synchroniser. Espace → Branch (Mobile) → Unbind (Target = Regie, Event = Maj) → Set Regie = Autre → Bind → Synchroniser.',
  ],
  challenge: 'Ajoute un Is Valid avant le Bind et avant l’Unbind : un panneau posé sans régie ne doit provoquer aucune erreur.',
  setup: stageProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    ...tap('E'),
    { checkpoint: 'arret' },
    ...tap('E'),
    ...tap('SpaceBar'),
    { checkpoint: 'bascule' },
    ...tap('F'),
    { checkpoint: 'seconde' },
    ...tap('E'),
    { checkpoint: 'ancienne' },
    ...tap('F'),
  ],
  checks: [
    lit('late', 'debut', 'Au lancement, les deux panneaux sont allumés', [true, true], 'Le spectacle de la première régie a commencé avant leur Bind : un Dispatcher n’annonce que les changements suivants. Après le Bind, lis EnCours sur la régie.'),
    lit('call', 'arret', 'E arrête le premier spectacle : les deux s’éteignent', [false, false], 'L’abonnement du BeginPlay doit rester en place.'),
    lit('switch', 'bascule', 'Après Espace, le panneau mobile montre la seconde régie (à l’arrêt)', [true, false], 'En changeant de régie, le panneau mobile doit lire tout de suite l’état de la nouvelle : elle est à l’arrêt.'),
    lit('new', 'seconde', 'F lance le second spectacle : le panneau mobile s’allume', [true, true], 'Après Espace, le panneau mobile doit être abonné à la seconde régie.'),
    lit('old', 'ancienne', 'E arrête le premier spectacle : le panneau mobile reste allumé', [false, true], 'Le panneau mobile obéit encore à la première régie : son ancien abonnement n’a pas été retiré. Fais un Unbind sur l’ancienne régie avant le Set.'),
    lit('end', undefined, 'F arrête le second spectacle : tout est éteint', [false, false], 'Le panneau mobile doit suivre la seconde régie.'),
    notion(usesNode('unbind', 'BP_Panneau', ['dispatcher.unbind', 'dispatcher.unbindAll'], 'Le panneau se désabonne de l’ancienne régie', 'Retire l’abonnement à l’ancienne régie avec Unbind Event.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const panel = edit(p, 'BP_Panneau');
    const desk = edit(p, 'BP_Regie');
    const g = panel.graph;
    const d = desk.cls.dispatchers[0];
    const [bind, rebind] = nodesOf(g, 'dispatcher.bind').map((n) => n.id);
    const upd = nodeOf(g, 'event.custom');
    const change = nodesOf(g, 'var.set')[0].id;
    const isMobile = nodeOf(g, 'flow.branch');
    // Synchroniser: the light shows the desk's current state.
    const sync = panel.node('event.custom', { name: 'Synchroniser' }, {}, [64, 1000]);
    const state = panel.node('var.getExternal', { owner: desk.cls.id, variable: varId(desk, 'EnCours') }, {}, [200, 1180]);
    const vis = panel.node('component.setVisibility', {}, {}, [520, 1000]);
    panel.link(sync, 'then', vis, 'exec').link(getVar(panel, 'Regie', [40, 1190]), 'value', state, 'target').link(state, 'value', vis, 'visible').target('Voyant', vis);
    const call1 = panel.node('call.custom', { event: 'Synchroniser' }, {}, [720, 96]);
    const call2 = panel.node('call.custom', { event: 'Synchroniser' }, {}, [1280, 700]);
    panel.link(bind, 'then', call1, 'exec').link(rebind, 'then', call2, 'exec');
    // Unbind from the old desk before changing.
    const unbind = panel.node('dispatcher.unbind', { owner: desk.cls.id, dispatcher: d.id }, {}, [500, 560]);
    for (const l of Object.values(g.links)) if (l.from.node === isMobile && l.from.pin === 'true') delete g.links[l.id];
    panel.link(isMobile, 'true', unbind, 'exec').link(getVar(panel, 'Regie', [340, 600]), 'value', unbind, 'target').link(upd, 'delegate', unbind, 'event').link(unbind, 'then', change, 'exec');
  },
};
