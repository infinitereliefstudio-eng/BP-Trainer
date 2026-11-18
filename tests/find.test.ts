/** Find Results (V7.8): UE's Find in Blueprint and Find in all Blueprints. */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { findInBlueprints, hitCount } from '../src/core/search/find';
import { T } from '../src/core/types/pins';

function project() {
  const pb = new ProjectBuilder('find');
  const lamp = pb.blueprint('BP_Lampe');
  lamp.variable('bEstAllumee', T.bool, false);
  const begin = lamp.node('event.beginPlay', {}, {}, [0, 0]);
  const delay = lamp.node('time.delay', {}, { duration: 2 }, [300, 0]);
  const print = lamp.node('debug.printString', {}, { text: 'Bonjour la station' }, [600, 0]);
  lamp.link(begin, 'then', delay, 'exec').link(delay, 'completed', print, 'exec');
  const set = lamp.node('var.set', { variable: lamp.cls.variables[0].id }, {}, [900, 0]);
  lamp.node('util.comment', { text: 'Allumage au démarrage' }, {}, [0, -200]);
  const door = pb.blueprint('BP_Porte');
  door.node('debug.printString', {}, { text: 'La porte s’ouvre' }, [0, 0]);
  door.node('cast.to', { class: lamp.cls.id }, {}, [0, 200]);
  return { p: pb.project, lamp, door, delay, print, set };
}

describe('Find in Blueprint', () => {
  it('finds a node by its title, in the Blueprint searched only', () => {
    const { p, lamp, delay } = project();
    const r = findInBlueprints(p, 'delay', lamp.cls.id);
    expect(r).toHaveLength(1);
    expect(r[0].className).toBe('BP_Lampe');
    expect(r[0].graphs[0].hits).toEqual([{ nodeId: delay, title: 'Delay' }]);
  });

  it('names a variable node after its variable', () => {
    const { p, lamp, set } = project();
    const hits = findInBlueprints(p, 'set bestallumee', lamp.cls.id)[0].graphs[0].hits;
    expect(hits).toEqual([{ nodeId: set, title: 'Set bEstAllumee' }]);
  });

  it('finds a typed value, accents and case ignored, and says where it matched', () => {
    const { p, lamp, print } = project();
    const hits = findInBlueprints(p, 'STATION', lamp.cls.id)[0].graphs[0].hits;
    expect(hits).toEqual([{ nodeId: print, title: 'Print String', detail: 'In String = Bonjour la station' }]);
    expect(findInBlueprints(p, 'demarrage', lamp.cls.id)[0].graphs[0].hits[0].title).toBe('Allumage au démarrage');
  });

  it('finds what a node points to by name (Cast To BP_Lampe in another Blueprint)', () => {
    const { p, door } = project();
    const r = findInBlueprints(p, 'bp_lampe', door.cls.id);
    expect(r[0].graphs[0].hits.map((h) => h.title)).toEqual(['Cast To BP_Lampe']);
  });

  it('Find in all Blueprints groups the hits by Blueprint', () => {
    const { p } = project();
    const r = findInBlueprints(p, 'print string');
    expect(r.map((c) => c.className)).toEqual(['BP_Lampe', 'BP_Porte']);
    expect(hitCount(r)).toBe(2);
  });

  it('every word must appear; an empty search finds nothing', () => {
    const { p } = project();
    expect(findInBlueprints(p, 'delay porte')).toEqual([]);
    expect(findInBlueprints(p, '   ')).toEqual([]);
  });
});

describe('Find References and the palette tree', () => {
  it('Find References searches the variable, so both Get and Set are found', async () => {
    const { referenceQuery } = await import('../src/core/search/find');
    const { p, lamp, set } = project();
    expect(referenceQuery(p, lamp.cls, lamp.graph.nodes[set])).toBe('bEstAllumee');
    expect(findInBlueprints(p, 'bEstAllumee', lamp.cls.id)[0].graphs[0].hits.map((h) => h.title)).toEqual(['Set bEstAllumee']);
  });

  it('All Actions: categories nest by « | » and keep the order of their first action', async () => {
    const { buildTree } = await import('../src/core/nodes/palette');
    const e = (title: string, category: string) => ({ key: title, title, category, description: '', def: 'x', config: {}, keywords: [] });
    const tree = buildTree([e('Get Vie', 'Variables'), e('Delay', 'Utilities|Flow Control'), e('Get Mesh', 'Variables|Components'), e('Branch', 'Utilities|Flow Control')]);
    expect(tree.map((c) => c.name)).toEqual(['Variables', 'Utilities']);
    expect(tree[0].entries.map((x) => x.title)).toEqual(['Get Vie']);
    expect(tree[0].children[0].path).toBe('Variables|Components');
    expect(tree[1].children[0].entries.map((x) => x.title)).toEqual(['Delay', 'Branch']);
  });
});
