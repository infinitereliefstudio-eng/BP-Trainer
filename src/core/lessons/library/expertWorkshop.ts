/**
 * Lot 4b of the path plan: Expert project X2 « L'atelier des machines ».
 * Inheritance taken up again (Tristan's plan: « héritage repris en
 * Expert »), with what the end of the path no longer wrote: Event Tick with
 * Delta Seconds, Sequence, Delay, Parent: Tick. One parent machine holds
 * everything the machines share; the fan adds its blades and calls its
 * parent's Tick. Tested at 30 frames per second.
 */
import type { Project } from '../../model/project';
import { implementInterface } from '../../operations/classOps';
import { placeActor } from '../../operations/levelOps';
import { addClass, addInterface, addInterfaceFunction, setParentClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { EXPERT_RULES, expertScenery } from './expertRadio';
import { goTo, tap } from './kit';
import { playerBlueprint } from './props';
import { playerTells } from './universalLever';

const PUMP_AT: [number, number] = [-350, -200];
const FAN_AT: [number, number] = [350, -200];

function project(): Project {
  const pb = new ProjectBuilder('L’atelier des machines');
  playerBlueprint(pb);
  expertScenery(pb, [
    [PUMP_AT, 'M1'],
    [FAN_AT, 'M2'],
  ]);
  ensurePlayerInput(pb.project, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(0, 250);
  return pb.project;
}

// ------------------------------------------------------------------ checks

const machine = (cx: CheckContext, cls: string) => cx.sim.actors.find((a) => a.className === cls && !a.destroyed);
const lightOn = (cx: CheckContext, cls: string) => !!machine(cx, cls)?.components.some((c) => c.kind === 'PointLight' && c.props.visible);
const bladesYaw = (cx: CheckContext) => machine(cx, 'BP_Ventilo')?.components.find((c) => c.name === 'Helice')?.props.yaw ?? 0;
const placed = (cx: CheckContext, name: string, at: [number, number]) =>
  cx.project.level.actors.some((a) => cx.project.classes.find((c) => c.id === a.classId)?.name === name && Math.hypot(a.x - at[0], a.y - at[1]) <= 80);

export const expertWorkshop: Lesson = {
  id: 'x2-atelier',
  module: 'Projet Expert',
  level: 'expert',
  number: 0,
  title: 'L’atelier des machines',
  situation:
    'Une pompe et un ventilateur, deux machines qui se ressemblent : E les démarre et les arrête, elles consomment leur carburant, tombent en panne sèche. Le ventilateur fait en plus tourner ses pales. Tout ce qui est commun s’écrit une seule fois.',
  recalls: ['inheritance', 'tick', 'sequence', 'latent', 'visibility', 'rotation', 'interfaces', 'loops'],
  notions: ['Projet Expert', 'Classe parente', 'Redéfinir un événement', 'Delta Seconds', 'Sequence'],
  remember:
    'Ce que plusieurs Blueprints partagent vit dans leur parent ; un enfant n’ajoute que sa différence. Quand il redéfinit un événement (Tick), il appelle la version du parent, sinon la logique commune s’arrête pour lui sans un mot.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : le projet UE5 (IMC_Joueur : E → IA_Interagir), un BP_Joueur au graphe vide, deux plots **M1** et **M2**. Tout le reste est à créer.\n\n' +
        '1. **BP_Machine**, le parent : un socle, un **Voyant** (Point Light, éteint), une Zone. Chaque machine posée a un **Nom** et un **Carburant** en secondes, réglables dans le niveau.\n' +
        '2. **BP_Pompe** et **BP_Ventilo** sont des **enfants** de BP_Machine. Pompe posée sur M1 (Nom `Pompe`, Carburant 3), ventilateur sur M2 (Nom `Ventilateur`, Carburant 1).\n' +
        '3. E près d’une machine à l’arrêt : elle **démarre**. Son Voyant s’allume **tout de suite**, et **0,5 s plus tard** elle affiche `<Nom> en marche`. E près d’une machine en marche : elle s’arrête, Voyant éteint.\n' +
        '4. En marche, une machine **consomme** son Carburant au rythme du temps qui passe (1 par seconde), quel que soit le nombre d’images par seconde. À 0 : `<Nom> : panne sèche`, et elle s’arrête.\n' +
        '5. E près d’une machine sans carburant : `<Nom> : réservoir vide`, elle ne démarre pas.\n' +
        '6. **BP_Ventilo** a en plus une **Helice** (un Static Mesh) qui tourne quand il est en marche.\n\n' +
        'Contrainte : **démarrer, arrêter, consommer s’écrivent une seule fois**, dans BP_Machine. Les enfants n’ont pas leur propre réaction à E.',
    },
    {
      title: 'Le scénario de test',
      body:
        'À **30 images par seconde** : E à la pompe ; 0,2 s plus tard le Voyant est allumé mais pas encore « Pompe en marche » ; 0,5 s plus tard il l’est. E au ventilateur : 0,5 s plus tard son Hélice a tourné. Le test attend que les deux tombent en panne sèche (la pompe pas avant 1,8 s de marche), puis E à la pompe : « Pompe : réservoir vide ».',
    },
    EXPERT_RULES,
  ],
  objectives: [
    'BP_Pompe et BP_Ventilo héritent de BP_Machine, qui seul réagit à E.',
    'Démarrer : Voyant tout de suite, « <Nom> en marche » 0,5 s plus tard.',
    'Le carburant s’use avec le temps réel ; à 0, panne sèche et arrêt ; ensuite, réservoir vide.',
    'L’Hélice du ventilateur tourne quand il est en marche.',
  ],
  hints: [
    'Qu’est-ce qui est commun aux deux machines, et qu’est-ce que le ventilateur ajoute ? Quand l’enfant redéfinit Tick, qu’advient-il du Tick du parent ?',
    'Blueprint Class › Parent BP_Machine ; Sequence, Delay ; Event Tick, Delta Seconds, Parent: Tick ; Add Relative Rotation ; Custom Events Demarrer et Arreter.',
    'Solution : BP_Machine implémente BPI_Interactif (le joueur : IA_Interagir → Get Overlapping Actors → For Each → Interagir). Variables Nom, Carburant (Instance Editable), bEnMarche. Interagir → Branch (bEnMarche) : True → Arreter ; False → Branch (Carburant > 0) : True → Demarrer, False → Print « Nom : réservoir vide ». Demarrer → Set bEnMarche → Sequence : Then 0 → Set Visibility (Voyant, coché) ; Then 1 → Delay 0,5 → Print « Nom en marche ». Arreter → Set bEnMarche (faux) → Set Visibility (Voyant, décoché). Tick → Branch (bEnMarche) → Set Carburant = Carburant − Delta Seconds → Branch (Carburant <= 0) → Print « Nom : panne sèche » → Arreter.\n' +
      'BP_Pompe : parent BP_Machine, rien d’autre. BP_Ventilo : parent BP_Machine, composant Helice ; Event Tick → Parent: Tick (Delta Seconds) → Branch (bEnMarche) → Add Relative Rotation (Helice, Yaw = 360 × Delta Seconds).',
  ],
  challenge: 'Ajoute un BP_Groupe (enfant de BP_Machine) qui, en panne sèche, prévient les autres machines par un Event Dispatcher déclaré dans le parent.',
  setup: project,
  scenario: [
    { fps: 30 },
    { wait: 0.2 },
    ...goTo(...PUMP_AT, 0.05),
    ...tap('E'),
    { wait: 0.2 },
    { checkpoint: 'p-mi' },
    { wait: 0.5 },
    { checkpoint: 'p-ok' },
    ...goTo(...FAN_AT, 0.05),
    ...tap('E'),
    { wait: 0.5 },
    { checkpoint: 'f-run' },
    { wait: 0.8 },
    { checkpoint: 'p-avant' },
    { wait: 1.6 },
    { checkpoint: 'pannes' },
    ...goTo(...PUMP_AT, 0.05),
    ...tap('E'),
    { wait: 0.7 },
  ],
  checks: [
    {
      id: 'family',
      label: 'BP_Pompe et BP_Ventilo héritent de BP_Machine, posés sur M1 et M2',
      test: (cx) => {
        const base = cx.project.classes.find((c) => c.name === 'BP_Machine');
        if (!base) return 'Crée le Blueprint parent BP_Machine.';
        for (const name of ['BP_Pompe', 'BP_Ventilo']) {
          const c = cx.project.classes.find((x) => x.name === name);
          if (!c) return `Crée ${name}, enfant de BP_Machine.`;
          if (c.parentClassId !== base.id) return `${name} n’hérite pas de BP_Machine (Class Settings › Parent Class).`;
        }
        if (!placed(cx, 'BP_Pompe', PUMP_AT)) return 'Pose une BP_Pompe sur le plot M1.';
        return placed(cx, 'BP_Ventilo', FAN_AT) ? true : 'Pose un BP_Ventilo sur le plot M2.';
      },
    },
    {
      id: 'once',
      label: 'Les enfants n’ont pas leur propre réaction à E',
      test: (cx) => {
        const dup = ['BP_Pompe', 'BP_Ventilo'].filter((n) => cx.nodes(n).some((x) => x.def === 'event.interface' || x.def === 'input.action'));
        return dup.length ? `${dup.join(' et ')} réagi(ssen)t eux-mêmes à E : cette logique est commune, elle s’écrit une fois dans BP_Machine.` : true;
      },
    },
    {
      id: 'light-now',
      label: 'Démarrer : le Voyant tout de suite, pas encore le message',
      at: 'p-mi',
      test: (cx) => {
        if (!lightOn(cx, 'BP_Pompe')) return '0,2 s après E, le Voyant de la pompe est éteint.';
        return countPrints(cx, 'Pompe en marche') ? '« Pompe en marche » est arrivé tout de suite : il doit attendre 0,5 s, pendant que le Voyant, lui, s’allume aussitôt.' : true;
      },
    },
    {
      id: 'message-later',
      label: '0,5 s plus tard : « Pompe en marche »',
      at: 'p-ok',
      test: (cx) => (countPrints(cx, 'Pompe en marche') === 1 ? true : '0,7 s après E, aucun « Pompe en marche ».'),
    },
    {
      id: 'blades',
      label: 'Le ventilateur en marche fait tourner son Hélice',
      at: 'f-run',
      test: (cx) => {
        if (!machine(cx, 'BP_Ventilo')?.components.some((c) => c.name === 'Helice')) return 'BP_Ventilo n’a pas de composant Helice.';
        if (!lightOn(cx, 'BP_Ventilo')) return 'E au ventilateur : son Voyant ne s’allume pas. Le Tick du ventilateur appelle-t-il celui du parent, et le parent réagit-il à E ?';
        return Math.abs(bladesYaw(cx)) > 1 ? true : 'Le ventilateur est en marche, et son Hélice ne tourne pas.';
      },
    },
    {
      id: 'not-yet',
      label: 'Après 1,8 s de marche, la pompe tourne encore (Carburant 3)',
      at: 'p-avant',
      test: (cx) => (countPrints(cx, 'Pompe : panne sèche') ? 'La pompe est tombée en panne avant 3 s de marche.' : lightOn(cx, 'BP_Pompe') ? true : 'La pompe s’est arrêtée avant d’avoir consommé son carburant.'),
    },
    {
      id: 'dry',
      label: 'Au bout du carburant : panne sèche et arrêt, pour les deux',
      at: 'pannes',
      test: (cx) => {
        for (const [cls, name] of [
          ['BP_Pompe', 'Pompe'],
          ['BP_Ventilo', 'Ventilateur'],
        ] as const) {
          if (countPrints(cx, `${name} : panne sèche`) !== 1) return `Aucun « ${name} : panne sèche » une fois son carburant consommé (le test tourne à 30 images par seconde : le carburant doit s’user avec Delta Seconds).`;
          if (lightOn(cx, cls)) return `${name} est en panne sèche, et son Voyant reste allumé.`;
        }
        return true;
      },
    },
    {
      id: 'empty',
      label: 'Sans carburant : « Pompe : réservoir vide », elle ne redémarre pas',
      test: (cx) => (countPrints(cx, 'Pompe : réservoir vide') && !lightOn(cx, 'BP_Pompe') && countPrints(cx, 'Pompe en marche') === 1 ? true : 'E à la pompe vide : elle doit afficher « Pompe : réservoir vide » et rester éteinte.'),
    },
    notion(usesNode('parent', 'BP_Ventilo', ['call.parentEvent'], 'BP_Ventilo appelle Parent: Tick', 'BP_Ventilo redéfinit Tick : il doit appeler Parent: Tick pour que le carburant s’use aussi chez lui.')),
    notion(usesNode('sequence', 'BP_Machine', ['flow.sequence'], 'Le démarrage passe par un Sequence', 'Deux suites au démarrage, l’une immédiate et l’autre qui attend : c’est le travail d’un Sequence.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const r = addInterface(p, 'BPI_Interactif');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Interagir');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    const player = new ClassBuilder(p.classes.find((c) => c.name === 'BP_Joueur')!, p);
    playerTells(player, p.inputActions.find((a) => a.name === 'IA_Interagir')!.id, iface, fn);

    const baseCls = addClass(p, 'BP_Machine', 'Actor');
    if (!baseCls.ok) throw new Error(baseCls.reason);
    const b = new ClassBuilder(baseCls.value, p);
    b.component('StaticMesh', 'Socle', { sizeX: 110, sizeY: 80, color: '#475569' });
    b.component('PointLight', 'Voyant', { visible: false, radius: 160, color: '#22c55e' });
    b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
    const nom = b.variable('Nom', T.string, 'Machine');
    const fuel = b.variable('Carburant', T.float, 2);
    for (const v of baseCls.value.variables) v.instanceEditable = true;
    const on = b.variable('bEnMarche', T.bool, false);
    implementInterface(baseCls.value, iface);
    const get = (v: string, at: [number, number]) => b.node('var.get', { variable: v }, {}, at);
    /** Print String « <Nom><suffix> ». */
    const said = (suffix: string, at: [number, number]) => {
      const t = b.node('string.append', {}, { in1: suffix }, [at[0], at[1] + 200]);
      b.link(get(nom, [at[0] - 200, at[1] + 260]), 'value', t, 'in0');
      const s = b.node('debug.printString', {}, {}, at);
      b.link(t, 'result', s, 'text');
      return s;
    };
    const call = (event: string, from: string, pin: string, at: [number, number]) => {
      const c = b.node('call.custom', { owner: baseCls.value.id, event }, {}, at);
      b.link(from, pin, c, 'exec');
      return c;
    };
    const start = b.node('event.custom', { name: 'Demarrer' }, {}, [64, 700]);
    const stop = b.node('event.custom', { name: 'Arreter' }, {}, [64, 1200]);

    // E: stop if running, start if there is fuel, else say the tank is empty.
    const asked = b.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
    const running = b.node('flow.branch', {}, {}, [340, 96]);
    b.link(asked, 'then', running, 'exec').link(get(on, [200, 300]), 'value', running, 'condition');
    call('Arreter', running, 'true', [640, 20]);
    const hasFuel = b.node('flow.branch', {}, {}, [640, 200]);
    const more = b.node('math.greaterFloat', {}, { b: 0 }, [500, 400]);
    b.link(running, 'false', hasFuel, 'exec').link(get(fuel, [360, 420]), 'value', more, 'a').link(more, 'result', hasFuel, 'condition');
    call('Demarrer', hasFuel, 'true', [940, 160]);
    b.link(hasFuel, 'false', said(' : réservoir vide', [940, 320]), 'exec');

    // Demarrer: the light now, the message after 0.5 s.
    const setOn = b.node('var.set', { variable: on }, { value: true }, [340, 700]);
    const seq = b.node('flow.sequence', {}, {}, [640, 700]);
    const light = b.node('component.setVisibility', {}, { visible: true }, [940, 640]);
    const wait = b.node('time.delay', {}, { duration: 0.5 }, [940, 820]);
    b.link(start, 'then', setOn, 'exec').link(setOn, 'then', seq, 'exec').link(seq, 'then0', light, 'exec').target('Voyant', light);
    b.link(seq, 'then1', wait, 'exec').link(wait, 'completed', said(' en marche', [1240, 820]), 'exec');

    // Arreter.
    const setOff = b.node('var.set', { variable: on }, { value: false }, [340, 1200]);
    const dark = b.node('component.setVisibility', {}, { visible: false }, [640, 1200]);
    b.link(stop, 'then', setOff, 'exec').link(setOff, 'then', dark, 'exec').target('Voyant', dark);

    // Tick: burn fuel with Delta Seconds; dry at 0.
    const tick = b.node('event.tick', {}, {}, [64, 1500]);
    const live = b.node('flow.branch', {}, {}, [340, 1500]);
    const minus = b.node('math.subtractFloat', {}, {}, [560, 1700]);
    const burn = b.node('var.set', { variable: fuel }, {}, [640, 1500]);
    const dry = b.node('math.lessEqualFloat', {}, { b: 0 }, [860, 1700]);
    const out = b.node('flow.branch', {}, {}, [960, 1500]);
    b.link(tick, 'then', live, 'exec').link(get(on, [200, 1700]), 'value', live, 'condition');
    b.link(live, 'true', burn, 'exec').link(get(fuel, [400, 1760]), 'value', minus, 'a').link(tick, 'delta', minus, 'b').link(minus, 'result', burn, 'value');
    b.link(burn, 'then', out, 'exec').link(burn, 'out', dry, 'a').link(dry, 'result', out, 'condition');
    const panne = said(' : panne sèche', [1260, 1500]);
    b.link(out, 'true', panne, 'exec');
    call('Arreter', panne, 'then', [1560, 1500]);

    const child = (name: string) => {
      const c = addClass(p, name, 'Actor');
      if (!c.ok) throw new Error(c.reason);
      const set = setParentClass(p, c.value.id, baseCls.value.id);
      if (!set.ok) throw new Error(set.reason);
      return new ClassBuilder(c.value, p);
    };
    const pump = child('BP_Pompe');
    const fan = child('BP_Ventilo');
    fan.component('StaticMesh', 'Helice', { sizeX: 120, sizeY: 16, color: '#0ea5e9', blocks: false });
    const fTick = fan.node('event.tick', {}, {}, [64, 96]);
    const up = fan.node('call.parentEvent', { event: 'event.tick' }, {}, [340, 96]);
    const fOn = fan.node('var.get', { variable: on }, {}, [500, 300]);
    const fBr = fan.node('flow.branch', {}, {}, [640, 96]);
    const yaw = fan.node('math.multiplyFloat', {}, { a: 360 }, [760, 360]);
    const rot = fan.node('math.makeRotator', {}, {}, [960, 360]);
    const spin = fan.node('component.addRelativeRotation', {}, {}, [960, 96]);
    fan.link(fTick, 'then', up, 'exec').link(fTick, 'delta', up, 'delta').link(up, 'then', fBr, 'exec').link(fOn, 'value', fBr, 'condition');
    fan.link(fBr, 'true', spin, 'exec').link(fTick, 'delta', yaw, 'b').link(yaw, 'result', rot, 'yaw').link(rot, 'result', spin, 'delta').target('Helice', spin);

    for (const [cls, at, name, seconds] of [
      [pump, PUMP_AT, 'Pompe', 3],
      [fan, FAN_AT, 'Ventilateur', 1],
    ] as const) {
      const a = placeActor(p, cls.cls.id, ...at);
      if (!a.ok) throw new Error(a.reason);
      Object.assign(a.value.overrides, { [nom]: name, [fuel]: seconds });
    }
  },
};
