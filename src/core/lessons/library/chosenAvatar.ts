/**
 * V7.56, E40 of the exercise collection: Complète C8 « Le personnage choisi »,
 * in the Avancé after T6. Lvl_Menu (the Game Default Map) shows two showcase
 * pawns, BP_Agent and BP_Drone, and WBP_Choix with a button for each; its
 * function Choisir (Vitrine) remembers the choice in BP_Jeu, then opens
 * Lvl_Jeu. There, BP_GameMode (the Default GameMode, pawn BP_Agent) has
 * Get Default Pawn Class For Controller overridden, left empty.
 *
 * The trap E40 asks for: Choisir keeps a reference to the showcase actor of
 * the menu (BP_Jeu.Choix), which is None behind the door. Two gaps: keep the
 * choice in a form that survives the travel (the class: Avatar = Get Class),
 * and have the GameMode return it. One pawn only, made by the GameMode: a
 * Spawn Actor next to it is the duplicate the collection warns about.
 */
import type { Project } from '../../model/project';
import { overrideFunction } from '../../operations/functionOps';
import { setGameModeDefault, setGameModeOverride } from '../../operations/gameModeOps';
import { removeNodes } from '../../operations/graphOps';
import { renameLevel, setGameInstanceClass } from '../../operations/levelAssetOps';
import { setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { fnDef, gap, nodeOf } from './kit';
import { LEVELS_MODULE } from './travel';
import { button, menuPanel, newClass, onButton } from './umgKit';

const MENU = 'Lvl_Menu';
const GAME = 'Lvl_Jeu';
const DOOR: [number, number] = [320, 0];
const AVATARS = ['BP_Agent', 'BP_Drone'] as const;
const OVERRIDE = 'GetDefaultPawnClassForController';

const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name)!;
const vid = (p: Project, className: string, v: string) => cls(p, className).variables.find((x) => x.name === v)!.id;

function project(): Project {
  const pb = new ProjectBuilder('Le personnage choisi');
  const p = pb.project;
  const r = renameLevel(p, p.levels[0].id, MENU);
  if (!r.ok) throw new Error(r.reason);

  // The two avatars: two pawns, each a different colour.
  const agent = pb.blueprint('BP_Agent', 'Pawn');
  agent.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#38bdf8', blocks: false });
  const drone = pb.blueprint('BP_Drone', 'Pawn');
  drone.component('StaticMesh', 'Coque', { sizeX: 60, sizeY: 60, color: '#f97316', blocks: false });
  setPlayerClass(p, agent.cls.id);

  // BP_Jeu: Choix (the showcase actor: the trap) and Avatar (a Pawn class, BP_Agent by default).
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  jeu.variable('Choix', T.object('Actor'));
  jeu.variable('Avatar', T.class('Pawn'), agent.cls.id);
  setGameInstanceClass(p, jeu.cls.id);

  // WBP_Choix: two buttons; each finds its showcase and calls Choisir (Vitrine).
  const w = newClass(p, 'WBP_Choix', 'UserWidget');
  const canvas = menuPanel(p, w.cls, 'Choisis ton personnage');
  button(p, w.cls, canvas, 'Btn_Agent', 'Agent', 0, -20);
  button(p, w.cls, canvas, 'Btn_Drone', 'Drone', 0, 80);
  const choisir = fnDef(p, w, 'Choisir', [['Vitrine', T.object('Pawn')]], []);
  const f = choisir.f;
  const cast = f.node('cast.to', { class: jeu.cls.id }, {}, [300, 0]);
  const keep = f.node('var.setExternal', { owner: jeu.cls.id, variable: vid(p, 'BP_Jeu', 'Choix') }, {}, [620, 0]);
  const open = f.node('level.open', {}, { level: GAME }, [980, 0]);
  f.link(choisir.entry, 'then', cast, 'exec').link(f.node('game.getGameInstance', {}, {}, [80, 200]), 'result', cast, 'object');
  f.link(cast, 'then', keep, 'exec').link(cast, 'as', keep, 'target').link(choisir.entry, choisir.pin.Vitrine, keep, 'value').link(keep, 'then', open, 'exec');
  removeNodes(choisir.graph, [choisir.ret]);
  gap(f, 'Trou 2 : garder le choix sous une forme qui survit à Open Level (la vitrine reste dans le menu)', [580, -60], 340, 260);
  AVATARS.forEach((name, i) => {
    const click = onButton(w, `Btn_${name.slice(3)}`);
    w.graph.nodes[click].x = 64;
    w.graph.nodes[click].y = 96 + i * 340;
    const find = w.node('actor.getOfClass', {}, { class: cls(p, name).id }, [360, 96 + i * 340]);
    const call = w.node('call.function', { owner: w.cls.id, graph: choisir.graph.id }, {}, [700, 96 + i * 340]);
    w.link(click, 'then', find, 'exec').link(find, 'then', call, 'exec').link(find, 'result', call, choisir.pin.Vitrine);
  });

  // The menu: its own GameMode, whose Player Controller shows WBP_Choix, UI Only, with the cursor.
  const pc = newClass(p, 'BP_PCMenu', 'PlayerController');
  const self = pc.node('actor.self', {}, {}, [200, 300]);
  const make = pc.node('widget.create', {}, { class: w.cls.id }, [340, 96]);
  const view = pc.node('widget.addToViewport', {}, {}, [680, 96]);
  const mode = pc.node('input.setModeUIOnly', {}, {}, [980, 96]);
  const cursor = pc.node('input.setShowMouseCursor', {}, { show: true }, [1320, 96]);
  pc.link(pc.node('event.beginPlay', {}, {}, [64, 96]), 'then', make, 'exec').link(self, 'self', make, 'owner').link(make, 'then', view, 'exec').link(make, 'result', view, 'target');
  pc.link(view, 'then', mode, 'exec').link(self, 'self', mode, 'controller').link(make, 'result', mode, 'focus').link(mode, 'then', cursor, 'exec');
  const gmMenu = newClass(p, 'BP_GameModeMenu', 'GameModeBase');
  must(setGameModeDefault(p, gmMenu.cls.id, 'playerControllerClass', pc.cls.id));
  must(setGameModeOverride(p, p.levels[0].id, gmMenu.cls.id));
  pb.place(agent, 220, -120);
  pb.place(drone, 220, 120);
  pb.playerStart(-300, 0);

  // The game: a door back to the menu. Its GameMode is the Default GameMode, BP_GameMode (pawn BP_Agent).
  const back = pb.blueprint('BP_PorteMenu');
  back.component('StaticMesh', 'Cadre', { sizeX: 40, sizeY: 150, color: '#c08a3e', blocks: false });
  back.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 170 });
  back.link(back.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', back.node('level.open', {}, { level: MENU }, [400, 96]), 'exec');
  pb.level(GAME, (q) => {
    q.place(back, ...DOOR);
    q.playerStart(-300, 0);
  });

  // BP_GameMode › Override › Get Default Pawn Class For Controller, left as made: it returns None.
  const gm = cls(p, 'BP_GameMode');
  const o = must(overrideFunction(p, gm, OVERRIDE));
  gap(edit(p, 'BP_GameMode').inGraph(o.id), 'Trou 1 : rendre la classe choisie, gardée dans BP_Jeu', [200, -80], 620, 280);
  return p;
}

function must<V>(r: { ok: true; value: V } | { ok: false; reason: string }): V {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

/** Trou 2: Avatar = Get Class (Vitrine) instead of Choix = Vitrine. Trou 1: the override returns BP_Jeu's Avatar. */
function solve(p: Project): void {
  const jeu = cls(p, 'BP_Jeu').id;
  const w = edit(p, 'WBP_Choix');
  const g = w.cls.graphs.find((x) => x.name === 'Choisir')!;
  const choisir = { graph: g, f: w.inGraph(g.id), entry: nodeOf(g, 'fn.entry'), pin: { Vitrine: g.fn!.inputs[0].id } };
  const keep = Object.values(g.nodes).find((n) => n.def === 'var.setExternal')!;
  const cast = nodeOf(g, 'cast.to');
  const open = nodeOf(g, 'level.open');
  removeNodes(g, [keep.id]);
  const f = choisir.f;
  const set = f.node('var.setExternal', { owner: jeu, variable: vid(p, 'BP_Jeu', 'Avatar') }, {}, [620, 0]);
  const klass = f.node('actor.getClassName', {}, {}, [480, 200]);
  f.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(choisir.entry, choisir.pin.Vitrine, klass, 'object').link(klass, 'result', set, 'value').link(set, 'then', open, 'exec');

  const gm = edit(p, 'BP_GameMode');
  const o = gm.cls.graphs.find((x) => x.override === OVERRIDE)!;
  const b = gm.inGraph(o.id);
  const entry = nodeOf(o, 'fn.entry');
  const ret = nodeOf(o, 'fn.return');
  for (const id of Object.keys(o.links)) delete o.links[id];
  const gcast = b.node('cast.to', { class: jeu }, {}, [300, 0]);
  const get = b.node('var.getExternal', { owner: jeu, variable: vid(p, 'BP_Jeu', 'Avatar') }, {}, [560, 200]);
  b.link(entry, 'then', gcast, 'exec').link(b.node('game.getGameInstance', {}, {}, [80, 200]), 'result', gcast, 'object').link(gcast, 'then', ret, 'exec');
  b.link(gcast, 'as', get, 'target').link(get, 'value', ret, o.fn!.outputs[0].id);
}

// ----------------------------------------------------------------- checks

/** The other pawns of the game level: one made by Spawn Actor next to the GameMode's would be the duplicate. */
const extraPawns = (cx: CheckContext) => cx.sim.actors.filter((a) => !a.destroyed && (AVATARS as readonly string[]).includes(a.className));

function playsAs(id: string, avatar: (typeof AVATARS)[number], label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (cx.level() !== GAME) return `La partie est dans ${cx.level()} : le bouton doit appeler Choisir, qui finit par Open Level vers ${GAME}.`;
      const is = cx.sim.player.className;
      if (is === avatar) return true;
      const kept = cx.gameInstance('Avatar');
      const avatarId = cx.project.classes.find((c) => c.name === avatar)?.id;
      if (kept === avatarId)
        return `BP_Jeu garde bien ${avatar} (Avatar), mais le joueur est ${is || 'le pion par défaut'} : le GameMode ne s’en sert pas. Trou 1 : Get Default Pawn Class For Controller doit rendre Avatar (Get Game Instance → Cast To BP_Jeu → Return Node).`;
      if (cx.gameInstance('Choix') === null && avatar !== 'BP_Agent')
        return `Le choix est resté dans le menu : Choix garde une référence vers la vitrine, un acteur de ${MENU} détruit par Open Level. Derrière la porte, elle vaut None (comme D28). Trou 2 : garde ce qui survit, la classe de la vitrine (Set Avatar = Get Class).`;
      return `Le joueur est ${is || 'le pion par défaut'}, on attend ${avatar} : Choisir doit écrire la classe de la vitrine dans Avatar, et le GameMode la rendre.`;
    },
  };
}

const oneOnly: Check = {
  id: 'one',
  label: 'Un seul pion, fait par le GameMode',
  at: 'drone',
  test: (cx) => {
    const extra = extraPawns(cx);
    return extra.length
      ? `${extra.map((a) => a.label).join(', ')} : un second pion, que personne ne pilote. Le GameMode fait déjà apparaître le joueur ; pour en choisir la classe, il suffit de la rendre dans Get Default Pawn Class For Controller, sans Spawn Actor.`
      : true;
  },
};

export const complete8: Lesson = {
  id: 'c8-personnage',
  kind: 'complete',
  code: 'C8',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Le personnage choisi',
  situation:
    'Au lancement, un menu propose deux personnages, l’Agent et le Drone, présentés en vitrine. Le bouton retient le choix puis ouvre le niveau de jeu. Mais quel que soit le choix, on y joue toujours l’Agent. Deux trous, dans les cadres jaunes.',
  recalls: ['cast', 'other-bp'],
  notions: ['Get Default Pawn Class For Controller', 'GameInstance', 'Default Pawn Class', 'Référence vers un acteur détruit'],
  remember:
    'Qui crée le joueur ? Le GameMode, une seule fois par niveau. Pour qu’il crée le pion choisi, on surcharge Get Default Pawn Class For Controller, qui rend une classe. Et on garde le choix sous une forme qui survit au voyage : la classe (dans le GameInstance), jamais une référence vers un acteur du menu.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        `- **${MENU}** (Game Default Map) : deux vitrines, **BP_Agent** et **BP_Drone**. Son GameMode, **BP_GameModeMenu**, a pour Player Controller **BP_PCMenu**, qui affiche **WBP_Choix** (UI Only, curseur).\n` +
        '- **WBP_Choix** : Btn_Agent et Btn_Drone trouvent leur vitrine (Get Actor Of Class) et appellent la fonction **Choisir (Vitrine)**. Choisir : Get Game Instance → Cast To BP_Jeu → **Set Choix** = Vitrine → Open Level (Lvl_Jeu).\n' +
        '- **BP_Jeu** (Game Instance Class) : **Choix** (une référence d’acteur) et **Avatar** (une Class Reference de Pawn, BP_Agent par défaut).\n' +
        `- **${GAME}** : une porte qui ramène au menu. Son GameMode est **BP_GameMode** (Default Pawn Class : BP_Agent), dont la fonction **GetDefaultPawnClassForController** est déjà surchargée, mais vide.`,
    },
    {
      title: 'Qui crée le joueur ?',
      body:
        'À chaque niveau, le GameMode fait apparaître le joueur, une fois. Il demande la classe du pion à sa fonction **Get Default Pawn Class For Controller** : sans surcharge, elle rend la Default Pawn Class. Surchargée (My Blueprint › Functions › Override), elle rend la classe que tu veux.\n\n' +
        'Faire un **Spawn Actor** du pion choisi au BeginPlay, à côté, donnerait deux pions : celui du GameMode, piloté, et l’autre, inerte. C’est le doublon que le recueil signale. Dans UE, une autre voie existe (Spawn Actor puis Possess, pour changer de pion en cours de partie), mais au départ d’un niveau, le GameMode est le seul chemin.',
    },
    {
      title: 'Le piège : la vitrine ne passe pas la porte',
      body:
        'Choisir garde **la vitrine elle-même** : un acteur du menu. Open Level détruit tout le menu ; derrière la porte, Choix vaut None (« L’objet ramassé réapparaît »).\n\n' +
        'Ce qui survit, c’est une donnée qui ne dépend pas du niveau : **la classe** de la vitrine. **Get Class** (Object = Vitrine) rend une Class Reference, qu’on range dans **Avatar**.',
    },
    {
      title: 'Les deux trous',
      body:
        '1. **BP_GameMode › GetDefaultPawnClassForController** : Get Game Instance → **Cast To BP_Jeu** → **Return Node**, Return Value = **Avatar** (As BP_Jeu).\n' +
        '2. **WBP_Choix › Choisir** : remplace Set Choix par **Set Avatar**, valeur = **Get Class** (Object = Vitrine), puis Open Level comme avant.\n\n' +
        `Le test choisit le Drone, revient au menu par la porte, choisit l’Agent, puis relance le jeu directement dans ${GAME} : sans choix, Avatar garde sa valeur par défaut, l’Agent.`,
    },
  ],
  objectives: ['Choisir le Drone : on joue le Drone.', 'Revenir au menu, choisir l’Agent : on joue l’Agent.', `Lancer directement ${GAME} : l’Agent, par défaut.`, 'Un seul pion à chaque fois.'],
  hints: [
    'Qui fait apparaître le joueur, et quelle fonction lui donne sa classe ? Et qu’est-ce qui, du menu, existe encore derrière la porte ?',
    'Get Game Instance ; Cast To BP_Jeu ; Get Avatar ; Return Node ; Get Class ; Set Avatar.',
    'Solution : Trou 1, GetDefaultPawnClassForController : Cast To BP_Jeu (Get Game Instance) → Return Node (Return Value = Avatar). Trou 2, Choisir : Cast To BP_Jeu → Set Avatar (= Get Class de Vitrine) → Open Level.',
  ],
  challenge: 'Garde le choix d’une fermeture à l’autre (un Save Game, relu à Event Init) : quelle responsabilité ajoutes-tu, et à qui ? Puis : au retour au menu, comment surligner le personnage choisi la dernière fois ?',
  setup: project,
  scenario: [
    { wait: 0.3 },
    { click: 'WBP_Choix/Btn_Drone' },
    { wait: 0.3 },
    { checkpoint: 'drone' },
    { teleport: DOOR },
    { wait: 0.4 },
    { click: 'WBP_Choix/Btn_Agent' },
    { wait: 0.3 },
    { checkpoint: 'agent' },
    { restart: true, level: GAME },
    { wait: 0.3 },
  ],
  checks: [
    playsAs('drone', 'BP_Drone', 'Choisir le Drone : on joue le Drone', 'drone'),
    oneOnly,
    playsAs('agent', 'BP_Agent', 'Retour au menu, choisir l’Agent : on joue l’Agent', 'agent'),
    {
      id: 'direct',
      label: `Lancé directement dans ${GAME} : l’Agent, par défaut`,
      test: (cx) => {
        if (cx.level() !== GAME) return `La partie relancée devait être dans ${GAME}.`;
        if (cx.sim.log.some((l) => l.text.includes('SpawnDefaultPawnFor')))
          return 'Sans passer par le menu, Get Default Pawn Class For Controller a rendu None : dans UE, le joueur n’aurait aucun pion. Avatar a une valeur par défaut (BP_Agent) : rends-la.';
        return cx.sim.player.className === 'BP_Agent' ? true : `Lancé directement, le joueur est ${cx.sim.player.className || 'le pion par défaut'} : on attend l’Agent, la valeur par défaut d’Avatar.`;
      },
    },
    notion({
      id: 'class-kept',
      label: 'Le choix est gardé sous forme de classe',
      at: 'drone',
      test: (cx) =>
        cx.gameInstance('Avatar') === cx.project.classes.find((c) => c.name === 'BP_Drone')?.id
          ? true
          : 'Choisir doit écrire Avatar (la classe de la vitrine) : une référence vers la vitrine ne passe pas la porte.',
    }),
    noRuntimeErrors(),
  ],
  solve,
  avoid: [
    {
      defs: ['actor.spawn'],
      label: 'Faire apparaître le personnage avec Spawn Actor',
      why: 'Le GameMode crée déjà un pion : un Spawn Actor en ajoute un second, que personne ne pilote. Pour choisir la classe du joueur, on la rend dans Get Default Pawn Class For Controller.',
    },
  ],
};
