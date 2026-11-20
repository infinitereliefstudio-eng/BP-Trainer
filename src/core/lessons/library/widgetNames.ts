/**
 * V7.43, transfer of the Widget Component: T5 « Les noms au-dessus des
 * têtes ». Three crew members (BP_Pnj, an Instance Editable Nom each) must
 * show their own name above them: a Widget Component with WBP_Etiquette,
 * then at BeginPlay Get User Widget Object → Cast To → AfficherNom (Nom).
 * Another situation than the bars: BeginPlay rather than a hit, a Text, a
 * value set on each placed actor.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, fnDef, override } from './kit';
import { UMG_MODULE } from './umgCounter';
import { addW, newClass } from './umgKit';
import { drawnOver, placedWidget } from './widgetBars';

const CREW: { label: string; name: string; at: [number, number]; color: string }[] = [
  { label: 'BP_Pnj', name: 'Mara', at: [-360, -120], color: '#22c55e' },
  { label: 'BP_Pnj2', name: 'Ilyès', at: [0, -200], color: '#f59e0b' },
  { label: 'BP_Pnj3', name: 'Jo', at: [360, -120], color: '#38bdf8' },
];

function project(): Project {
  const pb = new ProjectBuilder('Les noms au-dessus des têtes');
  const p = pb.project;
  const w = newClass(p, 'WBP_Etiquette', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 0, 0, 0] } });
  const txt = addW(p, w.cls, 'TextBlock', canvas.id, {
    name: 'Txt_Nom',
    isVariable: true,
    props: { text: '???', fontSize: 18, justification: 'Center' },
    slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 2, 0, 0] },
  });
  const fn = fnDef(p, w, 'AfficherNom', [['Nom', T.text]], []);
  const set = fn.f.node('widget.setText', {}, {}, [500, 96]);
  fn.f.link(fn.entry, 'then', set, 'exec').link(fn.entry, fn.pin.Nom, set, 'text').link(fn.f.node('var.widget', { widget: txt.id }, {}, [300, 300]), 'value', set, 'target');

  const npc = pb.blueprint('BP_Pnj');
  npc.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#94a3b8' });
  const nom = editable(npc, 'Nom', T.text, 'PNJ');
  for (const c of CREW) override(pb, pb.place(npc, ...c.at), nom, c.name);
  pb.playerStart(0, 220);
  return p;
}

/** The text an NPC's label shows now (undefined: no label). */
function labelOf(cx: CheckContext, label: string): string | undefined {
  const id = cx.actor(label)?.components.find((k) => k.kind === 'Widget' && k.widget)?.widget;
  const obj = id ? cx.sim.objectById(id) : undefined;
  const txt = obj && cx.sim.classOf(obj)?.widgets?.find((w) => w.name === 'Txt_Nom');
  return obj && txt ? String(cx.sim.umg.prop({ obj, id: txt.id }, 'text')) : undefined;
}

export const transferNames: Lesson = {
  id: 't5-noms',
  code: 'T5',
  module: UMG_MODULE,
  level: 'avance',
  number: 0,
  title: 'Les noms au-dessus des têtes',
  situation:
    'Trois membres de l’équipage attendent dans la station. Chacun a son nom, réglé sur l’acteur posé dans le niveau. Affiche-le au-dessus de sa tête, dès le lancement.',
  chain: { notion: 'widget-component', step: 'transfer' },
  recalls: ['cast', 'functions'],
  notions: ['Widget Component', 'Get User Widget Object', 'Instance Editable'],
  remember:
    'Ce qu’un acteur sait (son nom, sa vie), il le donne à son propre widget : Get User Widget Object, Cast To, puis une fonction du widget. Le widget du composant existe déjà à l’Event BeginPlay de l’acteur.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BP_Pnj** (un Corps, une variable **Nom**, Text, Instance Editable), posé trois fois : **Mara**, **Ilyès** et **Jo**, chacun réglé dans les Details de l’acteur posé.\n\n' +
        '**WBP_Etiquette** : un fond, **Txt_Nom**, et une fonction **AfficherNom** (Nom, Text) qui l’écrit.\n\n' +
        '- Au-dessus de chaque membre d’équipage, une étiquette avec **son** nom, dès le lancement.\n' +
        '- L’étiquette est petite et au-dessus de lui, pas sur lui.\n' +
        '- Un quatrième membre posé plus tard doit avoir la sienne sans rien changer d’autre.',
    },
  ],
  objectives: ['Mara, Ilyès et Jo ont chacun leur nom au-dessus de la tête.', 'L’étiquette est petite et au-dessus de l’acteur.', 'Aucune erreur pendant l’exécution.'],
  hints: [
    'Comme pour les barres : à qui appartient l’étiquette, à l’écran ou à chaque personnage ? Et qui connaît le nom à écrire ?',
    'Widget Component (Widget Class, Draw Size, Location Y) ; Event BeginPlay ; Get User Widget Object ; Cast To WBP_Etiquette ; AfficherNom ; Get Nom.',
    'Solution : BP_Pnj : + Add › Widget (Etiquette), Widget Class WBP_Etiquette, Draw Size 140 × 28, Location Y −70. Event BeginPlay → Cast To WBP_Etiquette (Object = Get User Widget Object, Target = Etiquette) → AfficherNom (Target = As WBP_Etiquette, Nom = Get Nom).',
  ],
  challenge: 'Fais passer l’étiquette en rouge quand le joueur s’approche du personnage : qui le sait, et que doit-il demander au widget ?',
  setup: project,
  scenario: [{ wait: 0.3 }],
  checks: [
    { id: 'component', label: 'BP_Pnj porte un Widget Component : WBP_Etiquette, petit, au-dessus de lui', test: (cx) => placedWidget(cx, 'BP_Pnj', 'WBP_Etiquette', [320, 80]) },
    {
      id: 'names',
      label: 'Chacun a son propre nom au-dessus de la tête',
      test: (cx) => {
        const shown = CREW.map((c) => labelOf(cx, c.label));
        if (shown.every((t, i) => t === CREW[i].name)) return true;
        if (drawnOver(cx, 'WBP_Etiquette').length < CREW.length) return `${drawnOver(cx, 'WBP_Etiquette').length} étiquette(s) à l’écran au lieu de ${CREW.length}.`;
        const said = CREW.map((c, i) => `${c.name} → « ${shown[i] ?? '?'} »`).join(', ');
        if (shown.every((t) => t === '???')) return `Les étiquettes affichent « ??? » : personne ne leur donne de nom (${said}). Au lancement, chaque personnage doit appeler AfficherNom sur SON widget.`;
        return `Étiquettes : ${said}. Chacun doit donner SON Nom à SON widget.`;
      },
    },
    notion({
      id: 'own-widget',
      label: 'Chaque personnage passe par Get User Widget Object',
      test: (cx) => (cx.nodes('BP_Pnj').some((n) => n.def === 'widgetComponent.getUserWidgetObject') ? true : 'Le widget de chaque personnage se trouve avec Get User Widget Object, sur son Widget Component.'),
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const npc = edit(p, 'BP_Pnj');
    const wbp = edit(p, 'WBP_Etiquette');
    const fn = wbp.cls.graphs.find((g) => g.name === 'AfficherNom')!;
    const comp = npc.widgetComponent('Etiquette', wbp, { y: -70, sizeX: 140, sizeY: 28 });
    const begin = npc.node('event.beginPlay', {}, {}, [64, 96]);
    const get = npc.node('widgetComponent.getUserWidgetObject', {}, {}, [200, 300]);
    const cast = npc.node('cast.to', { class: wbp.cls.id }, {}, [400, 96]);
    const call = npc.node('call.function', { owner: wbp.cls.id, graph: fn.id }, {}, [760, 96]);
    npc.link(npc.node('var.component', { component: comp }, {}, [40, 380]), 'value', get, 'target').link(get, 'result', cast, 'object');
    npc.link(begin, 'then', cast, 'exec').link(cast, 'then', call, 'exec').link(cast, 'as', call, 'target');
    npc.link(npc.node('var.get', { variable: npc.cls.variables.find((v) => v.name === 'Nom')!.id }, {}, [560, 300]), 'value', call, fn.fn!.inputs[0].id);
  },
};
