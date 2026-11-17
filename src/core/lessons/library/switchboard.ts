/**
 * V6, Avancé: "Le standard téléphonique" (E26). A registry: a Map from a
 * room number to the phone itself. Each phone signs itself in and out, the
 * switchboard never searches the level, and every operation says whether it
 * worked.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, fnDef, fnOf, getVar, override, ref, say, tap, varOf, SHARED_KEYS } from './kit';

const ROOMS = ['101', '102', '103', '102'];

function switchboardProject() {
  const pb = new ProjectBuilder('Le standard téléphonique');
  const p = pb.project;
  const phone = pb.blueprint('BP_Telephone');
  const board = pb.blueprint('BP_Standard');

  // The phone: rings when asked, and can be taken away (F) when Demontable.
  phone.component('StaticMesh', 'Combine', { sizeX: 60, sizeY: 40, color: '#b91c1c', blocks: false });
  phone.component('PointLight', 'Sonnerie', { visible: false, radius: 200, color: '#facc15' });
  phone.cls.autoReceiveInput = true;
  const room = editable(phone, 'Chambre', T.name, '');
  const boardRef = editable(phone, 'Standard', T.object('BP_Standard'));
  const removable = editable(phone, 'Demontable', T.bool, false);
  const ring = fnDef(p, phone, 'Sonner', [], [], false);
  const on = ring.f.node('component.setVisibility', {}, { visible: true }, [300, 0]);
  const tell = say(ring.f, [620, 0]);
  const text = ring.f.node('string.append', {}, { in1: ' sonne' }, [460, 200]);
  for (const l of Object.values(ring.graph.links)) delete ring.graph.links[l.id];
  ring.f.link(ring.entry, 'then', on, 'exec').target('Sonnerie', on).link(on, 'then', tell, 'exec').link(tell, 'then', ring.ret, 'exec');
  ring.f.link(getVar(ring.f, 'Chambre', [260, 220]), 'value', text, 'in0').link(text, 'result', tell, 'text');
  const f = phone.node('event.inputKey', { key: 'F', consumeInput: false }, {}, [64, 700]);
  const can = phone.node('flow.branch', {}, {}, [340, 700]);
  const gone = phone.node('actor.destroy', {}, {}, [640, 700]);
  phone.link(f, 'pressed', can, 'exec').link(getVar(phone, 'Demontable', [160, 880]), 'value', can, 'condition').link(can, 'true', gone, 'exec');

  // The switchboard: three functions to write, and a caller that uses them.
  board.component('StaticMesh', 'Pupitre', { sizeX: 140, sizeY: 70, color: '#1e3a8a' });
  board.component('TextRender', 'Etiquette', { y: -70, text: 'Standard' });
  board.cls.autoReceiveInput = true;
  board.variable('Registre', T.map(T.name, T.object('BP_Telephone')), []);
  board.variable('Demandes', T.array(T.name), ['101', '102', '999']);
  fnDef(p, board, 'Inscrire', [['Chambre', T.name], ['Telephone', T.object('BP_Telephone')]], [['Accepte', T.bool]]);
  fnDef(p, board, 'Retirer', [['Chambre', T.name]], []);
  const callRoom = fnDef(p, board, 'Appeler', [['Chambre', T.name]], [['Trouve', T.bool]]);
  const dial = fnDef(p, board, 'Composer', [['Chambre', T.name]], []);
  const ask = dial.f.node('call.function', { graph: callRoom.graph.id }, {}, [300, 0]);
  const found = dial.f.node('flow.branch', {}, {}, [620, 0]);
  const yes = say(dial.f, [940, -80]);
  const no = say(dial.f, [940, 160]);
  const yesText = dial.f.node('string.append', {}, { in1: ' : appel' }, [760, 60]);
  const noText = dial.f.node('string.append', {}, { in1: ' : introuvable' }, [760, 320]);
  dial.f.link(dial.entry, 'then', ask, 'exec').link(dial.entry, dial.pin.Chambre, ask, callRoom.pin.Chambre).link(ask, 'then', found, 'exec').link(ask, callRoom.pin.Trouve, found, 'condition');
  dial.f.link(found, 'true', yes, 'exec').link(found, 'false', no, 'exec');
  dial.f.link(dial.entry, dial.pin.Chambre, yesText, 'in0').link(yesText, 'result', yes, 'text').link(dial.entry, dial.pin.Chambre, noText, 'in0').link(noText, 'result', no, 'text');
  const e = board.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const each = board.node('flow.forEachLoop', {}, {}, [340, 96]);
  const one = board.node('call.function', { graph: dial.graph.id }, {}, [680, 96]);
  board.link(e, 'pressed', each, 'exec').link(getVar(board, 'Demandes', [160, 300]), 'value', each, 'array').link(each, 'body', one, 'exec').link(each, 'element', one, dial.pin.Chambre);
  const space = board.node('event.inputKey', { key: 'SpaceBar' }, {}, [64, 480]);
  const last = board.node('call.function', { graph: dial.graph.id }, { [dial.pin.Chambre]: '103' }, [340, 480]);
  board.link(space, 'pressed', last, 'exec');

  const desk = pb.place(board, 0, -260);
  ROOMS.forEach((r, i) => {
    const a = pb.place(phone, -300 + i * 200, 0);
    override(pb, a, room, r);
    override(pb, a, boardRef, ref(desk));
    if (r === '103') override(pb, a, removable, true);
  });
  pb.playerStart(0, 300);
  return pb.project;
}

const PHONES = ['BP_Telephone', 'BP_Telephone2', 'BP_Telephone3', 'BP_Telephone4'];
const rings = (cx: CheckContext, label: string) => !!cx.component(label, 'Sonnerie')?.props.visible;
const registry = (cx: CheckContext) => (varOf(cx, 'BP_Standard', 'Registre') as [string, unknown][] | undefined) ?? [];
const keys = (cx: CheckContext) => registry(cx).map((pair) => String(pair[0])).sort();

export const lessonSwitchboard: Lesson = {
  id: 'l-standard',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Le standard téléphonique',
  situation:
    'Un hôtel : un standard et des téléphones de chambre, chacun avec son numéro. E appelle les chambres 101, 102 et 999 ; F démonte le téléphone de la 103 ; Espace appelle la 103. Les trois fonctions du standard sont vides, et aucun téléphone ne s’y inscrit. Attention : deux téléphones portent le numéro 102.',
  notions: ['Map', 'Registre', 'Add', 'Contains', 'Find', 'Remove', 'Fonction d’un autre Blueprint', 'Event Destroyed', 'Self'],
  remember:
    'Un registre est une Map « identifiant → référence » tenue par un seul Blueprint : chacun s’y inscrit à son BeginPlay et s’en retire à sa destruction. On retrouve alors n’importe qui par son identifiant, sans jamais fouiller le niveau. Add écrase une clé déjà présente : teste Contains avant.',
  cards: [
    {
      title: 'Le problème à résoudre',
      body:
        'Le standard doit faire sonner **une chambre précise**, d’après son numéro. Il lui faut donc passer d’un numéro (`102`) à **l’acteur** qui porte ce numéro.\n\n' +
        'Mauvaise piste : chercher dans tout le niveau à chaque appel (Get All Actors Of Class, puis une boucle qui compare les numéros). C’est lent, et c’est le standard qui devrait connaître les entrailles des téléphones.\n\n' +
        'Bonne piste : un **registre**. Le standard garde une **Map** `Registre` dont la clé est le numéro (Name) et la valeur le téléphone (référence BP_Telephone). Elle est déjà créée, vide.\n\n' + SHARED_KEYS,
    },
    {
      title: 'Les quatre nœuds d’une Map',
      body:
        'Tous prennent la Map sur **Target Map** (relie-y Get Registre) et une **Key**.\n\n' +
        '- **Add** (fil blanc) : range Value sous Key. Si la clé existe déjà, l’ancienne valeur est **remplacée sans prévenir**.\n' +
        '- **Contains** (vert) : vrai si la clé existe.\n' +
        '- **Find** (vert) : donne la **Value** rangée sous Key, et un Boolean (la pin sans nom, en bas) qui dit si la clé existait. Clé absente : Value est vide (None), sans erreur.\n' +
        '- **Remove** (fil blanc) : retire la clé ; son Return Value dit si elle était là.\n\n' +
        'Add et Remove ont une pin en losange : elles modifient la variable reliée. Relie-y toujours un Get de la variable.',
    },
    {
      title: 'Les trois fonctions du standard',
      body:
        'Elles existent, avec leurs entrées et sorties : ouvre-les dans My Blueprint › Functions de **BP_Standard**. Il reste à écrire leur contenu.\n\n' +
        '**Inscrire** (Chambre, Telephone → Accepte) : si la chambre est déjà dans le Registre, on refuse (Accepte = faux) sans rien changer. Sinon Add, et Accepte = vrai. Deux **Return Node**, un par cas : touche chacun pour régler `Accepte`.\n\n' +
        '**Appeler** (Chambre → Trouve) : Find. Si la clé existe, appelle **Sonner** sur la Value (tire un fil depuis Value et cherche Sonner), Trouve = vrai. Sinon Trouve = faux.\n\n' +
        '**Retirer** (Chambre) : Remove.\n\n' +
        'La fonction **Composer**, déjà écrite, appelle Appeler et affiche « 101 : appel » ou « 999 : introuvable ». Lis-la : c’est l’usage d’une fonction qui **dit si elle a réussi**.',
    },
    {
      title: 'Chaque téléphone s’occupe de lui-même',
      body:
        'Dans **BP_Telephone**, la référence `Standard` est déjà réglée sur chaque téléphone du niveau.\n\n' +
        '**Event BeginPlay** : appelle **Inscrire** sur `Standard`, avec `Chambre` et **Self** (le nœud Self, « moi-même », est la référence de l’acteur qui exécute le graphe). Si Accepte est faux, affiche « Déjà inscrite : » suivi du numéro (Append).\n\n' +
        '**Event Destroyed** s’exécute juste avant qu’un acteur disparaisse : appelle **Retirer** avec `Chambre`. Sans cela, le Registre garde une référence vers un téléphone qui n’existe plus, et le prochain appel de la 103 tombe sur une référence morte.\n\n' +
        'C’est le sens du schéma : le standard ne sait pas combien il y a de téléphones ni où ils sont. Ajouter une chambre, c’est poser un téléphone dans le niveau, rien d’autre.',
    },
  ],
  objectives: [
    'BP_Standard : écris Inscrire (refuse un numéro déjà pris), Appeler (fait sonner la bonne chambre, dit si elle existe) et Retirer.',
    'BP_Telephone, au BeginPlay : s’inscrire au Standard avec Chambre et Self ; si c’est refusé, afficher « Déjà inscrite : 102 ».',
    'BP_Telephone, à Event Destroyed : se retirer du Standard.',
    'Touche Vérifier : E appelle 101, 102 et 999 ; F démonte la 103 ; Espace l’appelle.',
  ],
  hints: [
    'Commence par Inscrire et le BeginPlay du téléphone, puis lance Play : ☷ (Outliner) montre le Registre du standard se remplir.',
    'Nœuds. Standard : Get Registre, Contains, Branch, Add, Return Node, Find, Sonner, Remove. Téléphone : Event BeginPlay, Get Standard, Inscrire, Get Chambre, Self, Branch, Append, Print String, Event Destroyed, Retirer.',
    'Solution. Inscrire : Branch (Contains) → True : Return (Accepte faux) ; False : Add → Return (Accepte vrai). Appeler : Branch (Boolean de Find) → True : Sonner sur Value → Return (Trouve vrai) ; False : Return (faux). Retirer : Remove. Téléphone : BeginPlay → Inscrire (Standard, Chambre, Self) → Branch (Accepte) → False : Print « Déjà inscrite : » + Chambre. Event Destroyed → Retirer (Standard, Chambre).',
  ],
  challenge:
    'Le téléphone refusé ne doit pas, en disparaissant, retirer l’inscription de l’autre 102 : donne à Retirer une seconde entrée Telephone, et ne retire la clé que si la Value trouvée est bien ce téléphone (Equal (Object)).',
  setup: switchboardProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, ...tap('E'), { checkpoint: 'appels' }, ...tap('F'), { wait: 0.2 }, ...tap('SpaceBar')],
  checks: [
    {
      id: 'registry',
      label: 'Au lancement, le Registre contient 101, 102 et 103',
      at: 'debut',
      test: (cx) => {
        const k = keys(cx);
        if (k.join() === '101,102,103') return true;
        if (!k.length) return 'Le Registre est vide : chaque téléphone doit appeler Inscrire sur son Standard au BeginPlay, et Inscrire doit faire un Add.';
        return `Le Registre contient : ${k.join(', ')}. Il fallait 101, 102, 103, chacun une fois.`;
      },
    },
    {
      id: 'duplicate',
      label: 'Le second téléphone 102 est refusé : « Déjà inscrite : 102 », une fois',
      at: 'debut',
      test: (cx) => {
        const n = cx.prints().filter((t) => /d[eé]j[aà]/i.test(t) && t.includes('102')).length;
        if (n === 1) return true;
        if (n === 0) return 'Aucun refus annoncé pour le second 102. Add remplace la valeur d’une clé qui existe : teste Contains avant, renvoie Accepte faux, et affiche « Déjà inscrite : 102 » côté téléphone.';
        return `Le refus s’affiche ${n} fois : un seul des deux téléphones 102 doit être refusé.`;
      },
    },
    {
      id: 'rings',
      label: 'E : la 101 sonne, une seule 102 sonne, la 103 ne sonne pas',
      at: 'appels',
      test: (cx) => {
        const r = PHONES.map((l) => rings(cx, l));
        if (!r[0]) return 'La chambre 101 ne sonne pas : Appeler doit trouver le téléphone dans le Registre (Find) et appeler Sonner sur la Value.';
        if (r[2]) return 'La 103 sonne alors que personne ne l’a appelée : Sonner doit viser la Value trouvée pour la chambre demandée.';
        if (r[1] && r[3]) return 'Les deux téléphones 102 sonnent : un seul est inscrit, c’est lui seul que le standard doit atteindre.';
        return r[1] || r[3] ? true : 'Aucun téléphone 102 ne sonne.';
      },
    },
    {
      id: 'unknown',
      label: 'La 999 est annoncée introuvable, sans erreur',
      at: 'appels',
      test: (cx) => {
        if (countPrints(cx, '999 : introuvable') !== 1) return 'Il fallait « 999 : introuvable » une fois : Appeler doit renvoyer Trouve = faux quand Find ne trouve pas la clé.';
        return countPrints(cx, '101 : appel') === 1 && countPrints(cx, '102 : appel') === 1 ? true : 'Il fallait aussi « 101 : appel » et « 102 : appel » : Appeler doit renvoyer Trouve = vrai quand la chambre existe.';
      },
    },
    {
      id: 'removed',
      label: 'Le téléphone démonté quitte le Registre : la 103 devient introuvable',
      test: (cx) => {
        if (keys(cx).includes('103')) return 'La 103 est encore dans le Registre après la destruction de son téléphone : à Event Destroyed, il doit appeler Retirer.';
        return countPrints(cx, '103 : introuvable') === 1 ? true : 'Après le démontage, Espace devait afficher « 103 : introuvable ».';
      },
    },
    notion(usesNode('contains', 'BP_Standard', ['map.contains', 'map.find'], 'Inscrire vérifie avant d’ajouter', 'Teste la clé (Contains) avant Add.')),
    notion(notUsing('search', 'BP_Standard', ['actor.getAllOfClass', 'actor.getOfClass'], 'Le standard ne fouille pas le niveau', 'Le standard cherche les téléphones dans le niveau : le Registre sert justement à l’éviter.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const board = edit(p, 'BP_Standard');
    const phone = edit(p, 'BP_Telephone');
    // Inscrire
    const sign = fnOf(board, 'Inscrire');
    const has = sign.f.node('map.contains', {}, {}, [240, 220]);
    const br = sign.f.node('flow.branch', {}, {}, [420, 0]);
    const add = sign.f.node('map.add', {}, {}, [720, 120]);
    const refused = sign.f.node('fn.return', { graph: sign.graph.id }, { [sign.pin.Accepte]: false }, [720, -160]);
    sign.f.link(getVar(sign.f, 'Registre', [40, 230]), 'value', has, 'map').link(sign.entry, sign.pin.Chambre, has, 'key');
    sign.f.link(sign.entry, 'then', br, 'exec').link(has, 'result', br, 'condition').link(br, 'true', refused, 'exec').link(br, 'false', add, 'exec');
    sign.f.link(getVar(sign.f, 'Registre', [520, 330]), 'value', add, 'map').link(sign.entry, sign.pin.Chambre, add, 'key').link(sign.entry, sign.pin.Telephone, add, 'value').link(add, 'then', sign.ret, 'exec');
    sign.graph.nodes[sign.ret].defaults[sign.pin.Accepte] = true;
    // Retirer
    const out = fnOf(board, 'Retirer');
    const rem = out.f.node('map.remove', {}, {}, [300, 0]);
    out.f.link(out.entry, 'then', rem, 'exec').link(getVar(out.f, 'Registre', [120, 200]), 'value', rem, 'map').link(out.entry, out.pin.Chambre, rem, 'key').link(rem, 'then', out.ret, 'exec');
    // Appeler
    const callRoom = fnOf(board, 'Appeler');
    const ring = fnOf(phone, 'Sonner');
    const find = callRoom.f.node('map.find', {}, {}, [240, 220]);
    const found = callRoom.f.node('flow.branch', {}, {}, [420, 0]);
    const go = callRoom.f.node('call.function', { graph: ring.graph.id, owner: phone.cls.id }, {}, [720, -120]);
    const none = callRoom.f.node('fn.return', { graph: callRoom.graph.id }, { [callRoom.pin.Trouve]: false }, [720, 200]);
    callRoom.f.link(getVar(callRoom.f, 'Registre', [40, 230]), 'value', find, 'map').link(callRoom.entry, callRoom.pin.Chambre, find, 'key');
    callRoom.f.link(callRoom.entry, 'then', found, 'exec').link(find, 'result', found, 'condition').link(found, 'true', go, 'exec').link(found, 'false', none, 'exec');
    callRoom.f.link(find, 'value', go, 'target').link(go, 'then', callRoom.ret, 'exec');
    callRoom.graph.nodes[callRoom.ret].defaults[callRoom.pin.Trouve] = true;
    // The phone signs itself in and out.
    const begin = phone.node('event.beginPlay', {}, {}, [64, 96]);
    const join = phone.node('call.function', { graph: sign.graph.id, owner: board.cls.id }, {}, [400, 96]);
    const ok = phone.node('flow.branch', {}, {}, [760, 96]);
    const warn = say(phone, [1100, 200]);
    const text = phone.node('string.append', {}, { in0: 'Déjà inscrite : ' }, [900, 360]);
    const me = phone.node('actor.self', {}, {}, [200, 420]);
    phone.link(begin, 'then', join, 'exec').link(getVar(phone, 'Standard', [160, 260]), 'value', join, 'target').link(getVar(phone, 'Chambre', [200, 340]), 'value', join, sign.pin.Chambre).link(me, 'self', join, sign.pin.Telephone);
    phone.link(join, 'then', ok, 'exec').link(join, sign.pin.Accepte, ok, 'condition').link(ok, 'false', warn, 'exec');
    phone.link(getVar(phone, 'Chambre', [700, 400]), 'value', text, 'in1').link(text, 'result', warn, 'text');
    const dead = phone.node('event.destroyed', {}, {}, [64, 460]);
    const leave = phone.node('call.function', { graph: out.graph.id, owner: board.cls.id }, {}, [400, 460]);
    phone.link(dead, 'then', leave, 'exec').link(getVar(phone, 'Standard', [160, 600]), 'value', leave, 'target').link(getVar(phone, 'Chambre', [200, 680]), 'value', leave, out.pin.Chambre);
  },
};
