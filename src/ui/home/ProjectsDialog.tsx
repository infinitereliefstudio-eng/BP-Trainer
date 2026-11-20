/**
 * Home › Simulation libre › Mes projets (V7.41): the free-play projects,
 * each saved apart. Open, create, import, and per project: rename, copy,
 * export, delete (for good, after a confirmation that names it).
 */
import { useEffect, useState } from 'preact/hooks';
import { checkProjectName } from '@core/projects/list';
import { saveFile } from '@storage/backup';
import { pickProjectFile } from '@storage/persistence';
import {
  createProject,
  deleteProject,
  duplicateProject,
  importProject,
  listProjects,
  nextProjectName,
  type ProjectEntry,
  renameProject,
} from '@storage/projects';
import { RULES_VERSION } from '@core/model/rules';
import { ConfirmDialog, PromptDialog } from '../overlays/Dialogs';
import { useOwnTap } from '../widgets/useOwnTap';

interface Props {
  /** The project opened last, shown first. */
  lastId?: string;
  onOpen: (id: string) => void;
  onClose: () => void;
}

type Ask = { kind: 'new'; initial: string } | { kind: 'rename'; entry: ProjectEntry } | { kind: 'delete'; entry: ProjectEntry };

const when = (t: number) =>
  t ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' à') : 'date inconnue';

const fileName = (name: string) => `${name.replace(/[^\w-]+/g, '_') || 'projet'}.bptrainer.json`;

export function ProjectsDialog({ lastId, onOpen, onClose }: Props) {
  const tap = useOwnTap();
  const [list, setList] = useState<ProjectEntry[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [actions, setActions] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  const refresh = () =>
    listProjects().then(
      (l) => {
        setList(l);
        setFailed(null);
      },
      (e: Error) => setFailed(e.message),
    );
  useEffect(() => {
    refresh();
  }, []);

  const report = (e: Error) => setMessage({ text: e.message, error: true });
  const ordered = list ? [...list.filter((e) => e.id === lastId), ...list.filter((e) => e.id !== lastId)] : [];

  const importOne = () =>
    pickProjectFile()
      .then(async (p) => {
        if (!p || !list) return;
        p.rules = RULES_VERSION;
        const { name } = await importProject(p, list);
        setMessage({ text: `Projet « ${name} » ajouté à la liste.` });
        await refresh();
      })
      .catch(report);

  const copy = (entry: ProjectEntry) =>
    list &&
    duplicateProject(entry, list)
      .then(async ({ name }) => {
        setMessage({ text: `Copie créée : « ${name} ».` });
        setActions(null);
        await refresh();
      })
      .catch(report);

  const exportOne = (entry: ProjectEntry) =>
    saveFile(fileName(entry.name), entry.text).then(
      (how) => setMessage({ text: how === 'shared' ? 'Fichier prêt : choisis où l’enregistrer.' : `Fichier téléchargé : ${fileName(entry.name)}.` }),
      report,
    );

  return (
    <>
      <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
        <div class="dialog projects-dialog" role="dialog" aria-label="Mes projets" onClick={(e) => e.stopPropagation()}>
          <h2>Mes projets</h2>
          <p class="muted small">La simulation libre : tes projets à toi, chacun enregistré à part sur cet appareil.</p>
          <div class="projects-actions">
            <button class="btn primary projects-btn" disabled={!list} onClick={() => list && setAsk({ kind: 'new', initial: nextProjectName(list) })}>
              Nouveau projet
            </button>
            <button class="btn projects-btn" disabled={!list} onClick={importOne}>
              Importer un fichier
            </button>
          </div>
          {failed && <p class="error-text">Liste illisible : {failed}</p>}
          {list && list.length === 0 && <p class="muted">Aucun projet pour l’instant : crée le premier.</p>}
          <ul class="projects-list">
            {ordered.map((entry) => (
              <li key={entry.id} class={`project-item${entry.damaged ? ' damaged' : ''}`}>
                <div class="project-row">
                  <button class="project-open" onClick={() => onOpen(entry.id)}>
                    <span class="project-name">{entry.name}</span>
                    <span class="project-meta">
                      {entry.damaged
                        ? `Illisible (${entry.damaged})`
                        : `${entry.blueprints} Blueprint${entry.blueprints > 1 ? 's' : ''} · modifié ${when(entry.updatedAt)}`}
                      {entry.id === lastId && ' · ouvert en dernier'}
                    </span>
                  </button>
                  <button
                    class="btn project-more"
                    aria-label={`Actions sur ${entry.name}`}
                    aria-expanded={actions === entry.id}
                    onClick={() => setActions(actions === entry.id ? null : entry.id)}
                  >
                    ⋮
                  </button>
                </div>
                {actions === entry.id && (
                  <div class="project-tools">
                    <button class="btn project-tool" disabled={!!entry.damaged} onClick={() => setAsk({ kind: 'rename', entry })}>
                      Renommer
                    </button>
                    <button class="btn project-tool" disabled={!!entry.damaged} onClick={() => copy(entry)}>
                      Dupliquer
                    </button>
                    <button class="btn project-tool" onClick={() => exportOne(entry)}>
                      Exporter
                    </button>
                    <button class="btn danger project-tool" onClick={() => setAsk({ kind: 'delete', entry })}>
                      Supprimer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {message && <p class={message.error ? 'error-text' : 'note'}>{message.text}</p>}
          <div class="dialog-actions">
            <button class="btn" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
      {ask?.kind === 'new' && list && (
        <PromptDialog
          title="Nouveau projet"
          initial={ask.initial}
          confirmLabel="Créer"
          onSubmit={(v) => {
            const checked = checkProjectName(
              v,
              list.map((e) => e.name),
            );
            if ('error' in checked) return checked.error;
            createProject(checked.name).then(onOpen, report);
            return null;
          }}
          onClose={() => setAsk(null)}
        />
      )}
      {ask?.kind === 'rename' && list && (
        <PromptDialog
          title="Renommer le projet"
          initial={ask.entry.name}
          confirmLabel="Renommer"
          onSubmit={(v) => {
            const checked = checkProjectName(
              v,
              list.filter((e) => e.id !== ask.entry.id).map((e) => e.name),
            );
            if ('error' in checked) return checked.error;
            renameProject(ask.entry, checked.name, list)
              .then((error) => {
                if (error) return setMessage({ text: error, error: true });
                setActions(null);
                return refresh();
              })
              .catch(report);
            return null;
          }}
          onClose={() => setAsk(null)}
        />
      )}
      {ask?.kind === 'delete' && (
        <ConfirmDialog
          title={`Supprimer « ${ask.entry.name} » ?`}
          text="Le projet sera effacé de cet appareil, sans retour possible. Exporte-le d’abord si tu veux en garder une copie."
          confirmLabel="Supprimer"
          onConfirm={() =>
            deleteProject(ask.entry)
              .then(() => {
                setMessage({ text: `Projet « ${ask.entry.name} » supprimé.` });
                setActions(null);
                return refresh();
              })
              .catch(report)
          }
          onClose={() => setAsk(null)}
        />
      )}
    </>
  );
}
