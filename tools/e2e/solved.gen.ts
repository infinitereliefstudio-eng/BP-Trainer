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
  for (const id of ['l03-interrupteur', 'l10-dispatcher', 'l11-interface', 'l12-station', 'l-locales', 'l-terminal', 'l-codes', 'l-fiche', 'l-badges', 'l-porte-glisse', 'c3-projecteur', 'l-rangee-lampes', 'l-regarder', 'l-caisse', 'r3-bouton', 'l-miroirs', 'l-reseau', 'd15-grille', 'l-meme-donne', 'l-tirelire', 'l-menu-pause', 'l-vrai-menu-pause', 'c7-playlist']) {
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
