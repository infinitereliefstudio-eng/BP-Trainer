/**
 * V2, Intermédiaire: an inventory array filled from another Blueprint and
 * read with For Each Loop.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints as count, noRuntimeErrors, PRESS_E, usesNode, notion } from '../checks';
import type { Lesson } from '../types';
import { playerBlueprint } from './props';

const press = PRESS_E;

const ITEMS = ['Clé', 'Fusible', 'Carte'];

function inventoryProject() {
  const pb = new ProjectBuilder('L’inventaire');
  playerBlueprint(pb);
  const b = pb.blueprint('BP_Objet');
  b.component('StaticMesh', 'Objet', { shape: 'cylinder', sizeX: 26, sizeY: 26, color: '#f5c542', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 80, sizeY: 80 });
  const nom = b.variable('Nom', T.string, '');
  b.cls.variables[0].instanceEditable = true;
  ITEMS.forEach((name, i) => {
    const id = pb.place(b, 200 + 200 * i, 0);
    pb.project.level.actors.find((a) => a.id === id)!.overrides[nom] = name;
  });
  pb.playerStart(-200, 0);
  return pb.project;
}

export const lessonInventory: Lesson = {
  id: 'l-inventaire',
  module: 'Tableaux',
  level: 'intermediaire',
  number: 0,
  title: 'L’inventaire',
  situation: 'Trois objets au sol (Clé, Fusible, Carte). Chacun ramassé s’ajoute à l’Inventaire du joueur, un tableau de noms. E affiche tout l’inventaire.',
  notions: ['Tableau (Array)', 'Add', 'For Each Loop', 'Get (a copy)', 'Variable d’un autre Blueprint'],
  remember: 'Un tableau garde une liste dans une seule variable. Add, Remove, Clear le modifient (pin en losange) ; For Each le parcourt d’un coup ; Get donne une copie de l’élément.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** : le joueur, graphe vide, aucune variable.\n- **BP_Objet** : un petit objet jaune avec une **Zone**, et une variable **Nom** (String, **Instance Editable**). Trois instances sont posées sur la route du joueur, réglées sur « Clé », « Fusible » et « Carte ».\n\n' +
        'Le test fait marcher le joueur à travers les trois objets, puis appuie sur E.',
    },
    {
      title: 'Un tableau',
      body:
        'Une variable peut contenir une **liste** de valeurs du même type : un **tableau** (Array). Crée dans BP_Joueur la variable `Inventaire`, type **String**, et choisis **Array** dans la liste à côté du type. Sa pin prend la forme d’une petite grille.\n\n' +
        'Chaque élément a un **index**, sa position : **0** pour le premier, 1 pour le deuxième… Avec 3 éléments, les index vont de 0 à 2.\n\n' +
        'Un tableau, c’est **une seule variable** : on peut la passer, la parcourir, la vider, sans savoir d’avance combien d’éléments elle contiendra.',
    },
    {
      title: 'Ajouter depuis un autre Blueprint',
      body:
        '**Add** ajoute **New Item** à la fin du tableau branché sur **Target Array**. Cette pin est en **losange** : Add modifie la variable elle-même.\n\n' +
        'Ici, le tableau est celui **du joueur**, et c’est l’objet qui ajoute :\n\n' +
        '1. **Event ActorBeginOverlap** → **Cast To BP_Joueur** (Object = Other Actor).\n2. Depuis **As BP_Joueur**, tire un fil et cherche **Get Inventaire** : le tableau de ce joueur-là.\n3. **Add** : Target Array = cet Inventaire, New Item = **Get Nom** (le nom de l’objet).\n4. **Destroy Actor**.',
    },
    {
      title: 'Parcourir',
      body:
        '**For Each Loop** exécute **Loop Body** une fois par élément du tableau branché sur **Array** :\n\n' +
        '- **Array Element** : l’élément de ce tour ;\n- **Array Index** : sa position ;\n- **Completed** : une fois, après le dernier tour.\n\n' +
        'Tous les tours se font dans la même image.\n\n' +
        'Dans BP_Joueur : **IA_Interagir** (Started) → **For Each Loop** (Array = Get Inventaire) → Loop Body → **Print String** (Array Element).\n\n' +
        '**Get (a copy)** lit un élément par son index… et en donne une **copie** : la modifier ne change pas le tableau.',
    },
    {
      title: 'Les pièges',
      body:
        '**Un Get Inventaire sans Target.** Dans BP_Objet, un Get Inventaire doit savoir sur quel joueur lire : son Target vient de As BP_Joueur. Sans lui, Add n’a pas de tableau.\n\n' +
        '**Le défi.** Retirer des éléments **pendant** qu’on parcourt le tableau décale ceux qui suivent : la boucle en saute. Pour tout vider, **Clear** fait le travail en un nœud.\n\n' +
        'Dans UE, les inventaires sérieux rangent des **structures** (nom, quantité, icône) plutôt que de simples textes : voir « La fiche de l’objet ».',
    },
  ],
  objectives: [
    'Dans BP_Joueur, crée Inventaire : String, en tableau (Array).',
    'Dans BP_Objet, quand le joueur le touche : ajoute son Nom à l’Inventaire du joueur, puis détruis l’objet.',
    'Dans BP_Joueur, sur IA_Interagir (Started) : affiche chaque élément de l’Inventaire avec For Each Loop.',
    'Touche Vérifier.',
  ],
  hints: [
    'Comme pour la clé : Begin Overlap → Cast To BP_Joueur. Puis Add, avec Inventaire lu depuis le joueur.',
    'BP_Objet : ActorBeginOverlap, Cast To BP_Joueur, Get Inventaire (Target = As BP Joueur), Add (New Item = Nom), Destroy Actor. BP_Joueur : IA_Interagir, Get Inventaire, For Each Loop, Print String.',
    'Solution : BeginOverlap → Cast To BP_Joueur → Add (Target Array = Inventaire du joueur, New Item = Nom) → Destroy Actor. Et IA_Interagir (Started) → For Each Loop (Inventaire) → Print String (Array Element).',
  ],
  challenge: 'Ajoute une action IA_Vider sur F dans IMC_Joueur ; sur IA_Vider, retire chaque élément avec un For Each Loop et Remove Item : il en reste un ! Retirer décale les suivants, la boucle en saute un. Fais-le avec Clear.',
  setup: inventoryProject,
  scenario: [{ wait: 0.2 }, { walk: [1, 0], seconds: 1.4 }, { checkpoint: 'ramasse' }, ...press, { checkpoint: 'liste' }],
  checks: [
    {
      id: 'var',
      label: 'BP_Joueur a un tableau de String Inventaire',
      test: (cx) => {
        const v = cx.project.classes.find((c) => c.name === 'BP_Joueur')?.variables.find((x) => x.name === 'Inventaire');
        if (!v) return 'Crée dans BP_Joueur une variable Inventaire, type String, en tableau (Array).';
        return v.type.category === 'string' && v.type.container === 'array' ? true : 'Inventaire doit être un tableau (Array) de String.';
      },
    },
    {
      id: 'gone',
      label: 'Les objets ramassés disparaissent',
      at: 'ramasse',
      test: (cx) => {
        const left = cx.sim.actors.filter((a) => a.className === 'BP_Objet' && !a.destroyed).length;
        return left === 0 ? true : `${left} objet(s) encore au sol après le passage du joueur.`;
      },
    },
    {
      id: 'content',
      label: 'L’Inventaire contient Clé, Fusible, Carte, dans l’ordre',
      at: 'ramasse',
      test: (cx) => {
        const inv = cx.variable('Joueur', 'Inventaire');
        if (!Array.isArray(inv) || inv.length === 0) {
          return 'Inventaire est vide : Add n’a rien ajouté. Sa pin Target Array (losange) doit recevoir Inventaire lu sur le joueur, depuis la sortie du Cast.';
        }
        return inv.join() === ITEMS.join() ? true : `Inventaire contient : ${inv.join(', ')}. Il fallait ${ITEMS.join(', ')}.`;
      },
    },
    {
      id: 'list',
      label: 'E affiche les trois objets',
      at: 'liste',
      test: (cx) => {
        const missing = ITEMS.filter((name) => count(cx, name) === 0);
        return missing.length ? `Pas affiché après E : ${missing.join(', ')}. For Each Loop doit afficher Array Element à chaque tour.` : true;
      },
    },
    notion(usesNode('add', 'BP_Objet', ['array.add', 'array.addUnique'], 'BP_Objet ajoute avec Add', 'Ajoute le nom avec Add.')),
    notion(usesNode('loop', 'BP_Joueur', ['flow.forEachLoop'], 'BP_Joueur parcourt avec For Each Loop', 'Parcours l’inventaire avec For Each Loop.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const inv = player.variable('Inventaire', T.array(T.string));
    const obj = edit(p, 'BP_Objet');
    const nom = obj.cls.variables[0].id;
    const ev = obj.node('event.actorBeginOverlap');
    const cast = obj.node('cast.to', { class: player.cls.id });
    const add = obj.node('array.add');
    const kill = obj.node('actor.destroy');
    const getInv = obj.node('var.getExternal', { owner: player.cls.id, variable: inv }, {}, [700, 300]);
    obj.link(ev, 'then', cast, 'exec').link(ev, 'other', cast, 'object').link(cast, 'then', add, 'exec');
    obj.link(cast, 'as', getInv, 'target').link(getInv, 'value', add, 'array').link(obj.node('var.get', { variable: nom }, {}, [700, 450]), 'value', add, 'item');
    obj.link(add, 'then', kill, 'exec');
    const key = player.node('event.inputKey', { key: 'E' });
    const loop = player.node('flow.forEachLoop');
    const pr = player.node('debug.printString');
    player.link(key, 'pressed', loop, 'exec').link(player.node('var.get', { variable: inv }, {}, [300, 300]), 'value', loop, 'array');
    player.link(loop, 'body', pr, 'exec').link(loop, 'element', pr, 'text');
  },
};
