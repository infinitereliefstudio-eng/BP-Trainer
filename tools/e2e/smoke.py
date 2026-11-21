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
import asyncio, json, os, pathlib, re, sys
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / 'out' / 'shots'
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
PUT = """([key, json]) => new Promise((res, rej) => { const r = indexedDB.open('bp-trainer', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv','readwrite'); tx.objectStore('kv').put(json, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }; })"""
OPEN = """(name) => { const s = window.bpStore; s.openClass(s.project.classes.find(c => c.name === name).id); }"""


async def graph(page):
    """Open the Event Graph of the Blueprint being edited (its editor tab first, from the level)."""
    if await page.locator('.graph-tabs').count() == 0:
        await page.locator('.doc-tab.current .doc-open').tap()
        await page.wait_for_timeout(200)
    await page.locator('.graph-tabs .tab', has_text='Event Graph').tap()


async def free_play(page):
    """Simulation libre › Mes projets (V7.41): opens the first project of the list, or creates one when there is none."""
    await page.locator('.btn.big', has_text='Simulation libre').tap()
    await page.wait_for_timeout(400)
    if await page.locator('.project-open').count():
        await page.locator('.project-open').first.tap()
    else:
        await page.locator('.projects-btn', has_text='Nouveau projet').tap()
        await page.wait_for_timeout(200)
        await page.locator('.dialog .btn.primary', has_text='Créer').tap()


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
        await graph(page)
        await page.wait_for_timeout(300)
        await shot('02_lamp_graph')
        # V7.31: in landscape the graph keeps about two thirds of the height, and the floating buttons stay apart.
        room = await page.evaluate("""() => {
            const r = (q) => document.querySelector(q).getBoundingClientRect();
            const ws = r('.workspace'), bar = r('.bottom-bar'), rail = r('.fab-rail'), plus = r('.fab.primary');
            return { graph: bar.top - ws.top, rail: rail.bottom, plus: plus.top, plusBottom: plus.bottom, bar: bar.top };
        }""")
        if room['graph'] < 240:
            errs.append(f'Graphe : {room["graph"]:.0f} px de haut en paysage, 240 attendus au moins')
        if room['rail'] > room['plus'] or room['plusBottom'] > room['bar']:
            errs.append(f'Boutons flottants : la colonne ou le + se chevauchent ({room})')
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
        await graph(page)
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
        await page.locator('.palette .btn', has_text='Fermer').tap()
        await page.wait_for_timeout(200)
        # V7.8: browsing All Actions (folded categories), then Find Results
        await page.locator('.fab.primary').tap()
        await page.wait_for_timeout(200)
        await page.locator('.palette-cat-row', has_text='Variables').first.tap()
        await page.wait_for_timeout(200)
        await shot('13b_all_actions')
        await page.locator('.palette .btn', has_text='Fermer').tap()
        await page.wait_for_timeout(200)
        await page.locator('.tb', has_text='Find').tap()
        await page.wait_for_timeout(200)
        await page.locator('.find-head .search').fill('event')
        await page.wait_for_timeout(200)
        await shot('13c_find_results')
        await page.locator('.find-all').tap()
        await page.wait_for_timeout(200)
        await page.locator('.find-hit').first.tap()
        await page.wait_for_timeout(300)
        await shot('13d_find_jump')
        # V7.9: the Blueprint Viewport, then the level's Outliner / Details drawer
        await page.locator('.graph-tabs .tab', has_text='Viewport').tap()
        await page.wait_for_timeout(300)
        await shot('13e_viewport')
        box = await page.locator('.graph-canvas.viewport canvas').bounding_box()
        await page.mouse.click(box['x'] + box['width'] / 2, box['y'] + (box['height'] - 60) / 2)
        await page.wait_for_timeout(300)
        before = await page.evaluate("() => { const s = window.bpStore; const c = s.cls.components.find(c => c.id === s.focus.id); return c ? [c.props.x, c.props.y] : null; }")
        cx, cy = box['x'] + box['width'] / 2, box['y'] + (box['height'] - 60) / 2
        await page.mouse.move(cx, cy)
        await page.mouse.down()
        for i in range(1, 9):
            await page.mouse.move(cx, cy + i * 8)
            await page.wait_for_timeout(16)
        await page.mouse.up()
        await page.wait_for_timeout(200)
        after = await page.evaluate("() => { const s = window.bpStore; const c = s.cls.components.find(c => c.id === s.focus.id); return c ? [c.props.x, c.props.y] : null; }")
        if not before or not after or after == before:
            errs.append(f'Viewport : glisser le composant ne l’a pas déplacé ({before} → {after})')
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('13f_viewport_component')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.locator('.graph-tabs .tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(200)
        if await page.locator('.graph-canvas.viewport').count():
            errs.append('Event Graph : le Viewport est resté affiché')
        await page.locator('.doc-tab.level').tap()
        await page.evaluate("() => window.bpStore.setFocus({ kind: 'none' })")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.outliner-pick').first.tap()
        await page.wait_for_timeout(300)
        await shot('13g_level_outliner')
        await page.locator('.outliner-line.selected .chip').tap()
        await page.wait_for_timeout(200)
        await shot('13h_level_details')
        await page.locator('.drawer.right .drawer-head .btn').tap()

        # Lesson 12 in Play, with the live Outliner (step 4)
        await page.evaluate(PUT, ['project:lesson:l12-station', (HERE / 'out' / 'l12-station.json').read_text()])
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Remettre la station').tap()
        await page.wait_for_timeout(500)
        await page.locator('.doc-tab.level').tap()
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
        await graph(page)
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
        await page.locator('.bottom-bar-tab', has_text='Output Log').tap()
        await page.wait_for_timeout(200)
        if not await page.locator('.why-btn').count():
            errs.append('Output Log : aucun « Pourquoi ? » sur les erreurs')
        else:
            await page.locator('.why-btn').first.tap()
            await page.wait_for_timeout(200)
        await shot('16_log_why')
        # V7.30: in a Débogue, a hypothesis before the first hint (D1 is in Confirmé: hints after a first Vérifier)
        await page.locator('.tb.lesson').tap()
        await page.wait_for_timeout(300)
        await page.locator('.lesson-tabs button', has_text='Objectifs').tap()
        await page.locator('.lesson-body .btn.big', has_text='Vérifier').tap()
        await page.wait_for_timeout(500)
        await page.locator('.lesson-tabs button', has_text='Aide').tap()
        await page.wait_for_timeout(200)
        if await page.locator('.hypothesis-options .option').count() != 4:
            errs.append('Débogue : pas de question « où est le problème ? » avant le premier indice')
        else:
            await shot('16b_hypothesis_ask')
            await page.locator('.hypothesis-options .option', has_text='La référence').tap()
            await page.wait_for_timeout(500)
            if await page.locator('.card.hypothesis', has_text='Bien vu').count() != 1:
                errs.append('Débogue : la réponse à l’hypothèse « la référence » ne confirme pas l’Accessed None de D1')
            if await page.locator('.hint-card h4', has_text='Indice').count() != 1:
                errs.append('Débogue : le premier indice ne s’ouvre pas après l’hypothèse')
            await shot('16c_hypothesis_answer')
        await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.wait_for_timeout(200)

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
        await graph(page)
        await page.wait_for_timeout(300)
        await shot('19_complete_graph')

        # Step D of V2: the Confirmé and Avancé levels
        await page.goto((ROOT / 'dist' / 'index.html').as_uri() + '?e2e')
        await page.wait_for_timeout(500)
        await page.locator('.module h2', has_text='Avancé').scroll_into_view_if_needed()
        await shot('20_home_advanced')
        if await page.locator('.lesson-item').count() != 140:
            errs.append(f"Accueil : {await page.locator('.lesson-item').count()} étapes au lieu de 140")
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
        await graph(page)
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
        await page.locator('.doc-tab.current .doc-open').tap()
        await page.wait_for_timeout(200)
        await page.locator('.graph-tabs .tab', has_text='AjouterArticle').tap()
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
        await page.locator('.lesson-item', has_text=re.compile(r'Le terminal(?! muet| à badge| de la station)')).tap()
        await page.wait_for_timeout(500)
        if await page.locator('.sheet .btn', has_text='Fermer').count():
            await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.evaluate(OPEN, 'BP_Joueur')
        await graph(page)
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
        await graph(page)
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
        await graph(page)
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
        await page.locator('.content-drawer-btn').tap()
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
        await graph(page)
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
        await page.locator('.doc-tab.level').tap()
        await page.wait_for_timeout(300)
        await shot('43_construction_level')
        await graph(page)
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left .mb-main', has_text='ConstructionScript').tap()
        await page.wait_for_timeout(300)
        await shot('44_construction_my_blueprint')
        await page.locator('.drawer.left .drawer-head .btn').tap()
        await page.wait_for_timeout(300)
        await shot('45_construction_graph')
        if await page.locator('.tab.active', has_text='Construction Script').count() != 1:
            errs.append('Construction Script : le graphe ne s’ouvre pas depuis My Blueprint')
        # Changing an instance in the level reruns the script: the editor preview follows.
        lit = await page.evaluate("""() => { const s = window.bpStore; const a = s.project.levels[0].actors[1]; const on = s.cls.variables.find(v => v.name === 'Allumee').id; s.applyProject('test', p => { p.levels[0].actors[1].overrides[on] = true; }); return a.name; }""")
        await page.locator('.doc-tab.level').tap()
        await page.wait_for_timeout(300)
        await shot('46_construction_rerun')

        # Step D of V3: a Line Trace drawn during Play, Event Hit pushing a crate
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Regarder et interagir').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Joueur')
        await graph(page)
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
        await page.locator('.lesson-item', has_text='Détruire proprement').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await graph(page)
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

        # The progress is set by hand, keeping the attempt log written by the Vérifier above (V7.27)
        stored = await page.evaluate("""() => new Promise((res) => { const r = indexedDB.open('bp-trainer', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('progress'); q.onsuccess = () => { const v = q.result; res(v && typeof v === 'object' ? v.text : v); }; }; })""")
        log = json.loads(stored or '{}').get('log')
        if not log or not log.get('attempts'):
            errs.append('Journal des essais : rien d’enregistré après les Vérifier')
        await page.evaluate(PUT, ['progress', json.dumps({'done': ['l01-bonjour', 'l02-lampe', 'l03-interrupteur', 'l-porte-glisse'], **({'log': log} if log else {})})])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await shot('51_home_progress')
        if await page.locator('.lesson-item.next').count() != 1:
            errs.append('Accueil : la prochaine étape n’est pas mise en avant')
        await page.locator('.home-tabs button', has_text='Carnet').tap()
        await page.wait_for_timeout(200)
        # V7.27: the attempt log, filled by the Vérifier pressed above
        if await page.locator('.attempt-log').count() != 1:
            errs.append('Carnet : pas de journal des essais après des vérifications')
        else:
            await page.locator('.attempt-log summary').tap()
            await page.wait_for_timeout(200)
            if await page.locator('.attempt .attempt-status.ok').count() < 1:
                errs.append('Carnet : le journal des essais ne montre pas l’étape réussie')
            await page.locator('.attempt').first.scroll_into_view_if_needed()
            await shot('51b_attempt_log')
            await page.locator('.attempt-log summary').tap()
        await page.locator('.notebook .search').fill('timeline')
        await page.wait_for_timeout(300)
        await shot('52_notebook_search')
        found = await page.locator('.note-item').count()
        if found < 3 or await page.locator('.note-item.done', has_text='Play reprend').count() != 1:
            errs.append(f'Carnet : recherche « timeline » : {found} fiches, la leçon réussie doit montrer sa phrase à retenir')

        # V4: spaced review, node index, UE memo, objectives visible while building
        await page.locator('.home-tabs button', has_text='Révision').tap()
        await page.wait_for_timeout(300)
        if await page.locator('.count-badge').count() != 1:
            errs.append('Révision : pas de compteur de questions à revoir sur l’onglet')
        # V7.28: « À retravailler en Blueprint », a passed step redone from scratch, apart from the lesson
        if await page.locator('.rework-item').count() < 1:
            errs.append('Révision : rien à retravailler en Blueprint alors que des étapes sont réussies depuis longtemps')
        else:
            await page.locator('.rework').scroll_into_view_if_needed()
            await shot('52b_rework_queue')
            await page.locator('.rework-item .btn.primary').first.tap()
            await page.wait_for_timeout(600)
            await close_sheet()
            if await page.locator('.practice-bar').count() != 1:
                errs.append('Reprise de zéro : le bandeau de reprise manque')
            await shot('52c_practice')
            # V7.29: a drill « à compléter » shows its gaps as yellow frames in the graph
            if await page.locator('.practice-bar', has_text='Mini-exercice').count() == 1:
                await graph(page)
                await page.wait_for_timeout(300)
                await shot('52d_drill_graph')
                if await page.evaluate("() => Object.values(window.bpStore.graph.nodes).filter(n => n.def === 'util.comment').length") < 2:
                    errs.append('Mini-exercice à compléter : les cadres jaunes des nœuds manquants ne sont pas dans le graphe')
            await page.locator('.practice-bar .btn', has_text='Retour à la file').tap()
            await page.wait_for_timeout(400)
            if await page.locator('.home-tabs button.active', has_text='Révision').count() != 1:
                errs.append('Reprise de zéro : le retour ne ramène pas à l’onglet Révision')
        await page.locator('.review .btn.big').first.tap()
        await page.wait_for_timeout(300)
        await shot('53_review_question')
        if await page.locator('.quiz .option').count() != 4:
            errs.append('Révision : la question n’a pas quatre réponses')
        await page.locator('.quiz .option').first.tap()
        await page.wait_for_timeout(300)
        await shot('54_review_answer')
        if await page.locator('.quiz .option.answer').count() != 1:
            errs.append('Révision : la bonne réponse n’est pas montrée après le choix')
        await page.locator('.home-tabs button', has_text='Nœuds').tap()
        await page.wait_for_timeout(300)
        await page.locator('.notebook .search').fill('delay')
        await page.wait_for_timeout(300)
        if await page.locator('.node-item').count() < 2:
            errs.append('Index des nœuds : la recherche « delay » ne trouve pas Delay et Retriggerable Delay')
        await page.locator('.node-head').first.tap()
        await page.wait_for_timeout(300)
        await shot('55_node_index')
        if await page.locator('.node-body').count() != 1:
            errs.append('Index des nœuds : la fiche du nœud ne s’ouvre pas')
        await page.locator('.home-tabs button', has_text='Mémo UE').tap()
        await page.wait_for_timeout(300)
        await page.locator('.note-item', has_text='Enhanced Input').tap()
        await page.wait_for_timeout(300)
        await shot('56_memo_card')
        if await page.locator('.memo-card').count() != 1:
            errs.append('Mémo : la fiche Enhanced Input ne s’ouvre pas')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Interrupteur à touche').first.tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        if await page.locator('.goal-strip').count() != 1:
            errs.append('Leçon : la bande des objectifs manque')
        await page.locator('.goal-verify').tap()
        await page.wait_for_timeout(600)
        await shot('57_goal_strip')
        if await page.locator('.goal-result').count() != 1:
            errs.append('Leçon : Vérifier depuis la bande n’affiche pas de résultat')
        # V6: the lessons of the exercise collection, their new nodes in the palette and index.
        for lid in ['l-miroirs', 'l-reseau', 'd15-grille', 'l-meme-donne']:
            await page.evaluate(PUT, [f'project:lesson:{lid}', (HERE / 'out' / f'{lid}.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le rayon et les miroirs').tap()
        await page.wait_for_timeout(500)
        await shot('58_mirrors_sheet')
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Emetteur')
        await graph(page)
        await page.wait_for_timeout(300)
        await shot('59_mirrors_graph')
        await page.evaluate("() => { const s = window.bpStore; const n = Object.values(s.graph.nodes).find(n => n.def === 'trace.lineByChannel'); n.defaults.debug = 1; }")
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(1200)
        await shot('60_mirrors_play')
        await page.locator('.tb.stop').tap()
        await page.wait_for_timeout(300)
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le réseau en boucle').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.doc-tab.level').tap()
        await page.wait_for_timeout(300)
        await shot('61_grid_level')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Les meubles sur une grille tournée').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await graph(page)
        await page.wait_for_timeout(300)
        await shot('62_floor_graph')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La même donne').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await graph(page)
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left .mb-main', has_text='Hasard').tap()
        await page.wait_for_timeout(300)
        await shot('63_random_stream_details')
        if await page.locator('.drawer.right', has_text='Initial Seed').count() != 1:
            errs.append('Random Stream : Initial Seed absent des Details de la variable')

        # V7: a Data Table in the Content Browser and its Details; a Save Game slot written by Play
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le catalogue').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await page.wait_for_timeout(200)
        await shot('63b_content_drawer')
        await page.locator('.cd-tile', has_text='DT_Objets').first.tap()
        await page.locator('.cd-selection .btn', has_text='Ouvrir').tap()
        await page.wait_for_timeout(400)
        await shot('64_data_table_details')
        if await page.locator('.drawer.right', has_text='Row Structure').count() != 1:
            errs.append('Data Table : Row Structure absent des Details')
        await page.evaluate(PUT, ['project:lesson:l-tirelire', (HERE / 'out' / 'l-tirelire.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item:not(.exercise)', has_text='La tirelire').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(600)
        for _ in range(3):
            await page.locator('.key', has_text='E').first.dispatch_event('pointerdown')
            await page.wait_for_timeout(120)
            await page.locator('.key', has_text='E').first.dispatch_event('pointerup')
            await page.wait_for_timeout(120)
        await page.locator('.tb.stop').tap()
        await page.wait_for_timeout(300)
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await shot('65_save_slots')
        if await page.locator('.slot-item', has_text='Tirelire').count() != 1:
            errs.append('Save Game : le slot Tirelire n’apparaît pas dans le Content Browser après Play')

        # V7.1: Consume Input in the Details of a key event (D19)
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Seule la dernière porte').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await graph(page)
        await page.wait_for_timeout(300)
        await page.evaluate("""() => { const s = window.bpStore; const n = Object.values(s.graph.nodes).find(n => n.def === 'event.inputKey'); s.selectNodes([n.id]); s.setFocus({ kind: 'nodes' }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('66_consume_input')
        if await page.locator('.drawer.right', has_text='Consume Input').count() != 1:
            errs.append('Event de touche : Consume Input absent des Details')

        # Lot 0: help by level, locked from Confirmé (hint after a try, no node list)
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Qui modifie quoi').tap()
        await page.wait_for_timeout(500)
        await page.locator('.lesson-tabs button', has_text='Aide').tap()
        await page.wait_for_timeout(200)
        await shot('67_help_locked')
        if await page.locator('.lesson-body', has_text='après un premier essai').count() != 1:
            errs.append('Aide Confirmé : l’indice devrait attendre un premier essai')
        if await page.locator('.lesson-body button', has_text='Quels nœuds').count():
            errs.append('Aide Confirmé : pas de liste de nœuds à ce niveau')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.module h2', has_text='Confirmé').scroll_into_view_if_needed()
        await shot('68_home_help_rule')
        # Lot 3a: the pause menu. Trigger when Paused in the Input Action's Details, PAUSED in Play, and back.
        await page.evaluate(PUT, ['project:lesson:l-menu-pause', (HERE / 'out' / 'l-menu-pause.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le menu pause').first.tap()
        await page.wait_for_timeout(500)
        await page.evaluate("""() => { const s = window.bpStore; s.setFocus({ kind: 'inputAction', id: s.project.inputActions.find(a => a.name === 'IA_Pause').id }); }""")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('69_trigger_when_paused')
        if await page.locator('.drawer.right', has_text='Trigger when Paused').count() != 1:
            errs.append('Input Action : Trigger when Paused absent des Details')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(700)
        await page.locator('.keys .key', has_text='Espace').tap()
        await page.wait_for_timeout(900)
        await shot('70_game_paused')
        if await page.locator('.game-paused').count() != 1:
            errs.append('Menu pause : PAUSED ne s’affiche pas après Espace')
        await page.locator('.keys .key', has_text='Espace').tap()
        await page.wait_for_timeout(400)
        if await page.locator('.game-paused').count() != 0:
            errs.append('Menu pause : le jeu reste en pause après le second Espace')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # Lot 4a: an Avancé step is a brief, its step-by-step card waits for success
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Détruire proprement').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.lesson-tabs').count() == 0:
            await page.locator('.tb.lesson').tap()
            await page.wait_for_timeout(300)
        await page.locator('.lesson-tabs button', has_text='Comprendre').tap()
        await page.wait_for_timeout(200)
        await shot('71_avance_brief')
        if await page.locator('.lesson-body .held-cards').count() != 1:
            errs.append('Avancé : la fiche « Le plan » devrait attendre la réussite')
        if await page.locator('.lesson-body .card h4', has_text='Le plan').count():
            errs.append('Avancé : la fiche « Le plan » est visible avant la réussite')

        # Lot 4b: the Expert level on the home screen, a project with no hint
        await page.goto(home)
        await page.wait_for_timeout(500)
        if await page.locator('.module h2', has_text='Expert').count() != 1:
            errs.append('Accueil : le niveau Expert n’apparaît pas')
        await page.locator('.lesson-item', has_text='La radio de la station').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='La radio de la station').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.lesson-tabs').count() == 0:
            await page.locator('.tb.lesson').tap()
            await page.wait_for_timeout(300)
        await page.locator('.lesson-tabs button', has_text='Aide').tap()
        await page.wait_for_timeout(200)
        await shot('72_expert_help')
        if await page.locator('.lesson-body button', has_text='indice').count():
            errs.append('Expert : un indice est proposé')

        # V7.19: Actor Components. Pick Parent Class › Actor Component, + Add in an actor, its Details, the level, Play and Debug.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await free_play(page)
        await page.wait_for_timeout(600)
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await page.locator('.btn', has_text='+ Add').first.tap()
        await page.locator('.palette-item', has_text='Blueprint Class').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('.palette-item', has_text='Actor Component').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('input.field').last.fill('BP_Sante')
        await page.locator('.btn', has_text='Créer').last.tap()
        await page.wait_for_timeout(500)
        made = await page.evaluate("() => { const s = window.bpStore; return [s.cls.name, s.cls.parent, s.cls.components.length]; }")
        if made != ['BP_Sante', 'ActorComponent', 0]:
            errs.append(f'Actor Component : création inattendue {made}')
        if await page.locator('.graph-tabs .tab', has_text='Viewport').count():
            errs.append('Actor Component : un onglet Viewport est proposé')
        # Its logic: a Vie (Instance Editable) lowered on Tick, and a dispatcher.
        await page.evaluate("""() => { const s = window.bpStore; s.apply('logique', (cl, g) => {
          cl.variables.push({ id: 'v_vie', name: 'Vie', type: { category: 'int' }, defaultValue: 100, instanceEditable: true, category: 'Default', tooltip: '' });
          cl.dispatchers.push({ id: 'd_mort', name: 'OnMort', params: [] });
          g.nodes.t = { id: 't', def: 'event.tick', x: 0, y: 0, config: {}, defaults: {} };
          g.nodes.i = { id: 'i', def: 'var.decrementInt', x: 260, y: 0, config: {}, defaults: {} };
          g.nodes.g = { id: 'g', def: 'var.get', x: 100, y: 160, config: { variable: 'v_vie' }, defaults: {} };
          g.links.l1 = { id: 'l1', from: { node: 't', pin: 'then' }, to: { node: 'i', pin: 'exec' } };
          g.links.l2 = { id: 'l2', from: { node: 'g', pin: 'value' }, to: { node: 'i', pin: 'value' } };
        }); }""")
        await page.evaluate(OPEN, 'BP_Lampe')
        await graph(page)
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.mb-add[aria-label="Ajouter dans Components"]').tap()
        await page.wait_for_timeout(300)
        await shot('73_add_actor_component')
        await page.locator('button', has_text='BP_Sante · Actor Component').first.tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left .drawer-head .btn').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await shot('74_actor_component_details')
        await page.locator('.drawer.right .event-add').first.scroll_into_view_if_needed()
        await page.locator('.drawer.right .event-add').first.tap()
        await page.wait_for_timeout(300)
        if not await page.evaluate("() => Object.values(window.bpStore.graph.nodes).some(n => n.def === 'event.componentDispatcher')"):
            errs.append('Actor Component : le + de On OnMort n’a pas ajouté l’événement')
        await page.locator('.tb.play').first.tap()
        await page.wait_for_timeout(900)
        await page.evaluate(OPEN, 'BP_Sante')
        await page.wait_for_timeout(300)
        await page.locator('.doc-tab', has_text='BP_Sante').first.tap()
        await page.wait_for_timeout(300)
        await page.get_by_text('Debug', exact=True).first.tap()
        await page.wait_for_timeout(500)
        await shot('75_actor_component_debug')
        if await page.locator('.debug-panel select option', has_text='BP_Sante').count() == 0 and await page.locator('.debug-panel', has_text='(BP_Lampe)').count() == 0:
            errs.append('Actor Component : sa copie n’est pas proposée comme objet débogué')

        # V7.20: the Actor Components steps after « L’héritage »: a Prédis, the refactor's brief, the badge lock.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Qui commence ?').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='Qui commence ?').tap()
        await page.wait_for_timeout(500)
        await shot('76_predict_component_order')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La santé est partout').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='La santé est partout').tap()
        await page.wait_for_timeout(500)
        await shot('77_refactor_health')
        # V7.25: R5 is the guided rung of Actor Components, its method stays in view (helpPolicy, first rung).
        if not await page.locator('.lesson-body .card h4', has_text='La réécriture').count():
            errs.append('R5 : la fiche « La réécriture » manque alors que c’est l’étape guidée des composants')
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Drone')
        await graph(page)
        await page.wait_for_timeout(300)
        await shot('78_refactor_health_graph')

        # V7.21: the usage steps: interaction by component, the battery that does not compile, the chest's inventory.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Interagir par composant').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='Interagir par composant').tap()
        await page.wait_for_timeout(500)
        await shot('79_interaction_component')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La batterie qui ne sait pas').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='La batterie qui ne sait pas').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Batterie')
        await graph(page)
        await page.locator('.tb', has_text='Compile').first.tap()
        await page.wait_for_timeout(400)
        await shot('80_battery_compile_error')
        if not await page.evaluate("() => window.bpStore.compileStatus === 'error'"):
            errs.append('D23 : BP_Batterie compile sans erreur au départ')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le sac et le coffre').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='Le sac et le coffre').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.evaluate(OPEN, 'BP_Coffre')
        await graph(page)
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left button', has_text='Inventaire').first.tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.left .drawer-head .btn').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        if await page.locator('.drawer.right', has_text='Objets').count() == 0:
            errs.append('Le sac et le coffre : les Objets du composant Inventaire ne sont pas dans les Details')
        else:
            await page.locator('.drawer.right').get_by_text('Objets', exact=True).first.scroll_into_view_if_needed()
            await page.wait_for_timeout(200)
        await shot('81_chest_inventory_details')

        # V7.22: the advice « Chaîne copiée entre Blueprints » on R5's starting project (the health copied three times).
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La santé est partout').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='La santé est partout').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.menu-item', has_text='Conseils de construction').tap()
        await page.wait_for_timeout(300)
        if await page.locator('.advice-card', has_text='Chaîne copiée entre Blueprints').count() == 0:
            errs.append('Conseils : « Chaîne copiée entre Blueprints » manque sur la santé copiée de R5')
        else:
            await page.locator('.advice-card', has_text='Chaîne copiée entre Blueprints').first.scroll_into_view_if_needed()
        await page.wait_for_timeout(200)
        await shot('82_advice_copied_across')


        # V7.33: Widget Blueprint (UMG). + Add › User Interface › Widget Blueprint, the Designer, Palette, Hierarchy, Details, a drag, the Graph.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await free_play(page)
        await page.wait_for_timeout(600)
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await page.locator('.btn', has_text='+ Add').first.tap()
        await page.locator('.palette-item', has_text='User Interface').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('.palette-item', has_text='Widget Blueprint').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('input.field').last.fill('WBP_HUD')
        await page.locator('.btn', has_text='Créer').last.tap()
        await page.wait_for_timeout(500)
        if await page.locator('.graph-tabs .tab.active', has_text='Designer').count() == 0:
            errs.append('Widget Blueprint : il ne s’ouvre pas sur le Designer')
        await shot('83_widget_designer_empty')
        palette = page.locator('button[aria-label="Ouvrir la Palette et la Hierarchy"]')
        async def place(label):
            await palette.tap()
            await page.wait_for_timeout(250)
            await page.locator('.designer-panel .drawer-tab', has_text='Palette').tap()
            await page.locator('.designer-panel .palette-item .pi-title', has_text=label).first.tap()
            await page.wait_for_timeout(250)
        await place('Canvas Panel')
        root = "() => { const s = window.bpStore; const r = s.cls.widgets.find(w => !w.parent); s.setFocus({ kind: 'widget', id: r.id }); }"
        for label in ['Text', 'Progress Bar', 'Button']:
            await page.evaluate(root)
            await place(label)
        kinds = await page.evaluate("() => window.bpStore.cls.widgets.map(w => w.kind + ':' + (w.parent ? 'child' : 'root'))")
        if kinds != ['CanvasPanel:root', 'TextBlock:child', 'ProgressBar:child', 'Button:child']:
            errs.append(f'Designer : arbre inattendu {kinds}')
        if await page.locator('.designer .umg-TextBlock').count() != 1:
            errs.append('Designer : le Text ne s’affiche pas')
        await shot('84_widget_designer')
        await palette.tap()
        await page.wait_for_timeout(250)
        await page.locator('.designer-panel .drawer-tab', has_text='Hierarchy').tap()
        await page.wait_for_timeout(250)
        await shot('85_widget_hierarchy')
        await page.locator('.drawer.left .drawer-head .btn').tap()
        await page.wait_for_timeout(200)
        # Drag the Progress Bar in the Canvas Panel.
        bar = await page.locator('.designer .umg-ProgressBar').bounding_box()
        before = await page.evaluate("() => window.bpStore.cls.widgets.find(w => w.kind === 'ProgressBar').slot.offsets.slice(0, 2)")
        cdp = await ctx.new_cdp_session(page)
        x, y = bar['x'] + bar['width'] / 2, bar['y'] + bar['height'] / 2
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        for i in range(1, 9):
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + i * 12, 'y': y + i * 6}]})
            await page.wait_for_timeout(16)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        await page.wait_for_timeout(300)
        after = await page.evaluate("() => window.bpStore.cls.widgets.find(w => w.kind === 'ProgressBar').slot.offsets.slice(0, 2)")
        if not (after[0] > before[0] + 100 and after[1] > before[1] + 50):
            errs.append(f'Designer : le glisser ne déplace pas la Progress Bar ({before} → {after})')
        # The Text's Details: Is Variable, then the Slot with the anchors.
        await page.evaluate("() => { const s = window.bpStore; s.setFocus({ kind: 'widget', id: s.cls.widgets.find(w => w.kind === 'TextBlock').id }); }")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.right .d-field', has_text='Is Variable').locator('input').check()
        await page.wait_for_timeout(200)
        await shot('86_widget_details')
        await page.locator('.drawer.right .anchor-grid').scroll_into_view_if_needed()
        await page.wait_for_timeout(200)
        await shot('87_widget_anchors')
        await page.locator('.drawer.right .drawer-head .btn').tap()
        # The Graph: Event Construct in the palette, no BeginPlay; the Text is a variable in My Blueprint.
        await page.locator('.graph-tabs .tab', has_text='Event Graph').tap()
        await page.wait_for_timeout(300)
        defs = await page.evaluate("""() => { const s = window.bpStore; return s.cls.widgets.filter(w => w.isVariable).map(w => w.name); }""")
        if 'TextBlock' not in defs:
            errs.append(f'Designer : Is Variable n’a pas pris sur le Text ({defs})')
        await page.locator('button[aria-label="Ouvrir My Blueprint"]').tap()
        await page.wait_for_timeout(300)
        if await page.locator('.drawer.left .mb-row', has_text='TextBlock').count() == 0:
            errs.append('My Blueprint : le Text coché Is Variable manque aux Variables')
        await shot('88_widget_my_blueprint')

        # V7.34: widgets on the screen. Create Binding from the Progress Bar's Details, Pre Construct in the Designer,
        # then BP_Lampe creates the HUD and adds it to the viewport: Play draws it, the Outliner lists it with its Binding.
        await page.locator('.drawer.left .drawer-head .btn').tap()
        await page.wait_for_timeout(200)
        await page.locator('.graph-tabs .tab', has_text='Designer').tap()
        await page.wait_for_timeout(300)
        await page.evaluate("() => { const s = window.bpStore; s.setFocus({ kind: 'widget', id: s.cls.widgets.find(w => w.kind === 'ProgressBar').id }); }")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.right select[aria-label="Bind percent"]').select_option('__create')
        await page.wait_for_timeout(400)
        if await page.locator('.graph-tabs .tab.active', has_text='GetPercent_0').count() == 0:
            errs.append('Create Binding : la fonction GetPercent_0 ne s’ouvre pas')
        await shot('89_widget_create_binding')
        if await page.locator('.drawer.right.open .drawer-head .btn').count():
            await page.locator('.drawer.right.open .drawer-head .btn').first.tap()
            await page.wait_for_timeout(200)
        # Wire by hand what a learner would: Pre Construct and Construct set the Text; the binding returns 0.6.
        await page.evaluate("""() => {
          const s = window.bpStore;
          s.applyProject('e2e HUD', (p) => {
            const hud = p.classes.find(c => c.name === 'WBP_HUD');
            const text = hud.widgets.find(w => w.kind === 'TextBlock');
            const fn = hud.graphs.find(g => g.name === 'GetPercent_0');
            const ret = Object.values(fn.nodes).find(n => n.def === 'fn.return');
            ret.defaults[fn.fn.outputs[0].id] = 0.6;
            const g = hud.graphs.find(g => g.kind === 'event');
            const node = (id, def, x, y, config = {}, defaults = {}) => { g.nodes[id] = { id, def, x, y, config, defaults }; return id; };
            const link = (id, a, pa, b, pb) => { g.links[id] = { id, from: { node: a, pin: pa }, to: { node: b, pin: pb } }; };
            node('e2e_pre', 'event.preConstruct', 0, 600);
            node('e2e_set1', 'widget.setText', 320, 600, {}, { text: 'Aperçu du Designer' });
            node('e2e_get1', 'var.widget', 160, 760, { widget: text.id });
            link('e2e_l1', 'e2e_pre', 'then', 'e2e_set1', 'exec');
            link('e2e_l2', 'e2e_get1', 'value', 'e2e_set1', 'target');
            node('e2e_con', 'event.construct', 0, 900);
            node('e2e_set2', 'widget.setText', 320, 900, {}, { text: 'Score : 0' });
            node('e2e_get2', 'var.widget', 160, 1060, { widget: text.id });
            link('e2e_l3', 'e2e_con', 'then', 'e2e_set2', 'exec');
            link('e2e_l4', 'e2e_get2', 'value', 'e2e_set2', 'target');
            const lamp = p.classes.find(c => c.name === 'BP_Lampe');
            const lg = lamp.graphs[0];
            const begin = Object.values(lg.nodes).find(n => n.def === 'event.beginPlay');
            for (const [id, l] of Object.entries(lg.links)) if (l.from.node === begin.id) delete lg.links[id];
            lg.nodes.e2e_cw = { id: 'e2e_cw', def: 'widget.create', x: 300, y: 300, config: {}, defaults: { class: hud.id } };
            lg.nodes.e2e_pc = { id: 'e2e_pc', def: 'player.getController', x: 100, y: 420, config: {}, defaults: {} };
            lg.nodes.e2e_av = { id: 'e2e_av', def: 'widget.addToViewport', x: 620, y: 300, config: {}, defaults: {} };
            lg.links.e2e_m1 = { id: 'e2e_m1', from: { node: begin.id, pin: 'then' }, to: { node: 'e2e_cw', pin: 'exec' } };
            lg.links.e2e_m2 = { id: 'e2e_m2', from: { node: 'e2e_pc', pin: 'result' }, to: { node: 'e2e_cw', pin: 'owner' } };
            lg.links.e2e_m3 = { id: 'e2e_m3', from: { node: 'e2e_cw', pin: 'then' }, to: { node: 'e2e_av', pin: 'exec' } };
            lg.links.e2e_m4 = { id: 'e2e_m4', from: { node: 'e2e_cw', pin: 'result' }, to: { node: 'e2e_av', pin: 'target' } };
          });
        }""")
        await page.wait_for_timeout(200)
        await page.locator('.graph-tabs .tab', has_text='Designer').tap()
        await page.wait_for_timeout(400)
        if await page.locator('.designer .umg-text', has_text='Aperçu du Designer').count() == 0:
            errs.append('Designer : Event Pre Construct ne change pas l’aperçu')
        await shot('90_widget_pre_construct')
        # V7.39: the Designer's Screen Size: the phone's format of Play, wider than 1280 × 720; then back to the reference.
        await page.locator('.designer-size').tap()
        await page.wait_for_timeout(300)
        phone = await page.locator('.designer-size').inner_text()
        if 'Téléphone' not in phone or '1280 ×' in phone:
            errs.append(f'Designer : le format Téléphone ne s’affiche pas ({phone})')
        await shot('99_designer_phone_screen')
        await page.locator('.designer-size').tap()
        await page.wait_for_timeout(300)
        if '1280 × 720' not in await page.locator('.designer-size').inner_text():
            errs.append('Designer : retour à 1280 × 720 impossible')
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(800)
        if await page.locator('.umg-layer .umg-text', has_text='Score : 0').count() == 0:
            errs.append('Play : le HUD (Score : 0) ne s’affiche pas')
        fill = await page.evaluate("() => { const f = document.querySelector('.umg-layer .umg-bar-fill'); return f ? f.style.width : ''; }")
        if fill != '60%':
            errs.append(f'Play : la Progress Bar liée devrait être à 60 % ({fill})')
        await shot('91_play_hud')
        await page.locator('.pb-btn[aria-label="Outliner"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.outliner-row', has_text='WBP_HUD_C_0').tap()
        await page.wait_for_timeout(300)
        if await page.locator('.outliner .d-field', has_text='GetPercent_0').count() == 0:
            errs.append('Outliner : le widget ne montre pas sa Binding')
        await shot('92_play_widget_outliner')
        if await page.locator('.drawer.right.open .drawer-head .btn').count():
            await page.locator('.drawer.right.open .drawer-head .btn').first.tap()
            await page.wait_for_timeout(200)
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.35: the Button's On Clicked from its Details (+), then Play: in Game Only the touch is ignored and says why;
        # with Set Input Mode Game and UI and the cursor shown, the button answers.
        await page.locator('.doc-tab.bp .doc-open', has_text='WBP_HUD').first.tap()
        await page.wait_for_timeout(300)
        await page.locator('.graph-tabs .tab', has_text='Designer').tap()
        await page.wait_for_timeout(300)
        await page.evaluate("() => { const s = window.bpStore; s.setFocus({ kind: 'widget', id: s.cls.widgets.find(w => w.kind === 'Button').id }); }")
        await page.locator('button[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        await page.locator('.drawer.right .d-field', has_text='On Clicked').locator('button').tap()
        await page.wait_for_timeout(400)
        clicked = await page.evaluate("() => { const s = window.bpStore; return Object.values(s.graph.nodes).filter(n => n.def === 'event.widgetButton').map(n => n.config.event); }")
        if clicked != ['clicked']:
            errs.append(f'Button : le + de On Clicked n’a pas posé l’événement ({clicked})')
        await shot('93_button_on_clicked')
        if await page.locator('.drawer.right.open .drawer-head .btn').count():
            await page.locator('.drawer.right.open .drawer-head .btn').first.tap()
            await page.wait_for_timeout(200)
        await page.evaluate("""() => {
          const s = window.bpStore;
          s.apply('e2e clic', (c, g) => {
            const ev = Object.values(g.nodes).find(n => n.def === 'event.widgetButton');
            g.nodes.e2e_clic = { id: 'e2e_clic', def: 'debug.printString', x: ev.x + 320, y: ev.y, config: {}, defaults: { text: 'clic' } };
            g.links.e2e_c1 = { id: 'e2e_c1', from: { node: ev.id, pin: 'then' }, to: { node: 'e2e_clic', pin: 'exec' } };
          });
        }""")
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(800)
        await page.locator('.umg-layer .umg-Button.hit').first.tap()
        await page.wait_for_timeout(300)
        if await page.locator('.umg-notice', has_text='Game Only').count() == 0:
            errs.append('Play : le toucher ignoré en Game Only ne le dit pas')
        else:
            await page.locator('.umg-notice .btn', has_text='Pourquoi').tap()
            await page.wait_for_timeout(200)
        await shot('94_play_touch_game_only')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)
        await page.evaluate("""() => {
          const s = window.bpStore;
          s.applyProject('e2e mode', (p) => {
            const g = p.classes.find(c => c.name === 'BP_Lampe').graphs[0];
            g.nodes.e2e_gu = { id: 'e2e_gu', def: 'input.setModeGameAndUI', x: 940, y: 300, config: {}, defaults: {} };
            g.nodes.e2e_cur = { id: 'e2e_cur', def: 'input.setShowMouseCursor', x: 1260, y: 300, config: {}, defaults: { show: true } };
            g.links.e2e_g1 = { id: 'e2e_g1', from: { node: 'e2e_av', pin: 'then' }, to: { node: 'e2e_gu', pin: 'exec' } };
            g.links.e2e_g2 = { id: 'e2e_g2', from: { node: 'e2e_pc', pin: 'result' }, to: { node: 'e2e_gu', pin: 'controller' } };
            g.links.e2e_g3 = { id: 'e2e_g3', from: { node: 'e2e_gu', pin: 'then' }, to: { node: 'e2e_cur', pin: 'exec' } };
            g.links.e2e_g4 = { id: 'e2e_g4', from: { node: 'e2e_pc', pin: 'result' }, to: { node: 'e2e_cur', pin: 'target' } };
          });
        }""")
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(800)
        await page.locator('.umg-layer .umg-Button.hit').first.tap()
        await page.wait_for_timeout(300)
        if await page.locator('.screen-msg', has_text='clic').count() == 0:
            errs.append('Play : en Game and UI, le bouton ne répond pas (pas de « clic »)')
        if await page.locator('.play-badge', has_text='Game and UI').count() == 0 or await page.locator('.play-badge', has_text='Curseur').count() == 0:
            errs.append('Play : le mode Game and UI et le curseur ne sont pas signalés')
        await shot('95_play_button_game_and_ui')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.36: « Le vrai menu pause » solved. Space shows WBP_Pause over the frozen game; Reprendre answers during the pause.
        await page.evaluate(PUT, ['project:lesson:l-vrai-menu-pause', (HERE / 'out' / 'l-vrai-menu-pause.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Le vrai menu pause').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='Le vrai menu pause').tap()
        await page.wait_for_timeout(500)
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(700)
        await page.locator('.keys .key', has_text='Espace').tap()
        await page.wait_for_timeout(600)
        await shot('96_play_real_pause_menu')
        if await page.locator('.umg-layer .umg-Button.hit').count() != 1:
            errs.append('Vrai menu pause : Espace n’affiche pas le menu et son bouton')
        elif await page.locator('.game-paused').count() != 0:
            errs.append('Vrai menu pause : PAUSED est dessiné par-dessus le menu (V7.39 : caché quand un widget est à l’écran)')
        else:
            await page.locator('.umg-layer .umg-Button.hit').first.tap()
            await page.wait_for_timeout(500)
            if await page.locator('.game-paused').count() != 0 or await page.locator('.umg-layer .umg-Button').count() != 0:
                errs.append('Vrai menu pause : Reprendre ne ferme pas le menu ou ne relance pas le jeu')
            await shot('97_play_real_pause_resumed')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.37: « La playlist » solved. One row per song, built in Play; Lire on the 2nd row plays Brume.
        await page.evaluate(PUT, ['project:lesson:c7-playlist', (HERE / 'out' / 'c7-playlist.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='La playlist').scroll_into_view_if_needed()
        await page.locator('.lesson-item', has_text='La playlist').tap()
        await page.wait_for_timeout(500)
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(800)
        # Twelve buttons that take touches, in layout order: Lire and Retirer of each row, then Rafraîchir and Inverser.
        btns = page.locator('.umg-layer .umg-Button.hit')
        if await btns.count() != 12:
            errs.append(f'Playlist : {await btns.count()} boutons touchables au lieu de 12')
        else:
            await btns.nth(2).tap()
            await page.wait_for_timeout(400)
            if await page.locator('.umg-layer', has_text='En lecture : Brume').count() == 0:
                errs.append('Playlist : Lire sur la 2e ligne ne joue pas Brume')
        await shot('98_play_playlist')
        # V7.39: in UI Only the joystick and the keys take no touch: what is under them (a widget's button) gets it.
        through = await page.evaluate("""() => [document.querySelector('.joystick'), document.querySelector('.keys .key')].map((el) => {
          const r = el.getBoundingClientRect();
          const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !!e && !e.closest('.joystick') && !e.closest('.keys');
        })""")
        if through != [True, True]:
            errs.append(f'Playlist (UI Only) : le joystick ou les touches prennent encore le doigt ({through})')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.41: Mes projets. The list, a second project from the editor's menu, rename, copy, delete.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.btn.big', has_text='Simulation libre').tap()
        await page.wait_for_timeout(400)
        first = await page.locator('.project-open').count()
        await shot('100_projects_list')
        await page.locator('.project-open').first.tap()
        await page.wait_for_timeout(600)
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.menu-item', has_text='Nouveau projet').tap()
        await page.wait_for_timeout(300)
        await page.locator('input.field').last.fill('Ma porte')
        await page.locator('.dialog .btn.primary', has_text='Créer').tap()
        await page.wait_for_timeout(700)
        name = await page.evaluate('() => window.bpStore.project.name')
        if name != 'Ma porte':
            errs.append(f'Mes projets : le nouveau projet ouvert s’appelle « {name} »')
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await shot('101_projects_editor_menu')
        await page.locator('.menu-item', has_text='Mes projets').tap()
        await page.wait_for_timeout(600)
        if await page.locator('.project-open').count() != first + 1:
            errs.append('Mes projets : le nouveau projet n’est pas dans la liste')
        if await page.locator('.project-item').first.locator('.project-name').inner_text() != 'Ma porte':
            errs.append('Mes projets : le projet ouvert en dernier n’est pas en tête')
        await page.locator('.project-more').first.tap()
        await page.wait_for_timeout(200)
        await shot('102_projects_actions')
        await page.locator('.project-tool', has_text='Dupliquer').tap()
        await page.wait_for_timeout(500)
        if await page.locator('.project-name', has_text='Ma porte (copie)').count() != 1:
            errs.append('Mes projets : la copie n’apparaît pas')
        copy = page.locator('.project-item', has_text='Ma porte (copie)')
        await copy.locator('.project-more').tap()
        await page.wait_for_timeout(200)
        await copy.locator('.project-tool', has_text='Renommer').tap()
        await page.wait_for_timeout(200)
        await page.locator('input.field').last.fill('Ma porte')
        await page.locator('.dialog .btn.primary', has_text='Renommer').tap()
        await page.wait_for_timeout(200)
        if await page.locator('.error-text', has_text='déjà').count() == 0:
            errs.append('Mes projets : un nom déjà pris est accepté')
        await page.locator('input.field').last.fill('Porte de secours')
        await page.locator('.dialog .btn.primary', has_text='Renommer').tap()
        await page.wait_for_timeout(500)
        secours = page.locator('.project-item', has_text='Porte de secours')
        if await secours.count() != 1:
            errs.append('Mes projets : le renommage ne se voit pas')
        else:
            await secours.locator('.project-more').tap()
            await page.wait_for_timeout(200)
            await secours.locator('.project-tool', has_text='Supprimer').tap()
            await page.wait_for_timeout(200)
            await shot('103_projects_delete')
            await page.locator('.dialog .btn.danger', has_text='Supprimer').last.tap()
            await page.wait_for_timeout(500)
            if await page.locator('.project-item', has_text='Porte de secours').count():
                errs.append('Mes projets : le projet supprimé est encore là')
        await shot('104_projects_after')

        # V7.42: Widget Component. Two enemies, each with its own bar over it: the editor's frames, the Details, then Play.
        await page.evaluate(PUT, ['project:sandbox:sb_e2e_widget', (HERE / 'out' / 'widget-component.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.btn.big', has_text='Simulation libre').tap()
        await page.wait_for_timeout(400)
        await page.locator('.project-open', has_text='Barres au-dessus').tap()
        await page.wait_for_timeout(700)
        if await page.locator('.doc-tab.level').count():
            await page.locator('.doc-tab.level').first.tap()
            await page.wait_for_timeout(300)
        await shot('105_widget_component_level')
        await page.evaluate("""() => { const s = window.bpStore; const c = s.project.classes.find(c => c.name === 'BP_Ennemi'); s.openClass(c.id); s.setFocus({ kind: 'component', id: c.components.find(k => k.kind === 'Widget').id }); }""")
        await page.wait_for_timeout(400)
        if await page.locator('[aria-label="Ouvrir Details"]').count():
            await page.locator('[aria-label="Ouvrir Details"]').first.tap()
            await page.wait_for_timeout(300)
        if await page.locator('.details', has_text='Widget Class').count() == 0:
            errs.append('Widget Component : pas de Widget Class dans les Details')
        else:
            await page.get_by_text('Widget Class', exact=True).first.scroll_into_view_if_needed()
            await page.wait_for_timeout(200)
        await shot('106_widget_component_details')
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.btn.big', has_text='Simulation libre').tap()
        await page.wait_for_timeout(400)
        await page.locator('.project-open', has_text='Barres au-dessus').tap()
        await page.wait_for_timeout(700)
        if await page.locator('.doc-tab.level').count():
            await page.locator('.doc-tab.level').first.tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(900)
        if await page.locator('.umg-world').count() != 2:
            errs.append(f'Widget Component : {await page.locator(".umg-world").count()} barres en Play au lieu de 2')
        await shot('107_widget_component_play')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.43: « Une barre par ennemi » solved: three enemies, three bars in Play.
        await page.evaluate(PUT, ['project:lesson:l-barre-par-ennemi', (HERE / 'out' / 'l-barre-par-ennemi.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.lesson-item', has_text='Une barre par ennemi').scroll_into_view_if_needed()
        await page.wait_for_timeout(200)
        await shot('108_home_widget_component_steps')
        await page.locator('.lesson-item', has_text='Une barre par ennemi').tap()
        await page.wait_for_timeout(500)
        await close_sheet()
        await page.locator('.doc-tab.level').tap()
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(900)
        if await page.locator('.umg-world').count() != 3:
            errs.append(f'Une barre par ennemi : {await page.locator(".umg-world").count()} barres en Play au lieu de 3')
        await shot('109_bar_per_enemy_play')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.46: several levels. + Add › Level, the tab takes its name, Play plays it, the Content Drawer and Maps & Modes.
        await page.goto(home)
        await page.wait_for_timeout(500)
        await free_play(page)
        await page.wait_for_timeout(600)
        await page.locator('.doc-tab.level').first.tap()
        if (await page.locator('.doc-tab.level').inner_text()).strip().endswith('Lvl_Principal') is False:
            errs.append(f'Niveaux : l’onglet du niveau s’appelle « {await page.locator(".doc-tab.level").inner_text()} »')
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await page.locator('.btn.primary', has_text='+ Add').tap()
        await page.wait_for_timeout(200)
        await shot('110_levels_add_menu')
        await page.locator('.palette-item', has_text='Level').first.tap()
        await page.wait_for_timeout(200)
        await page.locator('input.field').last.fill('Lvl_Couloir')
        await page.locator('.dialog .btn.primary', has_text='Créer').tap()
        await page.wait_for_timeout(600)
        tab = (await page.locator('.doc-tab.level').inner_text()).strip()
        if not tab.endswith('Lvl_Couloir'):
            errs.append(f'Niveaux : après + Add › Level, l’onglet dit « {tab} »')
        n = await page.evaluate('() => window.bpStore.project.levels.length')
        if n < 2:
            errs.append(f'Niveaux : {n} niveau(x) après + Add › Level')
        await shot('111_levels_new_level')
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(600)
        played = await page.evaluate('() => window.bpStore.project.levels.find(l => l.name === "Lvl_Couloir").actors.length')
        if played != 0:
            errs.append('Niveaux : le nouveau niveau n’est pas vide')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)
        await page.locator('.content-drawer-btn').tap()
        await page.wait_for_timeout(300)
        await page.locator('.cd-search').fill('Lvl')
        await page.wait_for_timeout(200)
        await page.locator('.cd-tile', has_text='Lvl_Principal').tap()
        await page.wait_for_timeout(200)
        await shot('112_levels_content_drawer')
        await page.locator('.cd-tile', has_text='Lvl_Principal').tap()
        await page.wait_for_timeout(100)
        if await page.locator('.content-drawer').count():
            await page.locator('.cd-tile', has_text='Lvl_Principal').tap()
        await page.wait_for_timeout(500)
        tab = (await page.locator('.doc-tab.level').inner_text()).strip()
        if not tab.endswith('Lvl_Principal'):
            errs.append(f'Niveaux : deux touches sur Lvl_Principal laissent l’onglet sur « {tab} »')
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.menu-item', has_text='Project Settings').tap()
        await page.wait_for_timeout(300)
        await shot('113_levels_maps_modes')
        if await page.locator('select[aria-label="Game Default Map"] option').count() < 2:
            errs.append('Maps & Modes : Game Default Map ne propose pas les niveaux')
        await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.wait_for_timeout(200)

        # V7.47: Open Level. The player starts on a door of Lvl_Principal; its overlap opens Lvl_Atelier, the Play bar says so.
        await page.evaluate(PUT, ['project:sandbox:sb_e2e_levels', (HERE / 'out' / 'open-level.json').read_text()])
        await page.goto(home)
        await page.wait_for_timeout(500)
        await page.locator('.btn.big', has_text='Simulation libre').tap()
        await page.wait_for_timeout(400)
        await page.locator('.project-open', has_text='Deux niveaux').tap()
        await page.wait_for_timeout(700)
        if await page.locator('.doc-tab.level').count():
            await page.locator('.doc-tab.level').first.tap()
            await page.wait_for_timeout(300)
        await shot('114_open_level_before')
        await page.locator('.tb.play').tap()
        await page.wait_for_timeout(1200)
        lvl = (await page.locator('.pb-level').inner_text()).strip() if await page.locator('.pb-level').count() else ''
        if lvl != 'Lvl_Atelier':
            errs.append(f'Open Level : la barre de Play dit « {lvl} » au lieu de Lvl_Atelier')
        msgs = await page.locator('.screen-msg').all_inner_texts()
        if 'Lvl_Atelier' not in msgs:
            errs.append(f'Open Level : messages à l’écran {msgs}')
        await shot('115_open_level_after')
        # V7.48: the GameInstance in the live Outliner, with its variable kept through Open Level.
        await page.locator('.pb-btn[aria-label="Outliner"]').tap()
        await page.wait_for_timeout(300)
        # V7.49: Lvl_Atelier's GameMode Override made another pawn, and its GameMode is in the Outliner.
        rows = ' '.join(await page.locator('.outliner-row').all_inner_texts())
        if 'BP_Robot' not in rows or 'BP_ReglesAtelier' not in rows:
            errs.append(f'GameMode Override : pion ou GameMode absent de l’Outliner ({rows[:120]})')
        gi_row = page.locator('.outliner-row', has_text='BP_Jeu_C_0')
        if not await gi_row.count():
            errs.append('GameInstance absent de l’Outliner en direct')
        else:
            await gi_row.first.tap()
            await page.wait_for_timeout(300)
            if 'Lvl_Principal → Lvl_Atelier' not in await page.locator('.outliner').first.inner_text():
                errs.append('GameInstance : niveaux joués absents')
        await shot('116_game_instance_outliner')
        await page.locator('.tb', has_text='Stop').first.tap()
        await page.wait_for_timeout(300)

        # V7.49: World Settings of Lvl_Atelier (GameMode Override), then Maps & Modes › Default Modes.
        await page.evaluate('() => { const s = window.bpStore; s.openLevel(s.project.levels.find(l => l.name === "Lvl_Atelier").id); s.setFocus({ kind: "none" }); }')
        await page.wait_for_timeout(400)
        await page.locator('.edge-handle[aria-label="Ouvrir Details"]').tap()
        await page.wait_for_timeout(300)
        ws = page.locator('.outliner-pick', has_text='WorldSettings')
        if not await ws.count():
            errs.append('World Settings absent de l’Outliner du niveau')
        else:
            await ws.first.tap()
            await page.wait_for_timeout(300)
            await page.locator('.drawer-tab', has_text='Details').first.tap()
            await page.wait_for_timeout(300)
            override = page.locator('select[aria-label="GameMode Override"]')
            if not await override.count():
                errs.append('World Settings : pas de GameMode Override')
            elif 'BP_ReglesAtelier' not in await override.evaluate('s => s.options[s.selectedIndex].text'):
                errs.append('World Settings : GameMode Override n’est pas BP_ReglesAtelier')
        await shot('117_world_settings')
        await page.locator('button[aria-label^="Plus d"]').tap()
        await page.wait_for_timeout(200)
        await page.locator('.menu-item', has_text='Project Settings').tap()
        await page.wait_for_timeout(300)
        if not await page.locator('select[aria-label="Default GameMode"]').count():
            errs.append('Maps & Modes : pas de Default GameMode')
        await shot('118_maps_modes_gamemode')
        await page.locator('.sheet .btn', has_text='Fermer').first.tap()
        await page.wait_for_timeout(200)

        print('errors', errs)
        await b.close()
        return errs


sys.exit(1 if asyncio.run(main()) else 0)
