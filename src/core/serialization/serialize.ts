/**
 * Saved-file format. `format` is bumped whenever the model changes shape;
 * `migrate` upgrades older files so projects survive app updates.
 */
import { PROJECT_FORMAT, type Project } from '../model/project';

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
  // Example for later: if (cur === 1) { …transform…; cur = 2; }
  p.format = Math.max(cur, PROJECT_FORMAT);
  return p;
}

function assertShape(p: Project): void {
  if (!Array.isArray(p.classes)) throw new ProjectFileError('Projet incomplet : aucune classe.');
  for (const c of p.classes) {
    if (!c.id || !c.name || !Array.isArray(c.graphs) || !Array.isArray(c.variables) || !Array.isArray(c.components)) {
      throw new ProjectFileError(`Blueprint « ${c?.name ?? '?'} » incomplet.`);
    }
    for (const g of c.graphs) {
      if (!g.nodes || !g.links) throw new ProjectFileError(`Graphe « ${g?.name ?? '?'} » incomplet.`);
    }
  }
}
