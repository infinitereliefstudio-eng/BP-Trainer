/**
 * V6, Avancé: "Débogue D15 — Les meubles sur une grille tournée" (E29).
 * Furniture snaps to 50 cm cells by snapping world coordinates: right while
 * the floor sits at the origin, wrong once it is moved and turned. The cells
 * belong to the floor: go to its local space, snap, come back.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { DEBUG_METHOD, editable, getVar, nodeOf, override, ref, say, setVar, tap } from './kit';

const CELL = 50;
const FLOOR = { x: 300, y: 200, yaw: 30 };
const TAKEN = 'Case occupée';
const DEG = Math.PI / 180;

/** A point of the floor's local space, in the world. */
function toWorld(lx: number, ly: number): [number, number] {
  const r = FLOOR.yaw * DEG;
  return [FLOOR.x + lx * Math.cos(r) - ly * Math.sin(r), FLOOR.y + lx * Math.sin(r) + ly * Math.cos(r)];
}
function toLocal(wx: number, wy: number): [number, number] {
  const r = -FLOOR.yaw * DEG;
  const dx = wx - FLOOR.x,
    dy = wy - FLOOR.y;
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
}
const standAt = (lx: number, ly: number): ScenarioStep[] => [{ teleport: toWorld(lx, ly) }, { wait: 0.1 }, ...tap('E')];

function gridProject() {
  const pb = new ProjectBuilder('Débogue D15');
  const floor = pb.blueprint('BP_Sol');
  floor.component('StaticMesh', 'Dalle', { sizeX: 500, sizeY: 500, color: '#1f2937', blocks: false });
  const piece = pb.blueprint('BP_Meuble');
  piece.component('StaticMesh', 'Meuble', { sizeX: 44, sizeY: 44, color: '#d97706', blocks: false });

  const tool = pb.blueprint('BP_Poseur');
  tool.component('StaticMesh', 'Outil', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#0369a1', blocks: false });
  tool.component('TextRender', 'Etiquette', { y: -50, text: 'E : poser un meuble' });
  tool.cls.autoReceiveInput = true;
  const where = editable(tool, 'Sol', T.object('BP_Sol'));
  tool.variable('Case', T.vector);
  tool.variable('Occupees', T.set(T.string), []);
  const g = (name: string, at: [number, number]) => getVar(tool, name, at);
  // E: snap the player's position to the grid, refuse a taken cell, otherwise put a piece there.
  const e = tool.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const pawn = tool.node('actor.getPlayerPawn', {}, {}, [64, 380]);
  const pos = tool.node('actor.getLocation', {}, {}, [260, 380]);
  const parts = tool.node('math.breakVector', {}, {}, [700, 380]);
  const sx = tool.node('math.snapToGridFloat', {}, { grid: CELL }, [900, 340]);
  const sy = tool.node('math.snapToGridFloat', {}, { grid: CELL }, [900, 480]);
  const cell = tool.node('math.makeVector', {}, {}, [1100, 380]);
  const keep = setVar(tool, 'Case', [1300, 96]);
  const key = tool.node('conv.vectorToString', {}, {}, [1460, 320]);
  const taken = tool.node('set.contains', {}, {}, [1640, 320]);
  const free = tool.node('flow.branch', {}, {}, [1800, 96]);
  const no = say(tool, [2100, -60], TAKEN);
  const mark = tool.node('set.add', {}, {}, [2100, 200]);
  const spawn = tool.node('actor.spawn', {}, { class: piece.cls.id }, [2440, 200]);
  tool.link(pawn, 'result', pos, 'target').link(pos, 'result', parts, 'in').link(parts, 'x', sx, 'location').link(parts, 'y', sy, 'location');
  tool.link(sx, 'result', cell, 'x').link(sy, 'result', cell, 'y').link(e, 'pressed', keep, 'exec').link(cell, 'result', keep, 'value');
  tool.link(keep, 'out', key, 'in').link(g('Occupees', [1460, 420]), 'value', taken, 'set').link(key, 'result', taken, 'item');
  tool.link(keep, 'then', free, 'exec').link(taken, 'result', free, 'condition').link(free, 'true', no, 'exec').link(free, 'false', mark, 'exec');
  tool.link(g('Occupees', [1920, 400]), 'value', mark, 'set').link(key, 'result', mark, 'item').link(mark, 'then', spawn, 'exec').link(g('Case', [2260, 420]), 'value', spawn, 'location');

  const f = pb.place(floor, FLOOR.x, FLOOR.y, FLOOR.yaw);
  const t = pb.place(tool, -300, -200);
  override(pb, t, where, ref(f));
  pb.playerStart(-300, 100);
  return pb.project;
}

const pieces = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Meuble' && !a.destroyed);

/** Is there a piece on local cell (lx, ly), turned like the floor? */
function onCell(id: string, at: string | undefined, label: string, lx: number, ly: number, count: number) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const list = pieces(cx);
      if (list.length !== count) return `${list.length} meuble(s) posé(s) au lieu de ${count}.`;
      const a = list[list.length - 1];
      const [gx, gy] = toLocal(a.x, a.y);
      if (Math.abs(gx - lx) > 1 || Math.abs(gy - ly) > 1) {
        return `Le dernier meuble est en (${Math.round(a.x)}, ${Math.round(a.y)}) dans le monde, soit (${gx.toFixed(0)}, ${gy.toFixed(0)}) vu du sol : ce n’est pas la case (${lx}, ${ly}). Les cases sont celles du sol : passe la position du joueur dans le repère du sol (Inverse Transform Location) avant de l’aligner, puis reviens au monde (Transform Location) pour poser.`;
      }
      const yaw = ((a.yaw % 360) + 360) % 360;
      return Math.abs(yaw - FLOOR.yaw) < 0.5 ? true : `Le meuble est sur la bonne case mais tourné de ${Math.round(yaw)}° alors que le sol l’est de ${FLOOR.yaw}° : donne au Spawn Actor la rotation du sol.`;
    },
  };
}

export const debug15: Lesson = {
  id: 'd15-grille',
  kind: 'debug',
  code: 'D15',
  module: 'Mouvement',
  level: 'avance',
  number: 0,
  title: 'Les meubles sur une grille tournée',
  situation:
    'E pose un meuble sous le joueur, aligné sur des cases de 50 cm, et refuse une case déjà prise. Tant que la dalle était à l’origine du niveau, tout tombait juste. Le décorateur l’a déplacée et tournée de 30° : les meubles s’alignent toujours sur le quadrillage du monde, de travers par rapport à la dalle.',
  notions: ['Repère local et repère monde', 'Get Actor Transform', 'Inverse Transform Location', 'Transform Location', 'Snap To Grid (Float)', 'Set'],
  remember:
    'Une position n’a de sens que dans un repère. Pour raisonner « du point de vue » d’un acteur (ses cases, son avant, sa gauche), on passe dans son repère local avec Inverse Transform Location, on fait le calcul, puis on revient au monde avec Transform Location. Un calcul fait directement en coordonnées monde ne marche que tant que l’acteur est à l’origine, sans rotation.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce que fait le graphe',
      body:
        'Dans **BP_Poseur**, sur E :\n\n' +
        '- **Get Player Pawn** puis **Get Actor Location** : la position du joueur, dans le monde.\n' +
        '- **Break Vector**, puis **Snap To Grid (Float)** sur X et sur Y avec Grid Size 50 : chaque coordonnée devient le multiple de 50 le plus proche (120 → 100, −70 → −50). **Make Vector** les réunit ; le résultat est rangé dans `Case`.\n' +
        '- **To String (Vector)** fabrique un texte unique pour cette case, cherché dans le Set `Occupees` (**Contains**). Déjà présent : « Case occupée ». Sinon **Add**, puis **Spawn Actor** d’un BP_Meuble à `Case`.\n\n' +
        'Lance Play, pose quelques meubles en te promenant sur la dalle : ils forment un quadrillage droit, sur une dalle tournée.',
    },
    {
      title: 'Deux repères',
      body:
        'Le **repère monde** est celui du niveau : son origine en (0, 0), X vers la droite. `Get Actor Location` répond toujours dans ce repère.\n\n' +
        'Chaque acteur a aussi son **repère local** : son origine est sa propre position, et ses axes tournent avec lui. Pour la dalle, « 100 cm vers l’avant » reste (100, 0) en local, où qu’elle soit et quelle que soit sa rotation.\n\n' +
        'Les cases appartiennent à la dalle : elles sont des multiples de 50 **dans son repère local**. Le graphe arrondit des coordonnées **monde**. Tant que la dalle était à l’origine et sans rotation, les deux repères étaient confondus, et l’erreur invisible.\n\n' +
        'C’est le piège type des transformations : « ça marchait dans mon niveau de test ».',
    },
    {
      title: 'Les trois nœuds',
      body:
        '**Get Actor Transform** (Target = `Sol`) : le **Transform** de la dalle, c’est-à-dire sa position, sa rotation et son échelle en une seule valeur. C’est la description de son repère.\n\n' +
        '**Inverse Transform Location** (T = ce Transform, Location = une position monde) : la même position, **vue de la dalle**. Monde → local.\n\n' +
        '**Transform Location** (T, Location = une position locale) : le chemin inverse. Local → monde.\n\n' +
        'Les deux se ressemblent et se confondent facilement. Moyen de s’en souvenir : *Transform* applique le transform (on sort de l’acteur vers le monde), *Inverse* le défait (on y entre).',
    },
    {
      title: 'Le plan',
      body:
        '1. Entre Get Actor Location et Break Vector : **Inverse Transform Location**, avec le Transform de `Sol`. Les deux Snap To Grid arrondissent alors des coordonnées **locales**, et `Case` devient une case de la dalle.\n' +
        '2. Le test « occupée ? » ne change pas : la clé est maintenant le texte de la case locale, ce qui est exactement ce qu’on veut.\n' +
        '3. Avant le Spawn Actor : **Transform Location** sur `Case`, avec le même Transform, relié à Spawn Transform Location.\n' +
        '4. Le meuble doit aussi être tourné comme la dalle : **Get Actor Rotation** de `Sol` vers Spawn Transform Rotation.\n\n' +
        'Le test place le joueur en trois endroits de la dalle, dont un en coordonnées locales négatives et deux dans la même case.',
    },
  ],
  objectives: [
    'Les meubles se posent sur les cases de 50 cm de la dalle, où qu’elle soit et quelle que soit sa rotation.',
    'Ils sont tournés comme elle.',
    'Une case déjà prise est toujours refusée : « Case occupée ».',
  ],
  hints: [
    'L’arrondi est juste, mais il est fait dans le mauvais repère. Dans quel repère les cases de la dalle sont-elles des multiples de 50 ?',
    'Nœuds : Get Sol, Get Actor Transform, Inverse Transform Location, Transform Location, Get Actor Rotation.',
    'Solution : Get Actor Location (joueur) → Inverse Transform Location (T = Get Actor Transform (Sol)) → Break Vector → Snap, Snap → Make Vector → Set Case. Spawn Actor : Location = Transform Location (T = Get Actor Transform (Sol), Location = Case), Rotation = Get Actor Rotation (Sol).',
  ],
  challenge: 'Refuse aussi les cases hors de la dalle : en local, X et Y doivent rester entre −250 et 250 (Absolute, Less Equal, AND).',
  setup: gridProject,
  scenario: [{ wait: 0.2 }, ...standAt(120, -70), { checkpoint: 'un' }, ...standAt(90, -40), { checkpoint: 'meme' }, ...standAt(-130, 60)],
  checks: [
    onCell('first', 'un', 'Le premier meuble est sur la case (100, −50) de la dalle, tourné comme elle', 100, -50, 1),
    {
      id: 'same',
      label: 'Un second essai dans la même case est refusé',
      at: 'meme',
      test: (cx) => {
        if (pieces(cx).length !== 1) return `${pieces(cx).length} meubles après deux essais dans la même case : la case doit être reconnue comme occupée.`;
        return countPrints(cx, TAKEN) === 1 ? true : 'Il fallait « Case occupée » une fois : garde le test dans le Set, sur la case alignée.';
      },
    },
    onCell('negative', undefined, 'Un autre endroit, en coordonnées négatives : case (−150, 50)', -150, 50, 2),
    notion(usesNode('inverse', 'BP_Poseur', ['math.inverseTransformLocation'], 'L’alignement se fait dans le repère de la dalle', 'Passe la position dans le repère de la dalle avec Inverse Transform Location avant de l’aligner.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Poseur');
    const g = b.graph;
    const pos = nodeOf(g, 'actor.getLocation');
    const parts = nodeOf(g, 'math.breakVector');
    const spawn = nodeOf(g, 'actor.spawn');
    for (const l of Object.values(g.links)) if ((l.to.node === parts && l.to.pin === 'in') || (l.to.node === spawn && l.to.pin === 'location')) delete g.links[l.id];
    const frame = b.node('actor.getTransform', {}, {}, [300, 560]);
    const local = b.node('math.inverseTransformLocation', {}, {}, [480, 420]);
    b.link(getVar(b, 'Sol', [120, 570]), 'value', frame, 'target').link(frame, 'result', local, 't').link(pos, 'result', local, 'location').link(local, 'result', parts, 'in');
    const frame2 = b.node('actor.getTransform', {}, {}, [2080, 520]);
    const world = b.node('math.transformLocation', {}, {}, [2260, 460]);
    const turn = b.node('actor.getRotation', {}, {}, [2260, 620]);
    b.link(getVar(b, 'Sol', [1900, 560]), 'value', frame2, 'target').link(frame2, 'result', world, 't').link(getVar(b, 'Case', [2080, 440]), 'value', world, 'location').link(world, 'result', spawn, 'location');
    b.link(getVar(b, 'Sol', [2080, 640]), 'value', turn, 'target').link(turn, 'result', spawn, 'rotation');
    // The old Get Case, wired straight into the Spawn, is no longer read.
    for (const n of Object.values(g.nodes)) {
      if (n.def === 'var.get' && !Object.values(g.links).some((l) => l.from.node === n.id)) delete g.nodes[n.id];
    }
  },
};
