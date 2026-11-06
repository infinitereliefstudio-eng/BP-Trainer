import { render } from 'preact';
import { EditorStore } from '@core/store/editorStore';
import { createStarterProject } from '@core/templates/starterProject';
import { loadSavedProject, saveProject, startAutosave } from '@storage/persistence';
import { App } from '@ui/App';
import './ui/styles/app.css';

async function boot(): Promise<void> {
  const saved = await loadSavedProject();
  const project = saved ?? createStarterProject();
  const store = new EditorStore(project);
  if (!saved) await saveProject(project).catch(() => undefined);
  startAutosave(store);
  render(<App store={store} />, document.getElementById('app')!);
  if (!saved) store.info('Bienvenue ! Appui long sur le vide pour ajouter un nœud.');
}

boot();
