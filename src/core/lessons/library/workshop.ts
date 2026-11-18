/**
 * V6, Avancé: "Débogue D14 — L'atelier de fabrication" (E20). A recipe is
 * checked and consumed in the same loop: when the second ingredient is
 * missing, the first is already gone. Validate everything, then change
 * everything: a transaction.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD, getVar, say, setVar, tap, varOf, wipe } from './kit';

const MADE = 'Outil fabriqué';
const REFUSED = 'Fabrication refusée';
const MISSING = 'Il manque';

/** The workbench graph: consuming while checking (the bug), or checking first (the fix). */
function benchGraph(b: ClassBuilder, fixed: boolean): void {
  const g = (name: string, at: [number, number]) => getVar(b, name, at);
  const e = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const reset = setVar(b, 'Possible', [340, 96], true);
  const check = b.node('flow.forEachLoop', {}, {}, [640, 96]);
  const keys = b.node('map.keys', {}, {}, [440, 320]);
  const have = b.node('map.find', {}, {}, [860, 380]);
  const need = b.node('map.find', {}, {}, [860, 560]);
  const enough = b.node('math.greaterEqualInt', {}, {}, [1080, 440]);
  const br = b.node('flow.branch', {}, {}, [1000, 140]);
  const fail = setVar(b, 'Possible', [1300, 300], false);
  const tell = say(b, [1600, 300]);
  const text = b.node('string.append', {}, { in0: `${MISSING} : ` }, [1420, 500]);
  b.link(e, 'pressed', reset, 'exec').link(reset, 'then', check, 'exec').link(g('Recette', [260, 330]), 'value', keys, 'map').link(keys, 'keys', check, 'array');
  b.link(g('Stock', [680, 390]), 'value', have, 'map').link(check, 'element', have, 'key').link(g('Recette', [680, 570]), 'value', need, 'map').link(check, 'element', need, 'key');
  b.link(have, 'value', enough, 'a').link(need, 'value', enough, 'b').link(check, 'body', br, 'exec').link(enough, 'result', br, 'condition');
  b.link(br, 'false', fail, 'exec').link(fail, 'then', tell, 'exec').link(check, 'element', text, 'in1').link(text, 'result', tell, 'text');
  const ok = b.node('flow.branch', {}, {}, [1000, 760]);
  const no = say(b, [1300, 940], REFUSED);
  b.link(check, 'completed', ok, 'exec').link(g('Possible', [820, 800]), 'value', ok, 'condition').link(ok, 'false', no, 'exec');
  const count = b.node('var.incrementInt', {}, {}, [fixed ? 2300 : 1300, 760]);
  const done = say(b, [fixed ? 2600 : 1600, 760], MADE);
  b.link(g('Outils', [fixed ? 2140 : 1140, 940]), 'value', count, 'value').link(count, 'then', done, 'exec');
  /** Stock[key] = Stock[key] − Recette[key], for the key on `from`.`pin`. */
  const consume = (from: string, pin: string, at: [number, number]): string => {
    const [x, y] = at;
    const put = b.node('map.add', {}, {}, [x, y]);
    const h = b.node('map.find', {}, {}, [x - 420, y + 240]);
    const n = b.node('map.find', {}, {}, [x - 420, y + 420]);
    const left = b.node('math.subtractInt', {}, {}, [x - 200, y + 300]);
    b.link(g('Stock', [x - 600, y + 250]), 'value', h, 'map').link(from, pin, h, 'key').link(g('Recette', [x - 600, y + 430]), 'value', n, 'map').link(from, pin, n, 'key');
    b.link(h, 'value', left, 'a').link(n, 'value', left, 'b').link(g('Stock', [x - 180, y + 180]), 'value', put, 'map').link(from, pin, put, 'key').link(left, 'result', put, 'value');
    return put;
  };
  if (fixed) {
    const apply = b.node('flow.forEachLoop', {}, {}, [1300, 760]);
    const keys2 = b.node('map.keys', {}, {}, [1140, 1000]);
    const put = consume(apply, 'element', [1960, 800]);
    b.link(ok, 'true', apply, 'exec').link(g('Recette', [960, 1010]), 'value', keys2, 'map').link(keys2, 'keys', apply, 'array').link(apply, 'body', put, 'exec').link(apply, 'completed', count, 'exec');
  } else {
    const put = consume(check, 'element', [1900, -260]);
    b.link(br, 'true', put, 'exec').link(ok, 'true', count, 'exec');
  }
  // F: one more battery.
  const f = b.node('event.inputKey', { key: 'F' }, {}, [64, 1500]);
  const more = b.node('map.add', {}, { key: 'Batterie' }, [760, 1500]);
  const had = b.node('map.find', {}, { key: 'Batterie' }, [340, 1700]);
  const plus = b.node('math.addInt', {}, { b: 1 }, [560, 1700]);
  b.link(f, 'pressed', more, 'exec').link(g('Stock', [160, 1710]), 'value', had, 'map').link(had, 'value', plus, 'a').link(g('Stock', [560, 1620]), 'value', more, 'map').link(plus, 'result', more, 'value');
  b.link(more, 'then', say(b, [1080, 1500], 'Batterie ajoutée'), 'exec');
}

function workshopProject() {
  const pb = new ProjectBuilder('Débogue D14');
  const b = pb.blueprint('BP_Atelier');
  b.component('StaticMesh', 'Etabli', { sizeX: 140, sizeY: 80, color: '#854d0e' });
  b.component('TextRender', 'Etiquette', { y: -70, text: 'Atelier' });
  b.cls.autoReceiveInput = true;
  b.variable('Stock', T.map(T.name, T.int), [
    ['Metal', 3],
    ['Batterie', 0],
  ]);
  b.variable('Recette', T.map(T.name, T.int), [
    ['Metal', 2],
    ['Batterie', 1],
  ]);
  b.variable('Outils', T.int, 0);
  b.variable('Possible', T.bool, false);
  benchGraph(b, false);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

function stock(cx: CheckContext): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of (varOf(cx, 'BP_Atelier', 'Stock') as [string, number][] | undefined) ?? []) out[String(k)] = Number(v);
  return out;
}

function shelf(id: string, at: string | undefined, label: string, metal: number, battery: number, tools: number, why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const s = stock(cx);
      const t = Number(varOf(cx, 'BP_Atelier', 'Outils'));
      if (s.Metal === metal && s.Batterie === battery && t === tools) return true;
      return `Stock : ${s.Metal} métal, ${s.Batterie} batterie ; ${t} outil(s). Attendu : ${metal} métal, ${battery} batterie, ${tools} outil(s). ${why}`;
    },
  };
}

export const debug14: Lesson = {
  id: 'd14-atelier',
  kind: 'debug',
  code: 'D14',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'L’atelier de fabrication',
  situation:
    'Un outil demande 2 métaux et 1 batterie. L’atelier a 3 métaux et aucune batterie. E lance la fabrication : elle est refusée, comme il se doit… mais 2 métaux ont disparu du stock. F ajoute une batterie.',
  notions: ['Map', 'Keys', 'Find', 'Add', 'For Each Loop', 'Valider puis appliquer', 'Transaction'],
  remember:
    'Une opération qui touche plusieurs quantités se fait en deux temps : d’abord vérifier que tout est possible, sans rien modifier ; ensuite seulement, tout modifier. Vérifier et consommer dans la même boucle laisse l’état à moitié changé dès qu’une condition échoue en route.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '`Stock` et `Recette` sont deux **Map** de Name vers Integer : pour chaque ingrédient, combien on en a, combien il en faut.\n\n' +
        'Sur **IA_Fabriquer** (E) : `Possible` est mis à vrai, puis un **For Each Loop** parcourt les ingrédients de la recette. **Keys** donne la liste des clés d’une Map ; ici « Metal », puis « Batterie ».\n\n' +
        'Pour chaque ingrédient, deux **Find** lisent la quantité en stock et la quantité demandée. S’il y en a assez (**>=**), un **Add** réécrit le stock diminué. Sinon `Possible` passe à faux et « Il manque : … » s’affiche.\n\n' +
        'Après la boucle (**Completed**) : si `Possible`, un outil de plus ; sinon « Fabrication refusée ».',
    },
    {
      title: 'Trouver le moment du vol',
      body:
        'Avant de corriger, vérifie ton hypothèse. Lance Play avec ☷ (Outliner) ouvert sur BP_Atelier, et appuie sur E : regarde `Stock` avant et après.\n\n' +
        'Puis place un **breakpoint** sur le nœud Add du stock (appui long › Ajouter un breakpoint) et relance. Le jeu s’arrête dessus au premier tour de boucle : à ce moment-là, sait-on déjà si la batterie suffira ?\n\n' +
        'C’est tout le problème : la boucle **décide** (assez ou pas ?) et **agit** (retirer du stock) dans le même tour. Au tour du métal, elle agit sans connaître la réponse pour la batterie.',
    },
    {
      title: 'Valider, puis appliquer',
      body:
        'Sépare les deux rôles en **deux boucles** :\n\n' +
        '1. La première ne fait que **vérifier**. Elle garde le Branch, le `Possible = faux` et le message, mais **ne touche plus au stock** : débranche le Add de sa sortie True.\n' +
        '2. Après elle, le Branch sur `Possible`. Sur True, une **seconde boucle** sur les mêmes Keys, qui retire du stock chaque ingrédient (le bloc Find, Find, Subtract, Add se déplace ici). Sur son **Completed** : l’outil et son message.\n\n' +
        'La seconde boucle n’a pas besoin de re-vérifier : on n’y entre que si tout a été validé.\n\n' +
        'Rappel sur **Add** : sur une Map, il **remplace** la valeur d’une clé qui existe déjà. C’est exactement ce qu’on veut ici.',
    },
    {
      title: 'Une idée qui dépasse l’atelier',
      body:
        'Ce schéma s’appelle une **transaction** : tout se fait, ou rien ne se fait. On le retrouve partout où une action a un coût en plusieurs morceaux : acheter (assez d’argent ET de place dans le sac), lancer un sort (mana ET composants), améliorer un bâtiment.\n\n' +
        'Le signe qui doit t’alerter dans un graphe : un nœud qui **modifie** une variable, placé **avant** que toutes les conditions soient connues.\n\n' +
        'Le test rejoue trois fabrications et compte le stock après chacune : une fabrication refusée ne doit rien changer du tout.',
    },
  ],
  objectives: [
    'Une fabrication refusée ne change rien au stock.',
    'Avec assez de chaque ingrédient, la fabrication consomme 2 métaux et 1 batterie et donne un outil.',
    'Chaque ingrédient manquant est annoncé, comme avant.',
  ],
  hints: [
    'Le stock est modifié dans la boucle qui vérifie. Il faut que la vérification soit terminée pour tous les ingrédients avant le premier Add.',
    'Nœuds : un second For Each Loop sur Keys (Recette), et le bloc qui retire du stock (deux Find, Subtract, Add) déplacé dedans.',
    'Solution : première boucle → Branch (assez ?) → False : Possible = faux, « Il manque : … » ; True : rien. Completed → Branch (Possible) → True : seconde boucle sur Keys (Recette) → Add (Stock, clé, stock − besoin) ; Completed → Increment Outils → « Outil fabriqué ». False : « Fabrication refusée ».',
  ],
  challenge: 'Ajoute une variable Quantite : fabriquer plusieurs outils d’un coup, refusé en entier si les ingrédients ne suffisent pas pour tous (besoin × Quantite).',
  setup: workshopProject,
  scenario: [{ wait: 0.2 }, ...tap('E'), { checkpoint: 'refus' }, ...tap('F'), ...tap('E'), { checkpoint: 'fait' }, ...tap('E')],
  checks: [
    shelf('untouched', 'refus', 'Sans batterie : refusé, et le stock ne bouge pas', 3, 0, 0, 'Le métal a été retiré avant qu’on sache que la batterie manquait : ne retire rien tant que tous les ingrédients n’ont pas été vérifiés.'),
    {
      id: 'said',
      label: 'Le refus annonce « Il manque : Batterie »',
      at: 'refus',
      test: (cx) => (countPrints(cx, `${MISSING} : Batterie`) === 1 && countPrints(cx, REFUSED) === 1 ? true : 'Il fallait « Il manque : Batterie » puis « Fabrication refusée », une fois chacun : la vérification doit rester en place.'),
    },
    shelf('made', 'fait', 'Avec une batterie : 2 métaux et 1 batterie consommés, 1 outil', 1, 0, 1, 'Quand tout est disponible, chaque ingrédient de la recette doit être retiré une fois, puis l’outil compté.'),
    shelf('again', undefined, 'Troisième essai : refusé, rien ne change', 1, 0, 1, 'Une fabrication refusée ne doit rien modifier, même quand c’est le premier ingrédient qui manque.'),
    {
      id: 'once',
      label: '« Outil fabriqué » une seule fois',
      test: (cx) => (countPrints(cx, MADE) === 1 ? true : `« Outil fabriqué » s’est affiché ${countPrints(cx, MADE)} fois pour une seule fabrication réussie.`),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Atelier');
    wipe(b.graph);
    benchGraph(b, true);
  },
};
