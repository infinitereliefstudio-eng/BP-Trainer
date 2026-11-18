/** The Content Drawer's view of the project: every asset, UE's type labels, deleting only what is unused. */
import { describe, expect, it } from 'vitest';
import { createClass, createProject } from '../src/core/model/project';
import { addInputAction, addMapping, addMappingContext } from '../src/core/operations/inputOps';
import { addInterface } from '../src/core/operations/projectOps';
import { projectAssets, removeAsset } from '../src/ui/content/assets';

describe('Content Drawer assets', () => {
  it('lists every asset with UE’s type label, sorted by name', () => {
    const p = createProject();
    const a = createClass('BP_Porte');
    const s = createClass('BP_Sauvegarde', 'SaveGame');
    p.classes.push(a, s);
    addInterface(p, 'BPI_Interactif');
    addInputAction(p, 'IA_Ouvrir');
    expect(projectAssets(p).map((x) => `${x.name}:${x.type}`)).toEqual([
      'BP_Porte:Blueprint Class',
      'BP_Sauvegarde:Blueprint Class',
      'BPI_Interactif:Blueprint Interface',
      'IA_Ouvrir:Input Action',
    ]);
    expect(projectAssets(p).find((x) => x.name === 'BP_Sauvegarde')?.placeable).toBe(false);
    expect(projectAssets(p).find((x) => x.name === 'BP_Porte')?.parent).toBe('Actor');
  });

  it('refuses to delete an asset still in use, as UE', () => {
    const p = createProject();
    p.classes.push(createClass('BP_A'));
    const ia = addInputAction(p, 'IA_Ouvrir');
    const imc = addMappingContext(p, 'IMC_Joueur');
    if (!ia.ok || !imc.ok) throw new Error('assets');
    addMapping(p, imc.value.id, ia.value.id, 'E');
    const action = projectAssets(p).find((x) => x.kind === 'inputAction')!;
    expect(removeAsset(p, action).ok).toBe(false);
    const context = projectAssets(p).find((x) => x.kind === 'mappingContext')!;
    expect(removeAsset(p, context).ok).toBe(true);
  });
});
