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
        if await page.locator('.lesson-item').count() != 51:
            errs.append(f"Accueil : {await page.locator('.lesson-item').count()} étapes au lieu de 51")
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

        # Step A of V3: Local Variables, and an interface function with an input and an output
        for lid in ['l-locales', 'l-terminal']:
            await page.evaluate(PUT, [f'project:lesson:{lid}', (HERE / 'out' / f'{lid}.json').read_text()])
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le ticket de caisse').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.evaluate("""() => { const s = window.bpStore; s.openGraph(s.cls.graphs.find(g => g.name === 'AjouterArticle').id); }""")
        await page.wait_for_timeout(200)
        await page.locator('.tab', has_text='AjouterArticle').tap()
        await page.wait_for_timeout(300)
        await shot('24_function_with_locals')
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await shot('25_my_blueprint_locals')
        if await page.locator('.drawer.left', has_text='Local Variables (AjouterArticle)').count() == 0:
            errs.append('My Blueprint : pas de section Local Variables dans une fonction')
        await page.locator('.drawer.left .mb-main', has_text='SousTotal').tap()
        await page.wait_for_timeout(300)
        await shot('26_local_details')
        if await page.locator('.drawer.right', has_text='Local Variable').count() == 0:
            errs.append('Details : la variable locale ne s’affiche pas')
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le terminal').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.evaluate(OPEN, 'BP_Joueur')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('27_message_with_pins')
        await page.evaluate(OPEN, 'BP_Terminal')
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await shot('28_my_blueprint_interface_function')
        if await page.locator('.drawer.left', has_text='BPI_Interactif · fonction').count() == 0:
            errs.append('My Blueprint : la fonction d’interface Interagir n’est pas listée comme fonction')
        await page.locator('.drawer.left .mb-main', has_text='Interagir').first.tap()
        await page.wait_for_timeout(300)
        await shot('29_interface_function_graph')
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'interface', id: s.project.interfaces[0].id }); }""")
        await page.wait_for_timeout(300)
        await shot('30_interface_details')

        # Step B of V3: a Map default in Details, a Structure asset, Set Members, a Set variable
        for lid in ['l-codes', 'l-fiche', 'l-badges']:
            await page.evaluate(PUT, [f'project:lesson:{lid}', (HERE / 'out' / f'{lid}.json').read_text()])
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Les codes des portes').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('31_map_find_graph')
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'variable', id: s.cls.variables.find(v => v.name === 'Codes').id }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('32_map_variable_details')
        if await page.locator('.drawer.right .container-row').count() != 2:
            errs.append('Details : les deux paires de la Map Codes ne sont pas affichées')
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La fiche de l’objet').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('33_struct_graph')
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'struct', id: s.project.structs[0].id }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('34_struct_details')
        if await page.locator('.drawer.right', has_text='Charge').count() == 0:
            errs.append('Details : le membre Charge de S_Objet n’apparaît pas')
        await page.evaluate("""() => { const s = window.bpStore; const n = Object.values(s.graph.nodes).find(n => n.def === 'struct.setMembers'); s.selectNodes([n.id]); s.setFocus({ kind: 'nodes' }); }""")
        await page.wait_for_timeout(300)
        await shot('35_set_members_details')
        if await page.locator('.drawer.right', has_text='Membres à changer').count() == 0:
            errs.append('Details : Set Members in n’affiche pas les membres à changer')
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Les badges').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.evaluate(OPEN, 'BP_Joueur')
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'variable', id: s.cls.variables.find(v => v.name === 'Badges').id }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('36_set_variable_details')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.locator('.tb.class-name').tap()
        await page.wait_for_timeout(300)
        await shot('37_content_browser')

        # Step C of V3: a Timeline and its track editor (tap adds a key, a finger moves it), the Construction Script
        for lid in ['l-porte-glisse', 'c3-projecteur', 'l-rangee-lampes', 'l-regarder', 'l-caisse', 'r3-bouton']:
            await page.evaluate(PUT, [f'project:lesson:{lid}', (HERE / 'out' / f'{lid}.json').read_text()])
        home = (ROOT / 'dist' / 'index.html').as_uri() + '?e2e'

        async def close_sheet():
            if await page.locator('.sheet .btn', has_text='Fermer').count():
                await page.locator('.sheet .btn', has_text='Fermer').first.tap()
                await page.wait_for_timeout(200)

        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La porte qui glisse').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('38_timeline_graph')
        await page.evaluate("() => { const s = window.bpStore; s.selectNodes([Object.values(s.graph.nodes).find(n => n.def === 'timeline.node').id]); }")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.right .btn', has_text='Éditer la piste').tap()
        await page.wait_for_timeout(300)
        keys = "() => Object.values(window.bpStore.graph.nodes).find(n => n.def === 'timeline.node').config.tracks[0].keys"
        box = await page.locator('.tl-plot').bounding_box()
        x0, y0 = box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.3
        await page.touchscreen.tap(x0, y0)
        await page.wait_for_timeout(200)
        added = await page.evaluate(keys)
        if len(added) != 3:
            errs.append(f'Timeline : {len(added)} points clés après un toucher, 3 attendus')
        cdp = await ctx.new_cdp_session(page)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for i in range(1, 9):
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 - i * 15, 'y': y0 + i * 8}]})
            await page.wait_for_timeout(20)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        await page.wait_for_timeout(300)
        moved = await page.evaluate(keys)
        if len(moved) != 3 or not (moved[1]['t'] < added[1]['t'] and moved[1]['v'] < added[1]['v']):
            errs.append(f'Timeline : le point clé n’a pas suivi le doigt ({added[1]} puis {moved[1] if len(moved) > 1 else None})')
        await shot('39_timeline_editor')
        await page.locator('.timeline-editor .btn', has_text='Fermer').tap()
        await page.evaluate("() => { const s = window.bpStore; s.undo(); s.undo(); }")
        await page.locator('.drawer.right .drawer-head .btn').tap()

        # The lesson passes; then: notion apart, robustness, another way to do it, opened as a scratch project
        await page.locator('.tb.lesson').tap()
        await page.wait_for_timeout(300)
        await page.locator('.lesson-tabs button', has_text='Objectifs').tap()
        await page.locator('.lesson-body .btn.big', has_text='Vérifier').tap()
        await page.wait_for_timeout(600)
        if await page.locator('.success').count() == 0:
            errs.append('La porte qui glisse : la solution de référence ne passe pas dans l’appli')
        if await page.locator('.result.notion.ok').count() != 1:
            errs.append('Fiche de leçon : la notion visée n’est pas affichée à part')
        if await page.locator('.quality .result.ok', has_text='Marche aussi si').count() != 1:
            errs.append('Fiche de leçon : pas de résultat de robustesse')
        await page.locator('.quality').scroll_into_view_if_needed()
        await shot('40_quality_review')
        await page.locator('.alt-card .btn').scroll_into_view_if_needed()
        await shot('41_alternative_card')
        await page.locator('.alt-card .btn', has_text='Ouvrir ce graphe').tap()
        await page.wait_for_timeout(600)
        await shot('42_alternative_open')
        if await page.locator('.scratch-bar').count() != 1:
            errs.append('Autre façon de faire : le bandeau du projet d’essai manque')
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(500)
        await page.locator('.tb.stop').tap()
        await page.locator('.scratch-bar .btn').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.tb.lesson').count() != 1:
            errs.append('Autre façon de faire : pas de retour à la leçon')

        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La rangée de lampes').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.tab', has_text='Niveau').tap()
        await page.wait_for_timeout(300)
        await shot('43_construction_level')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left .mb-main', has_text='ConstructionScript').tap()
        await page.wait_for_timeout(300)
        await shot('44_construction_my_blueprint')
        await page.locator('.drawer.left .drawer-head .btn').tap()
        await page.wait_for_timeout(300)
        await shot('45_construction_graph')
        if await page.locator('.tab.active', has_text='ConstructionScript').count() != 1:
            errs.append('Construction Script : le graphe ne s’ouvre pas depuis My Blueprint')
        # Changing an instance in the level reruns the script: the editor preview follows.
        lit = await page.evaluate("""() => { const s = window.bpStore; const a = s.project.level.actors[1]; const on = s.cls.variables.find(v => v.name === 'Allumee').id; s.applyProject('test', p => { p.level.actors[1].overrides[on] = true; }); return a.name; }""")
        await page.locator('.tab', has_text='Niveau').tap()
        await page.wait_for_timeout(300)
        await shot('46_construction_rerun')

        # Step D of V3: a Line Trace drawn during Play, Event Hit pushing a crate
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Regarder et interagir').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Joueur')
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('47_trace_graph')
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(500)
        await page.locator('.key', has_text='E').first.dispatch_event('pointerdown')
        await page.wait_for_timeout(300)
        await page.locator('.key', has_text='E').first.dispatch_event('pointerup')
        await shot('48_trace_play')
        if await page.locator('.screen-msg, .screen-messages', has_text='Levier actionné').count() == 0 and 'Levier' not in await page.inner_text('body'):
            errs.append('Regarder et interagir : le levier ne réagit pas en Play')
        await page.locator('.tb.stop').tap()

        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La caisse qu’on pousse').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        await shot('49_hit_graph')

        # Step E of V3: advice on the whole project (menu), the notebook on the home screen
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Générateur et lampe').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.evaluate("""() => { const s = window.bpStore; const c = s.project.classes.find(c => c.name === 'BP_Lampe'); s.openClass(c.id); s.apply('test', (cl, g) => { const id = (k) => 'smoke_' + k; g.nodes[id('t')] = { id: id('t'), def: 'event.tick', x: 64, y: 96, config: {}, defaults: {} }; g.nodes[id('p')] = { id: id('p'), def: 'debug.printString', x: 400, y: 96, config: {}, defaults: {} }; g.links[id('l')] = { id: id('l'), from: { node: id('t'), pin: 'then' }, to: { node: id('p'), pin: 'exec' } }; }); }""")
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.menu-item', has_text='Conseils de construction').tap()
        await page.wait_for_timeout(300)
        await shot('50_advice')
        if await page.locator('.advice-card', has_text='Tick qui surveille').count() != 1:
            errs.append('Conseils de construction : « Tick qui surveille » manque')
        await page.locator('.advice-card .btn').first.tap()
        await page.wait_for_timeout(300)
        await page.evaluate("() => window.bpStore.undo()")

        await page.evaluate(PUT, ['progress', '{"done":["l01-bonjour","l02-lampe","l03-interrupteur","l-porte-glisse"]}'])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await shot('51_home_progress')
        if await page.locator('.lesson-item.next').count() != 1:
            errs.append('Accueil : la prochaine étape n’est pas mise en avant')
        await page.locator('.home-tabs button', has_text='Carnet').tap()
        await page.locator('.notebook .search').fill('timeline')
        await page.wait_for_timeout(300)
        await shot('52_notebook_search')
        found = await page.locator('.note-item').count()
        if found < 3 or await page.locator('.note-item.done', has_text='Play reprend').count() != 1:
            errs.append(f'Carnet : recherche « timeline » : {found} fiches, la leçon réussie doit montrer sa phrase à retenir')
        print('errors', errs)
        await b.close()
        return errs


sys.exit(1 if asyncio.run(main()) else 0)
