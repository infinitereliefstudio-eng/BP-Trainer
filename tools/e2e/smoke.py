"""
Headless UI smoke test on a landscape phone (800x370, touch): opens lessons,
panels, a breakpoint in Play, the debugger, an exercise. Saves screenshots to
tools/e2e/out/shots and prints page errors (expected: "errors []").

    npm run build
    npx vitest run --config tools/e2e/vitest.config.ts   # solved projects
    python3 tools/e2e/smoke.py

Needs Python Playwright and Chrome (CHROME env var, default /usr/bin/google-chrome).
The app exposes its store as window.bpStore when the URL contains "?e2e".
"""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / 'out' / 'shots'
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
PUT = """([key, json]) => new Promise((res, rej) => { const r = indexedDB.open('bp-trainer', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv','readwrite'); tx.objectStore('kv').put(json, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }; })"""
OPEN = """(name) => { const s = window.bpStore; s.openClass(s.project.classes.find(c => c.name === name).id); }"""


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 800, 'height': 370}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        shot = lambda name: page.screenshot(path=str(OUT / f'{name}.png'))
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(400)
        for lid in ['l10-dispatcher', 'l11-interface']:
            await page.evaluate(PUT, [f'project:lesson:{lid}', (HERE / 'out' / f'{lid}.json').read_text()])
        await page.reload()
        await page.wait_for_timeout(500)
        await shot('01_home')

        # Lesson 10: dispatcher, details, breakpoint, debugger
        await page.locator('.lesson-item', has_text='Le générateur prévient').tap()
        await page.wait_for_timeout(500)
        await page.evaluate(OPEN, 'BP_Lampe')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('02_lamp_graph')
        await page.evaluate(OPEN, 'BP_Generateur')
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await shot('03_my_blueprint')
        await page.locator('.drawer.left .mb-main', has_text='OnEtatChange').tap()
        await page.wait_for_timeout(300)
        await shot('04_dispatcher_details')
        await page.evaluate("() => { const s = window.bpStore; s.setFocus({ kind: 'variable', id: s.cls.variables[0].id }); }")
        await page.wait_for_timeout(300)
        await shot('04b_variable_details')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.evaluate("""() => { const s = window.bpStore; const c = s.project.classes.find(c => c.name === 'BP_Lampe'); s.openClass(c.id); const n = Object.values(c.graphs[0].nodes).find(n => n.def === 'component.setVisibility'); s.toggleBreakpoint(n.id); }""")
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(600)
        await page.locator('.key', has_text='E').first.dispatch_event('pointerdown')
        await page.wait_for_timeout(400)
        await shot('05_paused')
        await page.locator('.debug-bar .pb-btn[aria-label="Nœud suivant"]').tap()
        await page.wait_for_timeout(300)
        await shot('06_step')
        await page.evaluate("() => { const s = window.bpStore; [...s.breakpoints].forEach(id => s.toggleBreakpoint(id)); }")
        await page.locator('.debug-bar .pb-btn[aria-label="Continuer"]').tap()
        await page.wait_for_timeout(150)
        await shot('07_glow')
        await page.locator('.debug-bar .pb-btn', has_text='Niveau').tap()
        await page.wait_for_timeout(300)
        await shot('08_level_play')
        await page.locator('.tb.stop').tap()

        # Exercise P1
        await page.locator('button[aria-label="Accueil"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.lesson-item', has_text='Sequence et Delay').tap()
        await page.wait_for_timeout(500)
        await page.locator('.lesson-tabs button', has_text='Prédis').tap()
        await page.locator('.option').nth(1).tap()
        await page.wait_for_timeout(150)
        await shot('09_predict')
        await page.locator('.success .btn', has_text='Fermer').tap()

        # Lesson 11: interfaces, functions, palette
        await page.locator('button[aria-label="Accueil"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.lesson-item', has_text='Interagir avec tout').tap()
        await page.wait_for_timeout(500)
        await page.evaluate(OPEN, 'BP_Lampe')
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('10_class_settings')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.evaluate(OPEN, 'BP_Joueur')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('11_player_graph')
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.mb-section', has_text='Functions').locator('.mb-add').tap()
        await page.wait_for_timeout(300)
        await shot('12_function_details')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.evaluate("() => { const s = window.bpStore; s.openGraph(s.cls.graphs[0].id); }")
        await page.locator('.fab.primary').tap()
        await page.locator('.palette .search').fill('inter')
        await page.wait_for_timeout(200)
        await shot('13_palette')
        await page.keyboard.press('Escape')

        # Lesson 12 in Play, with the live Outliner (step 4)
        await page.evaluate(PUT, ['project:lesson:l12-station', (HERE / 'out' / 'l12-station.json').read_text()])
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Remettre la station').tap()
        await page.wait_for_timeout(500)
        await page.locator('.tab', has_text='Niveau').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(600)
        await page.locator('.pb-btn[aria-label="Outliner"]').tap()
        await page.wait_for_timeout(300)
        rows = await page.locator('.outliner-row').count()
        if rows < 8:
            errs.append(f'Outliner: {rows} acteurs listés, 8 attendus au moins')
        await page.locator('.outliner-row', has_text='BP_Generateur').tap()
        await page.wait_for_timeout(300)
        await shot('14_l12_outliner')

        # Step B of V2: "why did this node not run?" after Play, then "Pourquoi ?" in the Output Log
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)
        await page.evaluate("""() => { const s = window.bpStore; const c = s.project.classes.find(c => c.name === 'BP_Generateur'); s.openClass(c.id); s.openGraph(c.graphs[0].id); const n = Object.values(c.graphs[0].nodes).find(n => n.def === 'time.clearTimer'); s.selectNodes([n.id]); }""")
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.details .btn', has_text='Pourquoi ce nœud').tap()
        await page.wait_for_timeout(300)
        await page.locator('.details .diag').scroll_into_view_if_needed()
        await shot('15_diagnose')
        if await page.locator('.details .diag li').count() < 2:
            errs.append('Diagnostic : moins de 2 étapes')

        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Accessed None').first.tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(400)
        await page.locator('.key', has_text='E').first.dispatch_event('pointerdown')
        await page.wait_for_timeout(300)
        await page.locator('.key', has_text='E').first.dispatch_event('pointerup')
        await page.wait_for_timeout(300)
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)
        await page.locator('.bottom-handle').tap()
        await page.locator('.bottom-tabs button', has_text='Output Log').tap()
        await page.wait_for_timeout(200)
        if not await page.locator('.why-btn').count():
            errs.append('Output Log : aucun « Pourquoi ? » sur les erreurs')
        else:
            await page.locator('.why-btn').first.tap()
            await page.wait_for_timeout(200)
        await shot('16_log_why')

        # Step C of V2: the home by level, and a "Complète" exercise with its gaps
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.module h2', has_text='Intermédiaire').scroll_into_view_if_needed()
        await shot('17_home_levels')
        await page.locator('.lesson-item', has_text='La lampe torche').tap()
        await page.wait_for_timeout(500)
        await shot('18_complete_sheet')
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('19_complete_graph')

        # Step D of V2: the Confirmé and Avancé levels
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.module h2', has_text='Avancé').scroll_into_view_if_needed()
        await shot('20_home_advanced')
        if await page.locator('.lesson-item').count() != 36:
            errs.append(f"Accueil : {await page.locator('.lesson-item').count()} étapes au lieu de 36")
        await page.locator('.lesson-item', has_text='La salle de contrôle').tap()
        await page.wait_for_timeout(500)
        await shot('21_control_room_sheet')

        # Step E of V2: a child Blueprint, its inherited members, and Parent: BeginPlay
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='L’héritage').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.evaluate(OPEN, 'BP_Clignotante')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await shot('22_child_my_blueprint')
        if await page.locator('.drawer.left', has_text='hérité').count() == 0:
            errs.append('My Blueprint : aucun membre hérité affiché')
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'class' }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('23_child_class_settings')
        print('errors', errs)
        await b.close()
        return errs


sys.exit(1 if asyncio.run(main()) else 0)
