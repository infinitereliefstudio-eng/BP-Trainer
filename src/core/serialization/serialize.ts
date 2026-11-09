/**
 * Saved-file format. `format` is bumped whenever the model changes shape;
 * `migrate` upgrades older files so projects survive app updates.
 */
import { PROJECT_FORMAT, componentDefaults, createLevel, type Project } from '../model/project';
import { adoptFromLinks } from '../operations/wildcardOps';

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

export class ProjectFileError extends Error {}

export function parseProject(json: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ProjectFileError("Ce fichier n'est pas un JSON valide.");
  }
  const file = data as Partial<ProjectFile>;
  if (!file || file.kind !== FILE_KIND || !file.project) {
    throw new ProjectFileError("Ce fichier n'est pas un projet BP Trainer.");
  }
  if ((file.format ?? 0) > PROJECT_FORMAT) {
    throw new ProjectFileError("Ce projet vient d'une version plus récente de l'appli. Mets l'appli à jour.");
  }
  const project = migrate(file.project, file.format ?? 1);
  assertShape(project);
  return project;
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
  p.format = cur;
  return p;
}

function assertShape(p: Project): void {
  if (!Array.isArray(p.classes)) throw new ProjectFileError('Projet incomplet : aucune classe.');
  if (!p.level || !Array.isArray(p.level.actors)) throw new ProjectFileError('Projet incomplet : niveau manquant.');
  for (const c of p.classes) {
    if (!c.id || !c.name || !Array.isArray(c.graphs) || !Array.isArray(c.variables) || !Array.isArray(c.components)) {
      throw new ProjectFileError(`Blueprint « ${c?.name ?? '?'} » incomplet.`);
    }
    for (const g of c.graphs) {
      if (!g.nodes || !g.links) throw new ProjectFileError(`Graphe « ${g?.name ?? '?'} » incomplet.`);
    }
  }
}
