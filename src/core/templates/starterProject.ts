/**
 * The project a first launch opens: one lamp Blueprint with a light, and a
 * BeginPlay → Print String chain, so there is something to touch at once.
 */
import { createProject, type Project } from '../model/project';
import { addComponent, addVariable } from '../operations/classOps';
import { addNode, connect } from '../operations/graphOps';
import { addClass } from '../operations/projectOps';
import { placeActor } from '../operations/levelOps';
import { contextFor } from '../nodes/registry';
import { T } from '../types/pins';

export function createStarterProject(): Project {
  const p = createProject('Mon premier projet');
  const res = addClass(p, 'BP_Lampe', 'Actor');
  if (!res.ok) throw new Error(res.reason);
  const cls = res.value;
  const pole = addComponent(cls, 'StaticMesh');
  Object.assign(pole.props, { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  addComponent(cls, 'PointLight');
  const on = addVariable(cls, T.bool, 'bEstAllumee');
  on.tooltip = 'Vrai quand la lampe est allumée.';

  const g = cls.graphs[0];
  const ctx = contextFor(cls);
  const begin = addNode(g, 'event.beginPlay', 64, 96);
  const print = addNode(g, 'debug.printString', 384, 96);
  if (begin.ok && print.ok) {
    print.value.defaults.text = 'Bonjour !';
    connect(g, { node: begin.value.id, pin: 'then' }, { node: print.value.id, pin: 'exec' }, ctx);
  }
  placeActor(p, cls.id, 0, 0);
  p.level.playerStart = { x: -400, y: 0, yaw: 0 };
  return p;
}
