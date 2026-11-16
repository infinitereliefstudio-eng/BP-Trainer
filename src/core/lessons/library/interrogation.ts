/**
 * V6, Avancé: "L'interrogatoire" (E43). A dialogue driven by data: a Map
 * from a line's identifier to a structure (text, where each choice leads, the
 * fact a choice requires, the fact a line gives). One function walks it;
 * adding lines never adds nodes.
 */
import { addStruct, addStructMember, updateStructMember } from '../../operations/structOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, normText, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, fnDef, fnOf, getVar, goTo, override, ref, say, setVar, tap } from './kit';

const END = 'Fin du dialogue';
const MISSING = 'Réplique introuvable';

/** Lines: id, text, where E leads, where F leads, the fact F requires, the fact the line gives. */
const LINES: [string, string, string, string, string, string][] = [
  ['debut', 'Bonsoir inspecteur.', 'cinema', '', '', ''],
  ['cinema', 'J’étais au cinéma hier soir.', 'rien', 'ticket', 'ticket', ''],
  ['rien', 'Je n’ai rien à ajouter.', 'cinema', '', '', ''],
  ['ticket', 'Ce ticket… D’accord, je n’y étais pas.', 'aveu', '', '', 'mensonge'],
  ['aveu', 'J’ai vu quelqu’un sortir par la cave.', 'suite', '', '', 'cave'],
];

function talkProject() {
  const pb = new ProjectBuilder('L’interrogatoire');
  const p = pb.project;
  const r = addStruct(p, 'S_Replique');
  if (!r.ok) throw new Error(r.reason);
  const s = r.value;
  const m: Record<string, string> = {};
  const fields: [string, typeof T.string][] = [
    ['Texte', T.string],
    ['ChoixE', T.name],
    ['ChoixF', T.name],
    ['Exige', T.name],
    ['Donne', T.name],
  ];
  fields.forEach(([name, type], i) => {
    const member = i === 0 ? s.members[0] : addStructMember(p, s.id, type)!;
    updateStructMember(p, s.id, member.id, { name, type });
    m[name] = member.id;
  });

  const w = pb.blueprint('BP_Temoin');
  w.component('StaticMesh', 'Temoin', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#9a3412' });
  w.component('TextRender', 'Bulle', { y: -80, text: '' });
  w.cls.autoReceiveInput = true;
  w.variable(
    'Dialogue',
    T.map(T.name, T.struct('S_Replique')),
    LINES.map(([id, text, e, f, needs, gives]) => [id, { [m.Texte]: text, [m.ChoixE]: e, [m.ChoixF]: f, [m.Exige]: needs, [m.Donne]: gives }]),
  );
  w.variable('Courante', T.name, '');
  w.variable('Faits', T.set(T.name), []);
  // Apprendre: remember a fact (None is ignored), and say so the first time.
  const learn = fnDef(p, w, 'Apprendre', [['Fait', T.name]], [], false);
  for (const l of Object.values(learn.graph.links)) delete learn.graph.links[l.id];
  const lf = learn.f;
  const none = lf.node('name.isNone', {}, {}, [160, 200]);
  const known = lf.node('set.contains', {}, {}, [160, 340]);
  const skip = lf.node('logic.or', {}, {}, [340, 260]);
  const isNew = lf.node('flow.branch', {}, {}, [500, 0]);
  const add = lf.node('set.add', {}, {}, [780, 120]);
  const tell = say(lf, [1080, 120]);
  const text = lf.node('string.append', {}, { in0: 'Indice : ' }, [900, 320]);
  lf.link(learn.entry, 'then', isNew, 'exec').link(learn.entry, learn.pin.Fait, none, 'in').link(getVar(lf, 'Faits', [0, 350]), 'value', known, 'set').link(learn.entry, learn.pin.Fait, known, 'item');
  lf.link(none, 'result', skip, 'a').link(known, 'result', skip, 'b').link(skip, 'result', isNew, 'condition').link(isNew, 'false', add, 'exec');
  lf.link(getVar(lf, 'Faits', [620, 320]), 'value', add, 'set').link(learn.entry, learn.pin.Fait, add, 'item').link(add, 'then', tell, 'exec').link(learn.entry, learn.pin.Fait, text, 'in1').link(text, 'result', tell, 'text');
  // Terminer: close the dialogue, if one is open.
  const close = fnDef(p, w, 'Terminer', [], [], false);
  for (const l of Object.values(close.graph.links)) delete close.graph.links[l.id];
  const cf = close.f;
  const closed = cf.node('name.isNone', {}, {}, [160, 200]);
  const open = cf.node('flow.branch', {}, {}, [340, 0]);
  const forget = setVar(cf, 'Courante', [620, 120], '');
  const wipeText = cf.node('component.setText', {}, { value: '' }, [900, 120]);
  const bye = say(cf, [1200, 120], END);
  cf.link(close.entry, 'then', open, 'exec').link(getVar(cf, 'Courante', [0, 210]), 'value', closed, 'in').link(closed, 'result', open, 'condition');
  cf.link(open, 'false', forget, 'exec').link(forget, 'then', wipeText, 'exec').target('Bulle', wipeText).link(wipeText, 'then', bye, 'exec');
  // Aller: to write. Space opens the dialogue with it.
  const goFn = fnDef(p, w, 'Aller', [['Id', T.name]], []);
  const space = w.node('event.inputKey', { key: 'SpaceBar' }, {}, [64, 96]);
  const begin = w.node('call.function', { graph: goFn.graph.id }, { [goFn.pin.Id]: 'debut' }, [360, 96]);
  w.link(space, 'pressed', begin, 'exec');

  const ticket = pb.blueprint('BP_Ticket');
  ticket.component('StaticMesh', 'Ticket', { sizeX: 40, sizeY: 24, color: '#fde68a', blocks: false });
  ticket.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  const who = editable(ticket, 'Temoin', T.object('BP_Temoin'));
  const over = ticket.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const give = ticket.node('call.function', { graph: learn.graph.id, owner: w.cls.id }, { [learn.pin.Fait]: 'ticket' }, [400, 96]);
  const take = ticket.node('actor.destroy', {}, {}, [760, 96]);
  ticket.link(over, 'then', give, 'exec').link(getVar(ticket, 'Temoin', [200, 280]), 'value', give, 'target').link(give, 'then', take, 'exec');

  const witness = pb.place(w, 0, -100);
  const t = pb.place(ticket, 500, 200);
  override(pb, t, who, ref(witness));
  pb.playerStart(-200, 200);
  return pb.project;
}

const bubble = (cx: CheckContext) => String(cx.component('BP_Temoin', 'Bulle')?.props.text ?? '');
const facts = (cx: CheckContext) => ((cx.variable('BP_Temoin', 'Faits') as string[] | undefined) ?? []).map((f) => String(f).toLowerCase());

function shows(id: string, at: string | undefined, label: string, word: string, why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const text = bubble(cx);
      if (word === '' ? text === '' : normText(text).includes(normText(word))) return true;
      return `La bulle affiche ${text ? `« ${text} »` : 'un texte vide'}. ${why}`;
    },
  };
}

export const lessonTalk: Lesson = {
  id: 'l-interrogatoire',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'L’interrogatoire',
  situation:
    'Un témoin, cinq répliques rangées dans une Map. Espace ouvre le dialogue ; E suit le premier choix de la réplique affichée, F le second. Le second choix de « J’étais au cinéma » n’est possible que si le joueur a ramassé le ticket. Certaines répliques donnent un indice. La fonction Aller, qui affiche une réplique, est vide, et E et F ne font rien.',
  notions: ['Dialogue par les données', 'Map', 'Find', 'Structure', 'Break', 'Name', 'Is None (Name)', 'Set', 'Contains'],
  remember:
    'Un dialogue n’est pas un graphe, c’est une table : chaque réplique a un identifiant, un texte et les identifiants où mènent ses choix. Une seule fonction « aller à la réplique X » suffit pour toutes ; ajouter une réplique, c’est ajouter une ligne de données. Et une destination qui n’existe pas doit fermer le dialogue proprement, pas le laisser en plan.',
  cards: [
    {
      title: 'Les données',
      body:
        'Ouvre **S_Replique** (Content Browser) : c’est la structure d’une réplique.\n\n' +
        '- `Texte` (String) : ce que dit le témoin.\n' +
        '- `ChoixE`, `ChoixF` (Name) : l’identifiant de la réplique où mène chaque touche. Vide (None) : le dialogue se termine.\n' +
        '- `Exige` (Name) : le fait que le joueur doit connaître pour prendre le choix F. Vide : aucun.\n' +
        '- `Donne` (Name) : le fait que cette réplique apprend au joueur. Vide : aucun.\n\n' +
        'Dans **BP_Temoin**, la variable `Dialogue` est une **Map** : la clé est l’identifiant (`debut`, `cinema`, `rien`, `ticket`, `aveu`), la valeur une S_Replique. Touche-la dans My Blueprint pour lire les cinq lignes dans Details.\n\n' +
        '`Courante` (Name) retient la réplique affichée ; `Faits` (Set of Name) ce que le joueur sait.',
    },
    {
      title: 'Ce qui est déjà écrit',
      body:
        '**Terminer** : si un dialogue est ouvert, vide `Courante`, efface la Bulle et affiche « Fin du dialogue ». Sans dialogue ouvert, elle ne fait rien : on peut l’appeler sans précaution.\n\n' +
        '**Apprendre** (Fait) : ajoute le fait à `Faits` et l’annonce, la première fois seulement. Un fait vide est ignoré : on peut lui passer `Donne` tel quel.\n\n' +
        '**Espace** appelle `Aller` avec `debut`. Le **BP_Ticket**, au sol, appelle Apprendre (`ticket`) quand le joueur marche dessus.\n\n' +
        'Lis ces deux fonctions avant d’écrire : elles montrent les nœuds dont tu auras besoin (Is None, Contains, Set Text).',
    },
    {
      title: 'La fonction Aller',
      body:
        'Elle reçoit `Id`, l’identifiant de la réplique à afficher. Trois cas, dans cet ordre :\n\n' +
        '1. `Id` est vide (**Is None (Name)**) : c’est la fin. Appelle **Terminer**.\n' +
        '2. `Id` n’est pas dans `Dialogue` : **Find** sort un Boolean (la pin du bas) à faux. Affiche « Réplique introuvable : » suivi de `Id` (Append, Print String), puis **Terminer**. Une faute de frappe dans les données ne doit ni planter ni figer le dialogue.\n' +
        '3. Trouvée : range `Id` dans `Courante`, puis **Break S_Replique** sur la Value de Find pour lire ses membres. **Set Text** (Target = Bulle) avec `Texte`, et **Apprendre** avec `Donne`.\n\n' +
        'Find est un nœud vert : tu peux relier sa Value et son Boolean à plusieurs nœuds, il relit la Map à chaque fois.',
    },
    {
      title: 'Les touches E et F',
      body:
        'Les deux partent de la réplique affichée : **Find** dans `Dialogue` avec `Courante` comme clé, puis **Break S_Replique**. Un seul Find et un seul Break servent aux deux touches.\n\n' +
        '**E** : `Aller` avec `ChoixE`.\n\n' +
        '**F** : `Aller` avec `ChoixF`, mais seulement si le choix est permis : `Exige` est vide (**Is None**) **OR** `Faits` contient `Exige` (**Contains**, Utilities › Set). Un **Branch** sur ce OR ; sur False, rien.\n\n' +
        'Hors dialogue, `Courante` est vide : Find ne trouve rien, les choix sont vides, et `Aller` reçoit None… donc appelle Terminer, qui ne fait rien. Aucun cas particulier à écrire.',
    },
    {
      title: 'Pourquoi cette forme',
      body:
        'La version « directe » serait un Branch ou un Switch par réplique. Cinq répliques, cinq branches ; cinquante, cinquante. Et chaque retouche du texte passe par le graphe.\n\n' +
        'Ici le graphe ne connaît **aucune** réplique : il sait seulement lire une ligne et suivre un identifiant. Dans UE, ces lignes vivraient dans une **Data Table** (un tableau éditable, voire importé d’un fichier), lue avec Get Data Table Row : même idée, autre rangement. Le mémo « Data Tables » en dit plus.\n\n' +
        'Le dernier choix de `aveu` mène à `suite`, qui n’existe pas : c’est voulu, pour vérifier ton cas 2.',
    },
  ],
  objectives: [
    'Écris Aller : Id vide → Terminer ; Id inconnu → « Réplique introuvable : … » puis Terminer ; sinon Courante, Bulle et Apprendre (Donne).',
    'E : Aller au ChoixE de la réplique affichée.',
    'F : Aller au ChoixF, seulement si Exige est vide ou connu (dans Faits).',
    'Touche Vérifier : un premier dialogue sans le ticket, puis un second avec.',
  ],
  hints: [
    'Commence par Aller et teste avec Espace : la Bulle doit afficher « Bonsoir inspecteur. ». Ajoute E, puis F.',
    'Nœuds. Aller : Is None (Name), Branch, Terminer, Get Dialogue, Find, Branch, Append, Print String, Set Courante, Break S_Replique, Set Text (Bulle), Apprendre. Touches : Get Courante, Find, Break S_Replique, Aller, Is None, Get Faits, Contains, OR Boolean, Branch.',
    'Solution. Aller : Branch (Is None (Id)) → True : Terminer ; False : Branch (Boolean de Find (Dialogue, Id)) → False : Print « Réplique introuvable : » + Id → Terminer ; True : Set Courante = Id → Set Text (Bulle, Texte) → Apprendre (Donne). E → Aller (ChoixE de Find (Dialogue, Courante)). F → Branch (Is None (Exige) OR Contains (Faits, Exige)) → Aller (ChoixF).',
  ],
  challenge: 'Ajoute dans Details de Dialogue la réplique « suite » (« Un homme en manteau gris. », sans choix) : le dialogue va plus loin sans un nœud de plus.',
  setup: talkProject,
  scenario: [
    { wait: 0.2 },
    ...tap('SpaceBar'),
    { checkpoint: 'ouvert' },
    ...tap('E'),
    ...tap('F'),
    { checkpoint: 'refuse' },
    ...tap('E'),
    ...tap('F'),
    { checkpoint: 'ferme' },
    ...tap('E'),
    ...goTo(500, 200),
    ...tap('SpaceBar'),
    ...tap('E'),
    ...tap('F'),
    { checkpoint: 'ticket' },
    ...tap('E'),
    { checkpoint: 'aveu' },
    ...tap('E'),
    { checkpoint: 'absente' },
    ...tap('SpaceBar'),
  ],
  checks: [
    shows('open', 'ouvert', 'Espace : la Bulle affiche « Bonsoir inspecteur. »', 'Bonsoir', 'Aller doit trouver « debut » dans Dialogue et écrire son Texte dans la Bulle (Set Text).'),
    shows('locked', 'refuse', 'Sans le ticket, F ne quitte pas « J’étais au cinéma »', 'cinéma', 'E devait mener à « cinema » (son ChoixE), et F ne rien faire : son choix exige le fait « ticket », que le joueur n’a pas.'),
    {
      id: 'closed',
      label: 'E puis F : le dialogue se ferme, « Fin du dialogue » une fois',
      at: 'ferme',
      test: (cx) => {
        if (bubble(cx) !== '') return `La Bulle affiche encore « ${bubble(cx)} » : le ChoixF de « rien » est vide, Aller doit appeler Terminer.`;
        return countPrints(cx, END) === 1 ? true : `« Fin du dialogue » s’est affiché ${countPrints(cx, END)} fois au lieu d’une.`;
      },
    },
    shows('unlocked', 'ticket', 'Avec le ticket, F mène à « Ce ticket… »', 'ticket', 'Le joueur connaît maintenant « ticket » : F doit suivre ChoixF quand Faits contient Exige.'),
    {
      id: 'facts',
      label: 'Les répliques donnent leurs indices : mensonge, puis cave',
      at: 'aveu',
      test: (cx) => {
        const f = facts(cx);
        const miss = ['mensonge', 'cave'].filter((x) => !f.includes(x));
        return miss.length ? `Faits ne contient pas : ${miss.join(', ')}. En affichant une réplique, Aller doit appeler Apprendre avec son membre Donne.` : true;
      },
    },
    {
      id: 'missing',
      label: 'Une destination absente est signalée, et le dialogue se ferme',
      at: 'absente',
      test: (cx) => {
        if (countPrints(cx, `${MISSING} : suite`) !== 1) return 'Il fallait « Réplique introuvable : suite » une fois : quand Find ne trouve pas Id, affiche-le avant de fermer.';
        if (bubble(cx) !== '') return `La Bulle affiche encore « ${bubble(cx)} » après une destination absente : appelle Terminer.`;
        return countPrints(cx, END) === 2 ? true : `« Fin du dialogue » s’est affiché ${countPrints(cx, END)} fois pour deux dialogues fermés.`;
      },
    },
    shows('again', undefined, 'Espace rouvre le dialogue au début', 'Bonsoir', 'Après une fermeture, Espace doit rouvrir le dialogue à « debut ».'),
    notion(usesNode('find', 'BP_Temoin', ['map.find'], 'Les répliques sont lues dans la Map', 'Lis la réplique dans Dialogue avec Find, à partir de son identifiant.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = edit(p, 'BP_Temoin');
    const go = fnOf(w, 'Aller');
    const close = fnOf(w, 'Terminer');
    const learn = fnOf(w, 'Apprendre');
    const member = (name: string) => p.structs.find((s) => s.name === 'S_Replique')!.members.find((x) => x.name === name)!.id;
    const f = go.f;
    const none = f.node('name.isNone', {}, {}, [160, 220]);
    const end = f.node('flow.branch', {}, {}, [340, 0]);
    const stop = f.node('call.function', { graph: close.graph.id }, {}, [640, -160]);
    const find = f.node('map.find', {}, {}, [480, 300]);
    const found = f.node('flow.branch', {}, {}, [680, 60]);
    const warn = say(f, [980, 260]);
    const text = f.node('string.append', {}, { in0: `${MISSING} : ` }, [800, 460]);
    const stop2 = f.node('call.function', { graph: close.graph.id }, {}, [1280, 260]);
    const keep = setVar(f, 'Courante', [980, -40]);
    const line = f.node('struct.break', { struct: 'S_Replique' }, {}, [980, 620]);
    const show = f.node('component.setText', {}, {}, [1280, -40]);
    const give = f.node('call.function', { graph: learn.graph.id }, {}, [1600, -40]);
    f.link(go.entry, 'then', end, 'exec').link(go.entry, go.pin.Id, none, 'in').link(none, 'result', end, 'condition').link(end, 'true', stop, 'exec');
    f.link(getVar(f, 'Dialogue', [300, 310]), 'value', find, 'map').link(go.entry, go.pin.Id, find, 'key');
    f.link(end, 'false', found, 'exec').link(find, 'result', found, 'condition');
    f.link(found, 'false', warn, 'exec').link(go.entry, go.pin.Id, text, 'in1').link(text, 'result', warn, 'text').link(warn, 'then', stop2, 'exec');
    f.link(found, 'true', keep, 'exec').link(go.entry, go.pin.Id, keep, 'value').link(find, 'value', line, 'struct');
    f.link(keep, 'then', show, 'exec').target('Bulle', show).link(line, member('Texte'), show, 'value').link(show, 'then', give, 'exec').link(line, member('Donne'), give, learn.pin.Fait);
    // E and F follow the choices of the line on screen.
    const cur = w.node('map.find', {}, {}, [300, 620]);
    const here = w.node('struct.break', { struct: 'S_Replique' }, {}, [560, 620]);
    w.link(getVar(w, 'Dialogue', [100, 620]), 'value', cur, 'map').link(getVar(w, 'Courante', [100, 720]), 'value', cur, 'key').link(cur, 'value', here, 'struct');
    const e = w.node('event.inputKey', { key: 'E' }, {}, [64, 360]);
    const goE = w.node('call.function', { graph: go.graph.id }, {}, [900, 360]);
    w.link(e, 'pressed', goE, 'exec').link(here, member('ChoixE'), goE, go.pin.Id);
    const fk = w.node('event.inputKey', { key: 'F' }, {}, [64, 960]);
    const free = w.node('name.isNone', {}, {}, [900, 1160]);
    const knows = w.node('set.contains', {}, {}, [900, 1280]);
    const may = w.node('logic.or', {}, {}, [1080, 1200]);
    const allowed = w.node('flow.branch', {}, {}, [1240, 960]);
    const goF = w.node('call.function', { graph: go.graph.id }, {}, [1540, 960]);
    w.link(here, member('Exige'), free, 'in').link(getVar(w, 'Faits', [740, 1290]), 'value', knows, 'set').link(here, member('Exige'), knows, 'item');
    w.link(free, 'result', may, 'a').link(knows, 'result', may, 'b').link(may, 'result', allowed, 'condition');
    w.link(fk, 'pressed', allowed, 'exec').link(allowed, 'true', goF, 'exec').link(here, member('ChoixF'), goF, go.pin.Id);
  },
};
