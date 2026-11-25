/**
 * Writes the solved project of some lessons to tools/e2e/out/<id>.json,
 * for smoke.py to load into the app (IndexedDB key "project:lesson:<id>").
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { getLesson } from '../../src/core/lessons';
import { serializeProject } from '../../src/core/serialization/serialize';

const OUT = new URL('./out/', import.meta.url);

it('generates solved lesson projects', () => {
  mkdirSync(OUT, { recursive: true });
  for (const id of ['l03-interrupteur', 'l10-dispatcher', 'l11-interface', 'l12-station', 'l-locales', 'l-terminal', 'l-codes', 'l-fiche', 'l-badges', 'l-porte-glisse', 'c3-projecteur', 'l-rangee-lampes', 'l-regarder', 'l-caisse', 'r3-bouton', 'l-miroirs', 'l-reseau', 'd15-grille', 'l-meme-donne', 'l-tirelire', 'l-menu-pause', 'l-vrai-menu-pause', 'c7-playlist', 'l-barre-par-ennemi', 'l-sac-qui-suit', 'l-bonne-porte', 'c8-personnage', 'x2-atelier', 'x3-arene', 'x4-ronde', 'x5-reseau', 'x6-reveil']) {
    const lesson = getLesson(id)!;
    const p = lesson.setup();
    lesson.solve(p);
    // As the app does when it creates the workspace: no « this lesson changed » notice.
    p.lessonRevision = lesson.revision ?? 1;
    writeFileSync(new URL(`${id}.json`, OUT), serializeProject(p));
  }
});

/** V7.42: a free-play project with two enemies, each carrying its own bar (a Widget Component). */
it('generates a Widget Component project', async () => {
  const { ProjectBuilder } = await import('../../src/core/lessons/builder');
  const { addWidget } = await import('../../src/core/operations/widgetOps');
  const pb = new ProjectBuilder('Barres au-dessus');
  const w = pb.blueprint('WBP_Barre', 'UserWidget');
  const canvas = addWidget(pb.project, w.cls, 'CanvasPanel');
  if (!canvas.ok) throw new Error(canvas.reason);
  const bar = addWidget(pb.project, w.cls, 'ProgressBar', canvas.value.id);
  if (!bar.ok) throw new Error(bar.reason);
  bar.value.name = 'PB_Vie';
  bar.value.props.percent = 0.6;
  bar.value.props.fillColor = '#e5484d';
  // Anchored to fill the whole Draw Size.
  bar.value.slot.anchors = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  bar.value.slot.offsets = [0, 0, 0, 0];
  const enemy = pb.blueprint('BP_Ennemi');
  enemy.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#a855f7' });
  enemy.widgetComponent('Barre', w, { y: -70, sizeX: 150, sizeY: 18 });
  pb.place(enemy, 260, -60);
  pb.place(enemy, 480, 120);
  pb.playerStart(0, 0);
  writeFileSync(new URL('widget-component.json', OUT), serializeProject(pb.project));
});

/**
 * V7.47: two levels. The player starts on a door of Lvl_Principal, whose overlap opens Lvl_Atelier; there, a Print of Get Current Level Name.
 * V7.48: BP_Jeu, the Game Instance Class, with Visites set to 1 by Event Init.
 * V7.49: Lvl_Atelier has a GameMode Override, BP_ReglesAtelier, whose Default Pawn Class is BP_Robot.
 */
it('generates an Open Level project', async () => {
  const { ProjectBuilder } = await import('../../src/core/lessons/builder');
  const { addLevel, setGameInstanceClass } = await import('../../src/core/operations/levelAssetOps');
  const { T } = await import('../../src/core/types/pins');
  const pb = new ProjectBuilder('Deux niveaux');
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  const visites = jeu.variable('Visites', T.int, 0);
  jeu.link(jeu.node('event.gameInit', {}, {}, [0, 0]), 'then', jeu.node('var.set', { variable: visites }, { value: 1 }, [260, 0]), 'exec');
  setGameInstanceClass(pb.project, jeu.cls.id);
  const porte = pb.blueprint('BP_Porte');
  porte.component('StaticMesh', 'Cadre', { sizeX: 60, sizeY: 120, blocks: false, color: '#c08a3e' });
  porte.component('BoxCollision', 'Zone', { sizeX: 140, sizeY: 140 });
  const overlap = porte.node('event.actorBeginOverlap', {}, {}, [0, 0]);
  const say = porte.node('debug.printString', {}, { text: 'Porte franchie : Open Level' }, [260, 0]);
  const open = porte.node('level.open', {}, { level: 'Lvl_Atelier' }, [560, 0]);
  porte.link(overlap, 'then', say, 'exec').link(say, 'then', open, 'exec');
  pb.place(porte, 0, 0);
  pb.playerStart(0, 0);
  const b = addLevel(pb.project, 'Lvl_Atelier');
  if (!b.ok) throw new Error(b.reason);
  const atelier = pb.blueprint('BP_Atelier');
  atelier.component('StaticMesh', 'Etabli', { sizeX: 160, sizeY: 80, color: '#4a8fd6' });
  const begin = atelier.node('event.beginPlay', {}, {}, [0, 0]);
  const name = atelier.node('level.currentName', {}, {}, [0, 160]);
  const print = atelier.node('debug.printString', {}, {}, [300, 0]);
  atelier.link(begin, 'then', print, 'exec').link(name, 'result', print, 'text');
  pb.project.editorLevelId = b.value.id;
  pb.place(atelier, 200, 0);
  b.value.playerStart = { x: -150, y: 0, yaw: 0 };
  const { setGameModeDefault, setGameModeOverride } = await import('../../src/core/operations/gameModeOps');
  const robot = pb.blueprint('BP_Robot', 'Pawn');
  const regles = pb.blueprint('BP_ReglesAtelier', 'GameModeBase');
  setGameModeDefault(pb.project, regles.cls.id, 'defaultPawnClass', robot.cls.id);
  setGameModeOverride(pb.project, b.value.id, regles.cls.id);
  pb.project.editorLevelId = pb.project.levels[0].id;
  writeFileSync(new URL('open-level.json', OUT), serializeProject(pb.project));
});
