/**
 * UI-4 (V7.76): the three families of the editor's interface (ui/origins.ts). Read from the sources, as the
 * tests run without a DOM; the smoke test checks the bars on screen (every button: UE, app or touch).
 */
import { describe, expect, it } from 'vitest';
import { UE_HINT } from '../src/ui/origins';

const sources = import.meta.glob(['../src/ui/**/*.ts', '../src/ui/**/*.tsx', '../src/ui/styles/*.css'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const files = Object.entries(sources)
  .filter(([p]) => !p.endsWith('.css'))
  .map(([p, s]) => ({ p, s }));
const all = files.map((f) => f.s).join('\n');
const read = (name: string) => {
  const hit = Object.entries(sources).find(([p]) => p.endsWith(name));
  if (!hit) throw new Error(`${name} introuvable`);
  return hit[1];
};

describe('the three families of the editor (UI-4)', () => {
  it('reads the interface’s sources', () => {
    expect(files.length).toBeGreaterThan(80);
  });

  it('no element is marked the old way (class app-only): data-origin="app" instead', () => {
    const old = files.filter((f) => /["\s`]app-only[\s"`$]/.test(f.s));
    expect(old.map((f) => f.p)).toEqual([]);
  });

  it('an app text (app-only-text) is in the app family, so « Vue UE pure » hides it', () => {
    for (const f of files) for (const m of f.s.matchAll(/app-only-text"([^>]*)>/g)) expect(m[1], f.p).toContain('data-origin="app"');
  });

  it('each UE equivalent is said by a control', () => {
    for (const key of Object.keys(UE_HINT)) {
      const used = new RegExp(`'${key}'|"${key}"|UE_HINT\\.${key}\\b`).test(all.replace(/export const UE_HINT[\s\S]*?\n\} as const;/, ''));
      expect(used, key).toBe(true);
    }
  });

  it('warnings use UE’s yellow, not the amber of the app', () => {
    const css = read('/styles/app.css');
    for (const m of css.matchAll(/^[^\n]*\.warning[^{]*\{[^}]*\}/gm)) expect(m[0], m[0]).not.toMatch(/--app-/);
  });

  it('the floating buttons, the side handles and the menu ⋮ are touch controls with their UE equivalent', () => {
    const app = read('/ui/App.tsx');
    for (const hint of ['undo', 'redo', 'fit', 'select', 'addNode', 'closePanel']) expect(app).toContain(`origin('touch', '${hint}')`);
    expect(read('/DocumentTabs.tsx')).toContain("origin('touch', 'more')");
    expect(read('/EditorToolbars.tsx')).toContain("origin('touch', hint)");
  });
});
