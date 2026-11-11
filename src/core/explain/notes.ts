/**
 * Short notes shown in a node's Details, only where they matter:
 * - "Piège": what surprises nearly everyone with this node in UE.
 * - "Dans UE": where this 2D simulation differs from the real engine.
 * Nodes that do what their name says get nothing.
 */
import { findVariable, type NodeInstance } from '../model/project';
import type { NodeContext } from '../nodes/definition';

const TRAPS: Record<string, string> = {
  'time.delay': 'Un nouvel appel pendant l’attente est ignoré : l’attente ne repart pas de zéro. Pour qu’elle reparte, c’est Retriggerable Delay.',
  'time.retriggerableDelay': 'Chaque appel recommence l’attente depuis zéro : appelé sans arrêt, il ne sort jamais par Completed.',
  'flow.doOnce': 'Ne laisse passer que le premier passage, puis reste fermé jusqu’à ce qu’on entre par Reset.',
  'math.randomIntInRange': 'Nœud pur : il tire un nouveau nombre à chaque lecture. Relié à deux nœuds, il donne deux nombres différents ; stocke-le dans une variable pour réutiliser le même.',
  'math.randomFloatInRange': 'Nœud pur : il tire un nouveau nombre à chaque lecture. Relié à deux nœuds, il donne deux nombres différents ; stocke-le dans une variable pour réutiliser le même.',
  'math.randomBool': 'Nœud pur : il tire à nouveau à chaque lecture. Relié à deux nœuds, il peut donner deux résultats différents.',
  'array.random': 'Nœud pur : Out Item et Out Index sont retirés à chaque lecture, ils peuvent ne pas correspondre si on lit les deux.',
  'flow.forEachLoop': 'La boucle tourne d’un coup, dans la même image : un Delay dans Loop Body ne la fait pas attendre, et ignore les appels suivants.',
  'flow.forLoop': 'La boucle tourne d’un coup, dans la même image : un Delay dans Loop Body ne la fait pas attendre.',
  'array.get': 'Renvoie une copie de l’élément : la modifier ne change pas le tableau. Pour changer un élément, utilise Set Array Elem.',
  'math.equalFloat': 'Comparaison exacte : un Float issu d’un calcul (0,1 + 0,2) n’est presque jamais exactement égal à la valeur attendue. Utilise Nearly Equal.',
  'cast.to': 'Un échec n’est pas une erreur : il sort par Cast Failed sans rien dire. Si rien ne se passe, regarde d’abord de ce côté.',
  'flow.isValid': 'À placer avant une référence qui peut être vide, ou pointer vers un acteur détruit : sinon c’est Accessed None.',
  'actor.getAllOfClass': 'Parcourt tout le niveau à chaque appel : coûteux. Fais-le une fois (BeginPlay) et garde le résultat dans une variable plutôt qu’à chaque Tick.',
  'event.tick': 'S’exécute à chaque image. Une durée ou une vitesse se calcule avec Delta Seconds, sinon elle dépend du nombre d’images par seconde.',
  'actor.destroy': 'Les références vers l’acteur détruit ne deviennent pas None d’elles-mêmes : vérifie-les avec Is Valid avant de t’en servir.',
  'actor.spawn': 'Le BeginPlay du nouvel acteur a déjà tourné quand Return Value sort : un Set fait après arrive trop tard pour lui. Utilise Expose on Spawn.',
  'time.setTimerByEvent': 'Relancer le même événement remplace son timer au lieu d’en ajouter un. Garde le Return Value (Timer Handle) pour l’arrêter avec Clear Timer.',
  'dispatcher.bind': 'Seuls les appels faits après le Bind sont reçus : fais le Bind tôt, au BeginPlay, avant le premier Call.',
  'var.getLocal': 'Chaque appel de la fonction repart de la valeur par défaut : une variable locale ne garde rien d’un appel à l’autre. Pour compter entre deux appels, utilise une variable du Blueprint.',
  'map.find': 'Si la clé n’y est pas, il n’y a pas d’erreur : Value vaut la valeur par défaut (0, vide, None). Teste Return Value avant de te servir de Value.',
  'set.toArray': 'L’ordre des éléments d’un Set n’est pas garanti : ne compte pas sur la position d’un élément dans le tableau obtenu.',
  'struct.setMembers': 'Relié à Get (a copy) d’un tableau, il ne change que la copie : le tableau reste intact, sans erreur. Utilise Get (a ref), ou Set Array Elem avec la structure modifiée.',
  'text.equal': 'Contrairement au == des String, il tient compte des majuscules. Pour comparer des identifiants, préfère des Name.',
  'timeline.node': 'Play reprend là où le Timeline s’est arrêté : arrivé à la fin, Play ne rejoue rien (la valeur reste la dernière). Pour recommencer, entre par Play from Start ; pour revenir, par Reverse.',
  'math.lerp': 'Lerp ne bouge pas tout seul : c’est Alpha qui doit aller de 0 à 1. Sur Tick avec un Alpha fixe (Lerp de la valeur actuelle vers la cible), on s’approche sans jamais arriver, et la vitesse dépend du nombre d’images par seconde : utilise un Timeline ou FInterp To.',
  'math.lerpVector': 'Lerp ne bouge pas tout seul : c’est Alpha qui doit aller de 0 à 1. Sur Tick avec un Alpha fixe, on s’approche de B sans jamais y arriver : utilise un Timeline ou VInterp To.',
  'trace.lineByChannel': 'End est une position dans le monde, pas une direction : c’est Start + direction × distance. Avec la direction seule, le rayon part vers l’origine du niveau. Et si Ignore Self est décoché, un rayon qui part du centre de l’acteur touche d’abord l’acteur lui-même, à la distance 0.',
  'event.hit': 'Il n’y a pas d’événement de fin de contact : Event Hit se redéclenche à chaque image tant que les deux acteurs se bloquent. Ce qui ne doit arriver qu’une fois par contact passe par un Do Once, rouvert quand le contact a cessé (Retriggerable Delay › Reset).',
  'cs.entry': 'Il ne tourne pas pendant la partie : changer une variable en jeu ne le relance pas. Et quand il s’exécute, aucun acteur n’a encore fait son BeginPlay : ne compte pas sur les variables que d’autres règlent au BeginPlay.',
  'iface.message': 'Si la cible n’implémente pas l’interface, rien ne se passe et les sorties gardent leur valeur par défaut (0, vide, None) : aucune erreur ne le signale.',
};

const COPY_TRAP = 'Copie toute la valeur : deux variables qui contiennent le même tableau ou la même structure ne partagent rien, modifier l’une ne change pas l’autre.';

const IN_UE: Record<string, string> = {
  'text.format': 'Dans UE, les arguments de Format Text acceptent aussi des nombres directement, et le Text se traduit selon la langue du jeu. Ici, ils sont convertis en Text et rien n’est traduit.',
  'event.tick': 'Ici le jeu tourne toujours à 60 images par seconde. Dans UE, le nombre d’images varie d’un appareil à l’autre : Delta Seconds change à chaque Tick.',
  'event.actorOnClicked': 'Ici, il suffit de toucher l’acteur pendant Play. Dans UE, il faut aussi activer Enable Click Events sur le Player Controller et que l’acteur bloque le canal Visibility.',
  'event.inputKey': 'Dans un projet UE5, on passe en général par Enhanced Input (Input Actions). Ces événements de touche restent utiles pour apprendre et prototyper.',
  'actor.getPlayerPawn': 'Ici il n’y a qu’un joueur, le pion à l’index 0.',
  'actor.setLocation': 'Le niveau est vu de dessus : Z est ignoré. Le déplacement se fait sans Sweep : l’acteur peut se poser dans un mur.',
  'timeline.node': 'Ici une piste est faite de segments droits entre ses points clés. Dans UE, on double-clique le nœud pour ouvrir l’éditeur de courbes, où chaque point peut aussi être arrondi (Auto) ; un Timeline peut porter des pistes Vector, Color et Event.',
  'trace.lineByChannel': 'Ici le rayon est tracé dans le plan du sol. Un Static Mesh qui bloque arrête les deux canaux ; une Box Collision (zone de déclenchement) n’en arrête aucun ; la capsule du joueur ignore Visibility et bloque Camera, comme le preset Pawn. Dans UE, cela se règle composant par composant dans Collision Presets.',
  'event.hit': 'Ici, seul le joueur se déplace en balayant le décor : Event Hit vient donc toujours d’un contact avec lui. Dans UE, un acteur déplacé avec Sweep coché, ou simulé par la physique (Simulation Generates Hit Events), en reçoit aussi.',
  'cs.entry': 'Dans UE, le Construction Script sert aussi à créer des composants (Add Static Mesh Component…). Ici il règle les composants existants.',
  'actor.getLocation': 'Le niveau est vu de dessus : Z vaut toujours 0.',
};

export function trapFor(node: NodeInstance, ctx: NodeContext): string | undefined {
  if (node.def === 'var.set') {
    const v = findVariable(ctx.cls, String(node.config.variable));
    return v && (v.type.container || v.type.category === 'struct') ? COPY_TRAP : undefined;
  }
  return TRAPS[node.def];
}

export function inUeFor(node: NodeInstance): string | undefined {
  return IN_UE[node.def];
}

/** The notes of a node definition, for the node index (no instance at hand). */
export const trapOf = (defId: string): string | undefined => TRAPS[defId];
export const inUeOf = (defId: string): string | undefined => IN_UE[defId];

/** For tests: every node id these notes are about. */
export const NOTED_NODES = [...Object.keys(TRAPS), ...Object.keys(IN_UE)];
