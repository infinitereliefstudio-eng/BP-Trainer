/**
 * Saved-file format. `format` is bumped whenever the model changes shape;
 * `migrate` upgrades older files so projects survive app updates.
 */
import { PROJECT_FORMAT, componentDefaults, createLevel, type Project } from '../model/project';
import { adoptFromLinks } from '../operations/wildcardOps';
import { ProjectFileError, validateProject } from './validate';
import { wireSubsystemTargets } from './wireSubsystem';

export const FILE_KIND = 'bp-trainer-project';

interface ProjectFile {
  kind: typeof FILE_KIND;
  format: number;
  project: Project;
}

export function serializeProject(p: Project): string {
  const file: ProjectFile = { kind: FILE_KIND, format: PROJECT_FORMAT, project: p };
  return JSON.stringify(file, null, 1);
}

export { ProjectFileError };

export function parseProject(json: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ProjectFileError("Ce fichier n'est pas un JSON valide.");
  }
  const file = data as Partial<ProjectFile> | null;
  if (!file || typeof file !== 'object' || file.kind !== FILE_KIND || !file.project || typeof file.project !== 'object') {
    throw new ProjectFileError("Ce fichier n'est pas un projet BP Trainer.");
  }
  const format = typeof file.format === 'number' ? file.format : 1;
  if (format > PROJECT_FORMAT) {
    throw new ProjectFileError("Ce projet vient d'une version plus récente de l'appli. Mets l'appli à jour.", 'newer');
  }
  try {
    const project = migrate(file.project, format);
    validateProject(project);
    return project;
  } catch (e) {
    if (e instanceof ProjectFileError) throw e;
    // A migration step met data it did not expect: the file is damaged.
    throw new ProjectFileError(`Projet abîmé : ${(e as Error).message}`);
  }
}

/** Upgrade a project from an older format. Add one step per format bump. */
function migrate(p: Project, from: number): Project {
  let cur = from;
  if (cur === 1) {
    // v2: level, component properties, Auto Receive Input.
    p.level ??= createLevel();
    for (const c of p.classes ?? []) {
      c.autoReceiveInput ??= false;
      for (const k of c.components ?? []) k.props = { ...componentDefaults(k.kind), ...(k.props ?? {}) };
    }
    cur = 2;
  }
  if (cur === 2) {
    // v3: dispatchers, interfaces, player class.
    p.interfaces ??= [];
    for (const c of p.classes ?? []) {
      c.dispatchers ??= [];
      c.interfaces ??= [];
    }
    cur = 3;
  }
  if (cur === 3) {
    // v4: Enums, Collision Enabled on components (v3 files go straight to v5:
    // their generic nodes are typed from their wires into node.wild).
    p.enums ??= [];
    for (const c of p.classes ?? []) {
      for (const k of c.components ?? []) k.props = { ...componentDefaults(k.kind), ...(k.props ?? {}) };
    }
    adoptFromLinks(p);
    cur = 5;
  } else if (cur === 4) {
    // v5: adopted wildcard types move from `config` to `node.wild`.
    for (const c of p.classes ?? []) {
      for (const g of c.graphs ?? []) {
        for (const n of Object.values(g.nodes ?? {})) {
          for (const [k, v] of Object.entries(n.config ?? {})) {
            if ((k !== 'wild' && !k.startsWith('wild:')) || typeof v !== 'string') continue;
            n.wild = { ...n.wild, [k === 'wild' ? 'default' : k.slice(5)]: v };
            delete n.config[k];
          }
        }
      }
    }
    cur = 5;
  }
  if (cur === 5) {
    // v6: Structure assets.
    p.structs ??= [];
    cur = 6;
  }
  if (cur === 6) {
    // v7: Timelines (kept in their node), Construction Script graphs, Line Trace, Event Hit.
    // Nothing to convert: the bump only stops an older app from opening nodes it does not know.
    cur = 7;
  }
  if (cur === 7) {
    // v8: Data Table assets, SaveGame classes and save slots.
    p.dataTables ??= [];
    cur = 8;
  }
  if (cur === 8) {
    // v9: Enhanced Input (Input Actions, Input Mapping Contexts).
    p.inputActions ??= [];
    p.mappingContexts ??= [];
    cur = 9;
  }
  if (cur === 9) {
    // v10: Player Controller, and the Target pin of Add / Remove Mapping Context.
    for (const c of p.classes ?? []) wireSubsystemTargets(c.graphs ?? []);
    cur = 10;
  }
  if (cur === 10) {
    // v11: Actor Components made in Blueprint (parent ActorComponent, components that point to their class).
    // Nothing to convert: the number keeps an older app from opening these projects.
    cur = 11;
  }
  if (cur === 11) {
    // v12: Widget Blueprints (parent UserWidget, their widget tree). Nothing to convert.
    cur = 12;
  }
  if (cur === 12) {
    // v13: Canvas Panels, Text Blocks and placed User Widgets are Not Hit-Testable (Self Only) by default, as in UE
    // (the touch reaches the buttons below them). Those still at Visible, the old default, take the new one.
    for (const c of p.classes ?? []) {
      for (const w of c.widgets ?? []) {
        if ((w.kind === 'CanvasPanel' || w.kind === 'TextBlock' || w.kind === 'UserWidget') && w.props?.visibility === 0) w.props.visibility = 4;
      }
    }
    cur = 13;
  }
  p.format = cur;
  return p;
}
