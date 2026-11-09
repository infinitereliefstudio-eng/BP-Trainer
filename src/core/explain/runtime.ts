/**
 * "Pourquoi ?" for Blueprint Runtime Errors. The Output Log keeps UE's text;
 * this adds what it means at that node: for Accessed None, where the empty
 * reference came from (a variable never set, a failed Cast, a destroyed actor).
 */
import type { Project } from '../model/project';
import { findVariable } from '../model/project';
import type { Explanation } from './types';
import { locate, pinsOf, titleOf, type Site } from './where';

export interface ErrorSite {
  project: Project;
  graphId: string;
  nodeId: string;
}

const NONE_FIXES = [
  'Donne une valeur à la référence avant ce nœud : un Set au BeginPlay, ou un réglage dans le niveau si la variable est Instance Editable.',
  'Si elle peut être vide à ce moment-là, passe d’abord par Is Valid et ne continue que par Is Valid.',
];

export function explainRuntime(message: string, at?: ErrorSite): Explanation | undefined {
  const none = /^Accessed None trying to read property (.+?)( \(l'acteur a été détruit\)| \(le composant n'existe plus\))?$/.exec(message);
  if (none) {
    if (none[2]) {
      return {
        why: `La pin ${none[1]} pointe vers un acteur détruit plus tôt (Destroy Actor). La référence n’est pas remise à None, mais l’acteur n’existe plus : on ne peut plus rien lui demander.`,
        fixes: ['Vérifie avec Is Valid avant d’utiliser la référence.', 'Ou vide la variable (Set à rien) au moment où l’acteur est détruit.'],
      };
    }
    return { why: `La pin ${none[1]} a reçu une référence vide (None) : il n’y avait aucun acteur à qui s’adresser.${noneSource(none[1], at)}`, fixes: NONE_FIXES };
  }
  const index = /^Attempted to access index (-?\d+) from array of length (\d+)!$/.exec(message);
  if (index) {
    const len = Number(index[2]);
    return {
      why: `Le tableau a ${len} élément${len > 1 ? 's' : ''} : ses index vont ${len ? `de 0 à ${len - 1}` : 'de… rien, il est vide'}. L’index ${index[1]} n’existe pas : le nœud ne fait rien (un Get renvoie une valeur par défaut).`,
      fixes: ['Compare l’index à Length (ou utilise Last Index) avant de lire.', 'Dans une boucle, utilise For Each Loop : il ne sort jamais du tableau.'],
    };
  }
  if (message.startsWith('Infinite loop detected')) {
    return {
      why: 'Un seul événement a exécuté un nombre énorme de nœuds sans jamais rendre la main : UE arrête tout pour ne pas geler le jeu. Une boucle tourne sans fin.',
      fixes: [
        'Un While Loop doit voir sa condition devenir fausse à l’intérieur de son Loop Body.',
        'Un Custom Event ou une fonction qui s’appelle lui-même doit avoir une condition d’arrêt.',
        'Pour répéter quelque chose dans le temps, utilise Set Timer by Event ou Tick, pas une boucle.',
      ],
    };
  }
  if (message.startsWith('SpawnActor failed because no class was specified')) {
    return { why: 'La pin Class de Spawn Actor a reçu une classe vide.', fixes: ['Choisis une classe sur la pin Class, ou vérifie la variable Class Reference qui y est reliée.'] };
  }
  if (message.includes("la pin Event n'est reliée à aucun Custom Event")) {
    return {
      why: 'Ce nœud doit savoir quel événement appeler plus tard : on le lui donne en reliant la pin rouge d’un Custom Event sur sa pin Event.',
      fixes: ['Tire un fil depuis la pin Event et choisis « Add Custom Event », ou relie un Custom Event existant.'],
    };
  }
  if (message === 'Divide by zero' || message === 'Modulo by zero') {
    return { why: 'Le nombre par lequel on divise vaut 0 : UE renvoie 0 et signale l’erreur.', fixes: ['Vérifie avec un Branch que le diviseur n’est pas 0 avant de diviser.'] };
  }
  if (message.includes('Value doit être relié à une variable')) {
    return {
      why: 'Increment et Decrement modifient une variable directement (pin en losange) : il leur faut le Get de cette variable.',
      fixes: ['Relie le Get de la variable à modifier sur la pin Value.'],
    };
  }
  if (message.startsWith('Boucle de nœuds purs')) {
    return { why: 'Des nœuds purs se lisent en cercle : pour calculer A il faut B, et pour B il faut A.', fixes: ['Casse le cercle en stockant une des valeurs dans une variable avec un Set.'] };
  }
  if (message.includes("n'a pas cette fonction")) {
    return {
      why: 'La fonction est appelée sur un acteur d’une autre classe que celle qui la définit.',
      fixes: ['Vérifie la référence branchée sur Target : elle doit viser un acteur du Blueprint qui possède la fonction (un Cast peut aider).'],
    };
  }
  return undefined;
}

/** Where the empty reference on `pinName` came from, when it can be told. */
function noneSource(pinName: string, at?: ErrorSite): string {
  const s = at && locate(at.project, at.graphId, at.nodeId);
  if (!s) return '';
  const pin = pinsOf(s).find((p) => p.dir === 'in' && (p.name === pinName || p.id === pinName.toLowerCase()));
  if (!pin) return '';
  const src = feeding(s, pin.id);
  if (!src) return ` La pin ${pinName} de ${titleOf(s)} n’est reliée à rien.`;
  switch (src.node.def) {
    case 'var.get': {
      const v = findVariable(s.cls, String(src.node.config.variable));
      if (!v) return '';
      return v.instanceEditable
        ? ` Elle vient de la variable ${v.name}, Instance Editable : elle n’a pas été réglée dans le niveau pour cet acteur, et aucun Set ne l’a remplie avant.`
        : ` Elle vient de la variable ${v.name} : une variable de référence est vide au départ, et aucun Set ne l’a remplie avant ce nœud.`;
    }
    case 'var.getExternal':
      return ` Elle vient d’une variable d’un autre Blueprint, ${titleOf(src).replace('Get ', '')}, encore vide.`;
    case 'cast.to':
      return ' Elle vient de la sortie d’un Cast : elle vaut None quand le Cast échoue.';
    case 'actor.getOfClass':
      return ' Get Actor Of Class n’a trouvé aucun acteur de cette classe.';
  }
  return ` Elle vient de ${titleOf(src)}, qui a donné None.`;
}

function feeding(s: Site, pin: string): Site | undefined {
  let link = Object.values(s.graph.links).find((l) => l.to.node === s.node.id && l.to.pin === pin);
  for (let guard = 0; link && guard < 64; guard++) {
    const from = s.graph.nodes[link.from.node];
    if (!from) return undefined;
    if (from.def !== 'util.reroute') return { ...s, node: from };
    const fromId = from.id;
    link = Object.values(s.graph.links).find((l) => l.to.node === fromId && l.to.pin === 'in');
  }
  return undefined;
}
