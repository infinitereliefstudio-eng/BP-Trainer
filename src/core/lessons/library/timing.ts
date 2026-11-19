/**
 * V2, Confirmé: time. Waves of enemies (Set Timer by Event, Spawn Actor,
 * Expose on Spawn) and a lift moved on Tick with Delta Seconds, tested at
 * 30 frames per second.
 */
import { addDispatcher, updateVariable } from '../../operations/classOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { editable, override, ref as ref_, say } from './kit';
import { countPrints, noRuntimeErrors, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';

// --------------------------------------------------------------- Les vagues

function wavesProject() {
  const pb = new ProjectBuilder('Les vagues');
  const enemy = pb.blueprint('BP_Ennemi');
  enemy.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#dc2626', blocks: false });
  const vie = enemy.variable('Vie', T.int, 0);
  const begin = enemy.node('event.beginPlay', {}, {}, [64, 96]);
  const text = enemy.node('string.append', {}, { in0: 'Vie : ' }, [300, 300]);
  const say = enemy.node('debug.printString', {}, {}, [520, 96]);
  enemy.link(begin, 'then', say, 'exec').link(enemy.node('var.get', { variable: vie }, {}, [100, 300]), 'value', text, 'in1').link(text, 'result', say, 'text');
  const spawner = pb.blueprint('BP_Spawner');
  spawner.component('StaticMesh', 'Socle', { sizeX: 120, sizeY: 120, color: '#4b5563', blocks: false });
  spawner.variable('Vague', T.int, 0);
  pb.place(spawner, 0, 0);
  pb.playerStart(-400, 0);
  return pb.project;
}

const enemies = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Ennemi' && !a.destroyed).length;

export const lessonWaves: Lesson = {
  id: 'l-vagues',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'Les vagues',
  situation: 'Le spawner crée un ennemi par seconde, trois vagues en tout. L’ennemi de la vague N a N × 10 de vie, et l’affiche à son BeginPlay. Puis le spawner s’arrête.',
  notions: ['Set Timer by Event', 'Spawn Actor', 'Expose on Spawn', 'Clear and Invalidate Timer by Handle'],
  recalls: ['switch'],
  revision: 2,
  remember: 'Le BeginPlay d’un acteur créé par Spawn Actor a déjà tourné quand Return Value sort : ce qu’il doit savoir dès le départ se donne par Expose on Spawn, pas par un Set après.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Ennemi** : un cylindre rouge et une variable **Vie** (Integer, 0). À son **BeginPlay**, il affiche « Vie : » suivi de sa Vie.\n- **BP_Spawner** : un socle et une variable **Vague** (Integer, 0). Graphe vide.\n\n' +
        'Le but : un ennemi par seconde, trois vagues. L’ennemi de la vague N a N × 10 de vie (10, 20, 30) et l’affiche dès sa naissance. Puis le spawner s’arrête.',
    },
    {
      title: 'Répéter dans le temps',
      body:
        '**Set Timer by Event** appelle un événement plus tard :\n\n' +
        '- **Event** : tire un fil depuis cette pin rouge et crée un **Custom Event** (par exemple `NouvelleVague`) ;\n- **Time** : 1 seconde ;\n- **Looping** : coché, il le rappelle toutes les secondes ;\n- **Return Value** : le **Timer Handle**, le ticket qui permet de l’arrêter. Range-le dans une variable (type Timer Handle), par exemple `Minuteur`.\n\n' +
        '**Clear and Invalidate Timer by Handle** (Handle = Get Minuteur) l’arrête.',
    },
    {
      title: 'Spawn Actor et Expose on Spawn',
      body:
        '**SpawnActor** (tape « spawn » dans la palette ; dans UE, Spawn Actor from Class) crée un acteur pendant le jeu : **Class** (BP_Ennemi), **Spawn Transform Location** (où), et une sortie **Return Value**, le nouvel acteur.\n\n' +
        'L’ordre est important : Spawn Actor crée l’acteur, exécute **son BeginPlay**, et **seulement ensuite** sort par sa pin blanche. Un Set Vie placé après arrive trop tard : l’ennemi a déjà affiché « Vie : 0 ».\n\n' +
        'Dans BP_Ennemi, sélectionne Vie et coche **Expose on Spawn** (Instance Editable se coche avec). Vie devient une **pin du Spawn Actor**, posée **avant** le BeginPlay.',
    },
    {
      title: 'Le plan',
      body:
        '**BP_Spawner** :\n\n' +
        '1. **BeginPlay** → Set Timer by Event (NouvelleVague, 1, Looping) → **Set Minuteur** (Return Value).\n2. **NouvelleVague** → **Increment Int** (Vague) → **Spawn Actor** BP_Ennemi, Vie = Vague **×** 10.\n3. → **Branch** (Vague **>=** 3) → True : **Clear and Invalidate Timer by Handle** (Minuteur).\n\n' +
        'La sortie de l’Increment donne la nouvelle Vague : elle sert au calcul de la vie et au test.',
    },
    {
      title: 'Dans UE',
      body:
        'Expose on Spawn est la façon propre de donner des paramètres de naissance : vie, équipe, couleur, cible. Pour un projectile ou un ennemi, c’est l’équivalent d’un constructeur avec arguments.\n\n' +
        'Sans arrêt, le timer continuerait de créer des ennemis indéfiniment : un timer en Looping doit toujours avoir un moment où on l’arrête.',
    },
    {
      title: 'Rappel : un message par vague',
      body: 'Avant chaque ennemi, le spawner annonce la vague : `Éclaireur` pour la 1, `Soldat` pour la 2, `Boss` pour la 3. Un chemin par valeur d’un entier : tu connais le nœud.',
    },
  ],
  objectives: [
    'Dans BP_Ennemi, coche Expose on Spawn sur Vie.',
    'Dans BP_Spawner : au BeginPlay, un timer en Looping toutes les 1 s.',
    'À chaque appel : Vague + 1, puis Spawn Actor BP_Ennemi avec Vie = Vague × 10 (à une position différente à chaque vague si tu veux).',
    'Rappel : annonce chaque vague (Éclaireur, Soldat, Boss).',
    'Après la 3e vague, arrête le timer. Touche Vérifier.',
  ],
  hints: [
    'Trois choses : le timer, le Custom Event qu’il appelle, et l’arrêt quand Vague atteint 3.',
    'Nœuds : Set Timer by Event (Looping), Custom Event NouvelleVague, Increment Int (Vague), Switch on Int, Print String, Spawn Actor (Class = BP_Ennemi), × (Integer), Branch, >= (Integer), Clear and Invalidate Timer by Handle, une variable Timer Handle.',
    'Solution : BeginPlay → Set Timer by Event (NouvelleVague, 1, Looping) → Set Minuteur (Return Value). NouvelleVague → Increment Vague → Switch on Int (1 : « Éclaireur », 2 : « Soldat », 3 : « Boss », chacun → Spawn Actor) → Spawn Actor (Vie = Vague × 10) → Branch (Vague >= 3) → True : Clear and Invalidate Timer by Handle (Minuteur).',
  ],
  challenge: 'Fais apparaître chaque ennemi 150 cm plus loin que le précédent : Make Vector avec X = Vague × 150.',
  setup: wavesProject,
  scenario: [{ wait: 4.5 }],
  checks: [
    {
      id: 'expose',
      label: 'Vie est Expose on Spawn',
      test: (cx) =>
        cx.project.classes.find((c) => c.name === 'BP_Ennemi')?.variables.find((v) => v.name === 'Vie')?.exposeOnSpawn
          ? true
          : 'Coche Expose on Spawn sur Vie (Details de la variable, dans BP_Ennemi).',
    },
    {
      id: 'count',
      label: 'Trois ennemis, puis plus rien',
      test: (cx) => {
        const n = enemies(cx);
        if (n === 3) return true;
        if (n > 3) return `${n} ennemis après 4,5 s : le timer ne s’arrête pas après la 3e vague.`;
        return `${n} ennemi(s) après 4,5 s : il en faut un par seconde (timer en Looping), 3 au total.`;
      },
    },
    {
      id: 'life',
      label: 'Chacun affiche sa vie à son BeginPlay : 10, 20, 30',
      test: (cx) => {
        if (['10', '20', '30'].every((v) => countPrints(cx, `Vie : ${v}`) === 1)) return true;
        if (countPrints(cx, 'Vie : 0') > 0) {
          return 'Un ennemi affiche « Vie : 0 » : sa vie lui a été donnée après son BeginPlay. Donne-la par la pin Vie du Spawn Actor (Expose on Spawn).';
        }
        return `Messages : ${cx.prints().join(', ') || 'aucun'}. Il fallait Vie : 10, Vie : 20, Vie : 30.`;
      },
    },
    {
      id: 'names',
      label: 'Rappel : chaque vague est annoncée (Éclaireur, Soldat, Boss)',
      test: (cx) => {
        const names = cx.prints().filter((t) => ['Éclaireur', 'Soldat', 'Boss'].includes(t.trim()));
        return names.join(',') === 'Éclaireur,Soldat,Boss' ? true : `Annonces : ${names.join(', ') || 'aucune'}. Il fallait Éclaireur, Soldat, puis Boss, une fois chacune.`;
      },
    },
    notion(usesNode('timer', 'BP_Spawner', ['time.setTimerByEvent'], 'Le spawner utilise Set Timer by Event', 'Répète la création avec Set Timer by Event.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const enemy = edit(p, 'BP_Ennemi');
    const vie = enemy.cls.variables[0].id;
    updateVariable(enemy.cls, vie, { exposeOnSpawn: true });
    const s = edit(p, 'BP_Spawner');
    const vague = s.cls.variables[0].id;
    const handle = s.variable('Minuteur', T.struct('TimerHandle'));
    const begin = s.node('event.beginPlay', {}, {}, [64, 96]);
    const timer = s.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [360, 96]);
    const keep = s.node('var.set', { variable: handle }, {}, [700, 96]);
    s.link(begin, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    const ev = s.node('event.custom', { name: 'NouvelleVague' }, {}, [64, 420]);
    s.link(ev, 'delegate', timer, 'event');
    const inc = s.node('var.incrementInt', {}, {}, [360, 420]);
    const spawn = s.node('actor.spawn', {}, { class: enemy.cls.id }, [700, 420]);
    const mul = s.node('math.multiplyInt', {}, { b: 10 }, [560, 640]);
    const ge = s.node('math.greaterEqualInt', {}, { b: 3 }, [900, 640]);
    const br = s.node('flow.branch', {}, {}, [1040, 420]);
    const stop = s.node('time.clearTimer', {}, {}, [1340, 420]);
    s.link(ev, 'then', inc, 'exec').link(s.node('var.get', { variable: vague }, {}, [200, 640]), 'value', inc, 'value');
    const sw = s.node('flow.switchInt', { start: 1, cases: 3 }, {}, [520, 260]);
    s.link(inc, 'then', sw, 'exec').link(inc, 'result', sw, 'selection');
    for (const [i, name] of ['Éclaireur', 'Soldat', 'Boss'].entries()) {
      const tell = s.node('debug.printString', {}, { text: name }, [520 + i * 60, -40 - i * 140]);
      s.link(sw, `case${i + 1}`, tell, 'exec').link(tell, 'then', spawn, 'exec');
    }
    s.link(inc, 'result', mul, 'a').link(mul, 'result', spawn, `expose:${vie}`);
    s.link(spawn, 'then', br, 'exec').link(inc, 'result', ge, 'a').link(ge, 'result', br, 'condition');
    s.link(br, 'true', stop, 'exec').link(s.node('var.get', { variable: handle }, {}, [1200, 640]), 'value', stop, 'handle');
  },
};

// ------------------------------------------------------------ L'ascenseur

function liftProject() {
  const pb = new ProjectBuilder('L’ascenseur');
  const b = pb.blueprint('BP_Ascenseur');
  b.component('StaticMesh', 'Plateforme', { sizeX: 140, sizeY: 140, color: '#0ea5e9', blocks: false });
  b.variable('Vitesse', T.float, 200);
  // The recall of lot 3b: the dispatcher is declared, the dock is already subscribed; the lift has to announce.
  const d = addDispatcher(b.cls, 'OnArrivee');
  const liftId = pb.place(b, 0, 0);
  const dock = pb.blueprint('BP_Quai');
  dock.component('StaticMesh', 'Quai', { sizeX: 160, sizeY: 200, color: '#374151', blocks: false });
  dock.component('PointLight', 'Voyant', { visible: false, radius: 160, color: '#22c55e' });
  const ref = editable(dock, 'Ascenseur', T.object('BP_Ascenseur'));
  const begin = dock.node('event.beginPlay', {}, {}, [64, 96]);
  const bind = dock.node('dispatcher.bind', { owner: b.cls.id, dispatcher: d.id }, {}, [400, 96]);
  const ev = dock.node('event.custom', { name: 'Arrivee', signature: d.id, signatureOwner: b.cls.id }, {}, [64, 420]);
  const on = dock.node('component.setVisibility', {}, { visible: true }, [400, 420]);
  dock.link(begin, 'then', bind, 'exec').link(dock.node('var.get', { variable: ref }, {}, [200, 300]), 'value', bind, 'target').link(ev, 'delegate', bind, 'event');
  dock.link(ev, 'then', on, 'exec').target('Voyant', on).link(on, 'then', say(dock, [740, 420], 'Quai atteint'), 'exec');
  override(pb, pb.place(dock, 760, 0), ref, ref_(liftId));
  pb.playerStart(-300, 250);
  return pb.project;
}

/** The recall: once X reaches 600 (the Branch's False), DoOnce → Call OnArrivee. */
export function liftArrives(b: ClassBuilder, branch: string): void {
  const d = b.cls.dispatchers.find((x) => x.name === 'OnArrivee')!;
  const once = b.node('flow.doOnce', {}, {}, [1000, 300]);
  const call = b.node('dispatcher.call', { owner: b.cls.id, dispatcher: d.id }, {}, [1300, 300]);
  b.link(branch, 'false', once, 'exec').link(once, 'completed', call, 'exec');
}

const liftX = (cx: CheckContext) => Math.round(cx.actor('BP_Ascenseur')?.x ?? 0);

export const lessonLift: Lesson = {
  id: 'l-ascenseur',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'L’ascenseur',
  situation: 'La plateforme avance à 200 cm/s et s’arrête à X = 600. Le test tourne à 30 images par seconde, comme sur un appareil lent.',
  notions: ['Event Tick', 'Delta Seconds', 'Add Actor World Offset', 'Vitesse en cm/s'],
  recalls: ['dispatchers', 'flow-memory'],
  revision: 2,
  remember: 'Sur Tick, une vitesse se multiplie par Delta Seconds : le mouvement dépend alors du temps écoulé, plus du nombre d’images par seconde.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Ascenseur** : une plateforme bleue et une variable **Vitesse** (Float, 200). Graphe vide.\n\n' +
        'Elle doit avancer vers la droite à **200 cm/s** et s’arrêter à X = 600. Le test tourne à **30 images par seconde**, comme sur un appareil lent : un mouvement qui dépend du nombre d’images échouera.',
    },
    {
      title: 'Rappel : prévenir le quai',
      body:
        'BP_Ascenseur a un Event Dispatcher **OnArrivee**, déjà déclaré. **BP_Quai** s’y est abonné : quand on l’appelle, son Voyant s’allume et il affiche « Quai atteint ». Il ne reste qu’à **l’appeler, une seule fois**, quand la plateforme est arrivée. Attention : le Tick continue après l’arrivée.',
    },
    {
      title: 'À chaque image',
      body:
        '**Event Tick** s’exécute à **chaque image**. Sa sortie **Delta Seconds** dit combien de temps s’est écoulé depuis l’image précédente : environ 1/60 s à 60 images par seconde, 1/30 s à 30.\n\n' +
        'Le piège classique : avancer de 3 cm par Tick. À 60 images, ça fait 180 cm/s ; à 30, 90 cm/s. Le jeu tourne deux fois moins vite sur un téléphone lent.\n\n' +
        'La parade : avancer de **Vitesse × Delta Seconds**. À 60 images, 200 × 1/60 ≈ 3,3 cm, 60 fois ; à 30, 200 × 1/30 ≈ 6,7 cm, 30 fois. Toujours 200 cm en une seconde.',
    },
    {
      title: 'Les nœuds',
      body:
        '- **Add Actor World Offset** : déplace l’acteur **de** Delta Location (un Vector), dans le repère du monde. C’est un ajout, pas une position.\n- **Make Vector** : assemble X, Y, Z. Ici X = Vitesse × Delta Seconds, Y = Z = 0.\n- **Get Actor Location** → **Break Vector** : la position actuelle, coupée en X, Y, Z.\n- **< (Float)** : vrai si A est plus petit que B.',
    },
    {
      title: 'Le plan',
      body:
        '**Event Tick** → **Branch** (X de Get Actor Location **<** 600) → True : **Add Actor World Offset** (Delta Location = Make Vector (Vitesse **×** Delta Seconds, 0, 0)).\n\n' +
        'La plateforme peut dépasser 600 d’un petit pas à la dernière image : la vérification l’accepte. Pour un arrêt pile, on prendrait **Min** entre le pas et la distance restante.',
    },
    {
      title: 'Dans UE',
      body:
        'Tick a un coût : chaque acteur qui tique travaille à chaque image, même quand il n’a rien à faire. Pour un mouvement qui a un début et une fin, une **Timeline** (voir « La porte qui glisse ») ou un **Interp To** sont souvent mieux ; Tick reste le bon outil pour ce qui bouge en continu.',
    },
  ],
  objectives: [
    'Sur Event Tick, avance la plateforme de Vitesse × Delta Seconds en X.',
    'Arrête-la à X = 600.',
    'Rappel : à l’arrivée, appelle OnArrivee une seule fois (le quai s’allume).',
    'Touche Vérifier (le test tourne à 30 images par seconde).',
  ],
  hints: [
    'Le calcul : Vitesse × Delta Seconds, dans le X d’un Make Vector, branché sur Delta Location.',
    'Nœuds : Event Tick, Get Actor Location, Break Vector, < (Float), Branch, Get Vitesse, × (Float), Make Vector, Add Actor World Offset ; DoOnce, Call OnArrivee.',
    'Solution : Tick → Branch (X de Get Actor Location < 600) → True : Add Actor World Offset (Make Vector (Vitesse × Delta Seconds, 0, 0)) ; False : DoOnce → Call OnArrivee.',
  ],
  challenge: 'Refais-le sans Tick : Set Timer by Event en Looping toutes les 0,05 s, et Vitesse × 0,05.',
  setup: liftProject,
  scenario: [{ fps: 30 }, { wait: 1.5 }, { checkpoint: 'mi' }, { wait: 3 }, { checkpoint: 'fin' }],
  checks: [
    {
      id: 'speed',
      label: 'À 1,5 s, la plateforme a parcouru environ 300 cm',
      at: 'mi',
      test: (cx) => {
        const x = liftX(cx);
        if (x >= 270 && x <= 330) return true;
        if (x === 0) return 'La plateforme n’a pas bougé : Add Actor World Offset, sur Event Tick.';
        return `La plateforme a parcouru ${x} cm en 1,5 s au lieu de 300. Le test tourne à 30 images par seconde : si tu ajoutes une distance fixe à chaque Tick, multiplie plutôt Vitesse par Delta Seconds.`;
      },
    },
    {
      id: 'stop',
      label: 'Elle s’arrête à 600',
      at: 'fin',
      test: (cx) => {
        const x = liftX(cx);
        if (x >= 595 && x <= 620) return true;
        return x > 620 ? `Elle a continué jusqu’à ${x} : arrête-la quand X atteint 600.` : `Elle s’est arrêtée à ${x} au lieu de 600.`;
      },
    },
    {
      id: 'dock',
      label: 'Rappel : à l’arrivée, le quai est prévenu une seule fois',
      test: (cx) => {
        const n = countPrints(cx, 'Quai atteint');
        if (!n) return 'Le quai n’a pas été prévenu : à l’arrivée, appelle OnArrivee (Call).';
        return n === 1 ? true : `Le quai a été prévenu ${n} fois : le Tick continue après l’arrivée, l’appel ne doit passer qu’une fois.`;
      },
    },
    {
      id: 'dock-early',
      label: 'Le quai n’est pas prévenu avant l’arrivée',
      at: 'mi',
      test: (cx) => (countPrints(cx, 'Quai atteint') ? 'Le quai a été prévenu alors que la plateforme était encore en route.' : true),
    },
    notion(usesNode('tick', 'BP_Ascenseur', ['event.tick'], 'Le mouvement se fait sur Event Tick', 'Déplace la plateforme sur Event Tick.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Ascenseur');
    const speed = b.cls.variables[0].id;
    const tick = b.node('event.tick', {}, {}, [64, 96]);
    const loc = b.node('actor.getLocation', {}, {}, [200, 320]);
    const split = b.node('math.breakVector', {}, {}, [400, 320]);
    const less = b.node('math.lessFloat', {}, { b: 600 }, [600, 320]);
    const br = b.node('flow.branch', {}, {}, [700, 96]);
    const mul = b.node('math.multiplyFloat', {}, {}, [800, 420]);
    const vec = b.node('math.makeVector', {}, {}, [1000, 420]);
    const move = b.node('actor.addOffset', {}, {}, [1000, 96]);
    b.link(tick, 'then', br, 'exec').link(loc, 'result', split, 'in').link(split, 'x', less, 'a').link(less, 'result', br, 'condition');
    b.link(br, 'true', move, 'exec').link(b.node('var.get', { variable: speed }, {}, [600, 520]), 'value', mul, 'a').link(tick, 'delta', mul, 'b');
    b.link(mul, 'result', vec, 'x').link(vec, 'result', move, 'delta');
    liftArrives(b, br);
  },
};
