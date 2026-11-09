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
};

const COPY_TRAP = 'Copie toute la valeur : deux variables qui contiennent le même tableau ou la même structure ne partagent rien, modifier l’une ne change pas l’autre.';

const IN_UE: Record<string, string> = {
  'event.tick': 'Ici le jeu tourne toujours à 60 images par seconde. Dans UE, le nombre d’images varie d’un appareil à l’autre : Delta Seconds change à chaque Tick.',
  'event.actorOnClicked': 'Ici, il suffit de toucher l’acteur pendant Play. Dans UE, il faut aussi activer Enable Click Events sur le Player Controller et que l’acteur bloque le canal Visibility.',
  'event.inputKey': 'Dans un projet UE5, on passe en général par Enhanced Input (Input Actions). Ces événements de touche restent utiles pour apprendre et prototyper.',
  'actor.getPlayerPawn': 'Ici il n’y a qu’un joueur, le pion à l’index 0.',
  'actor.setLocation': 'Le niveau est vu de dessus : Z est ignoré. Le déplacement se fait sans Sweep : l’acteur peut se poser dans un mur.',
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

/** For tests: every node id these notes are about. */
export const NOTED_NODES = [...Object.keys(TRAPS), ...Object.keys(IN_UE)];
