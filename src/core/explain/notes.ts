/**
 * Short notes shown in a node's Details, only where they matter:
 * - "Piège": what surprises nearly everyone with this node in UE.
 * - "Dans UE": where this 2D simulation differs from the real engine.
 * Nodes that do what their name says get nothing.
 */
import { findVariable, type NodeInstance } from '../model/project';
import type { NodeContext } from '../nodes/definition';

const TRAPS: Record<string, string> = {
  'game.setGamePaused': 'En pause, les Input Actions n’arrivent plus, sauf celles dont Trigger when Paused est coché : l’action qui enlève la pause doit l’avoir, sinon le jeu reste figé.',
  'time.delay': 'Un nouvel appel pendant l’attente est ignoré : l’attente ne repart pas de zéro. Pour qu’elle reparte, c’est Retriggerable Delay.',
  'time.retriggerableDelay': 'Chaque appel recommence l’attente depuis zéro : appelé sans arrêt, il ne sort jamais par Completed.',
  'flow.doOnce': 'Ne laisse passer que le premier passage, puis reste fermé jusqu’à ce qu’on entre par Reset.',
  'math.randomIntInRange': 'Nœud pur : il tire un nouveau nombre à chaque lecture. Relié à deux nœuds, il donne deux nombres différents ; stocke-le dans une variable pour réutiliser le même.',
  'math.randomFloatInRange': 'Nœud pur : il tire un nouveau nombre à chaque lecture. Relié à deux nœuds, il donne deux nombres différents ; stocke-le dans une variable pour réutiliser le même.',
  'math.randomBool': 'Nœud pur : il tire à nouveau à chaque lecture. Relié à deux nœuds, il peut donner deux résultats différents.',
  'array.random': 'Nœud pur : Out Item et Out Index sont retirés à chaque lecture, ils peuvent ne pas correspondre si on lit les deux.',
  'flow.forEachLoop': 'La boucle tourne d’un coup, dans la même image : un Delay dans Loop Body ne la fait pas attendre, et ignore les appels suivants.',
  'flow.forEachLoopWithBreak': 'Break ne coupe pas le Loop Body en cours : la boucle s’arrête quand ce tour est fini. Ce qui suit Break sur le même fil s’exécute encore.',
  'random.intInRangeFromStream': 'Nœud pur : chaque lecture tire un nombre et fait avancer le stream. Lu par deux nœuds, il consomme deux tirages. Et relié directement à Make Random Stream, il redonne toujours le premier nombre : garde le stream dans une variable.',
  'random.floatInRangeFromStream': 'Nœud pur : chaque lecture tire un nombre et fait avancer le stream. Relié directement à Make Random Stream, il redonne toujours le premier nombre : garde le stream dans une variable.',
  'random.makeStream': 'Nœud pur : relu à chaque tirage, il refabrique le stream à son début. Fais-le une fois (BeginPlay), garde le résultat dans une variable et tire depuis elle.',
  'math.reflectionVector': 'Surface Normal est la normale de la surface touchée (Out Hit Normal), pas la direction d’arrivée. Et le rayon suivant ne doit pas repartir du point d’impact exact : il retoucherait la même surface à distance 0.',
  'math.transformLocation': 'Le sens compte : Transform Location va du local vers le monde, Inverse Transform Location du monde vers le local. Inversés, le résultat a l’air presque juste tant que l’acteur est à l’origine et sans rotation.',
  'math.inverseTransformLocation': 'Le sens compte : Inverse Transform Location va du monde vers le local, Transform Location du local vers le monde. Inversés, tout semble marcher tant que l’acteur est à l’origine et sans rotation.',
  'flow.forLoop': 'La boucle tourne d’un coup, dans la même image : un Delay dans Loop Body ne la fait pas attendre.',
  'array.get': 'Renvoie une copie de l’élément : la modifier ne change pas le tableau. Pour changer un élément, utilise Set Array Elem.',
  'math.equalFloat': 'Comparaison exacte : un Float issu d’un calcul (0,1 + 0,2) n’est presque jamais exactement égal à la valeur attendue. Utilise Nearly Equal.',
  'event.inputKey': 'Consume Input est coché par défaut : si plusieurs acteurs écoutent cette touche, seul le premier de la pile la reçoit, c’est-à-dire le dernier posé dans le niveau. Le joueur passe après tous les autres.',
  'cast.to': 'Un échec n’est pas une erreur : il sort par Cast Failed sans rien dire. Si rien ne se passe, regarde d’abord de ce côté.',
  'input.subsystem': 'Obtenir le Subsystem ne fait rien tout seul : c’est Add Mapping Context, branché sur sa Return Value, qui active le contexte.',
  'pawn.getController': 'Renvoie None pour un pion que personne ne possède (un pion posé dans le niveau, par exemple) : seul le pion du joueur a ici un Controller.',
  'flow.isValid': 'À placer avant une référence qui peut être vide, ou pointer vers un acteur détruit : sinon c’est Accessed None.',
  'actor.getAllOfClass': 'Parcourt tout le niveau à chaque appel : coûteux. Fais-le une fois (BeginPlay) et garde le résultat dans une variable plutôt qu’à chaque Tick.',
  'event.tick': 'S’exécute à chaque image. Une durée ou une vitesse se calcule avec Delta Seconds, sinon elle dépend du nombre d’images par seconde.',
  'actor.destroy': 'Les références vers l’acteur détruit ne deviennent pas None d’elles-mêmes : vérifie-les avec Is Valid avant de t’en servir.',
  'actor.spawn': 'Le BeginPlay du nouvel acteur a déjà tourné quand Return Value sort : un Set fait après arrive trop tard pour lui. Utilise Expose on Spawn.',
  'time.setTimerByEvent': 'Relancer le même événement remplace son timer au lieu d’en ajouter un. Garde le Return Value (Timer Handle) pour l’arrêter avec Clear Timer.',
  'dispatcher.bind': 'Seuls les appels faits après le Bind sont reçus : fais le Bind tôt, au BeginPlay, avant le premier Call.',
  'actor.getComponentByClass': 'Renvoie None sur un acteur qui n’a pas ce composant (un mur, une caisse sans santé) : teste avec Is Valid avant de t’en servir, sinon c’est Accessed None.',
  'component.getOwner': 'Dans un Actor Component, Self est le composant : les nœuds d’acteur (Get Actor Location, Destroy Actor…) ont besoin de Get Owner sur Target.',
  'actor.getOwner': 'Ce n’est pas l’acteur qui porte un composant : celui-là s’obtient avec le Get Owner d’un Actor Component. L’Owner d’un acteur est presque toujours None.',
  'event.componentDispatcher': 'Abonné par UE dès que l’acteur existe, sans Bind Event : il reçoit tous les appels du composant, même ceux de son BeginPlay.',
  'var.getLocal': 'Chaque appel de la fonction repart de la valeur par défaut : une variable locale ne garde rien d’un appel à l’autre. Pour compter entre deux appels, utilise une variable du Blueprint.',
  'dataTable.getRow': 'Out Row n’a de sens que sur le chemin Row Found. Relier aussi Row Not Found au même Print String affiche une ligne vide, sans erreur : traite les deux sorties séparément.',
  'save.fromSlot': 'Slot absent : Return Value vaut None, sans erreur, et le Cast qui suit échoue en silence. À la toute première partie, il n’y a encore rien : teste Does Save Game Exist et crée une sauvegarde neuve sinon.',
  'save.toSlot': 'Il écrit les variables telles qu’elles sont à cet instant : un Set fait après n’est pas sauvé tant qu’on n’appelle pas Save Game to Slot une nouvelle fois.',
  'save.create': 'L’objet créé n’est écrit nulle part : sans Save Game to Slot, il disparaît à la fin de la partie.',
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
  'game.setGamePaused': 'Dans UE, un acteur peut continuer à tourner en pause (Tick Even when Paused), et un événement de touche a une case Execute when Paused. Ici, seules les Input Actions peuvent passer la pause. Le menu lui-même serait un Widget Blueprint.',
  'dataTable.getRow': 'Dans UE, la Data Table se choisit sur une pin du nœud, et ses lignes se remplissent dans un éditeur de tableau ou en important un fichier CSV ou JSON. Ici, la table se choisit dans Details.',
  'save.toSlot': 'Dans UE, le slot est un fichier .sav dans le dossier Saved du projet. Ici, il est gardé avec le projet, et le Content Drawer montre son contenu (UE ne le fait pas).',
  'save.fromSlot': 'Dans UE, Async Load Game from Slot fait la même chose sans bloquer le jeu, pour les grosses sauvegardes. Le principe est le même.',
  'text.format': 'Dans UE, les arguments de Format Text acceptent aussi des nombres directement, et le Text se traduit selon la langue du jeu. Ici, ils sont convertis en Text et rien n’est traduit.',
  'event.tick': 'Ici le jeu tourne toujours à 60 images par seconde. Dans UE, le nombre d’images varie d’un appareil à l’autre : Delta Seconds change à chaque Tick.',
  'event.actorOnClicked': 'Ici, il suffit de toucher l’acteur pendant Play. Dans UE, il faut aussi activer Enable Click Events sur le Player Controller et que l’acteur bloque le canal Visibility.',
  'event.inputKey': 'Dans un projet UE5, on passe en général par Enhanced Input (Input Actions). Ces événements de touche restent utiles pour apprendre et prototyper.',
  'actor.getPlayerPawn': 'Ici il n’y a qu’un joueur, le pion à l’index 0.',
  'player.getController': 'Ici il n’y a qu’un joueur : son Player Controller est à l’index 0. Dans UE, un Blueprint Player Controller se choisit dans le Game Mode (Player Controller Class).',
  'input.addMappingContext': 'Dans UE, le Mapping Context se choisit sur une pin du nœud, à côté de Priority et d’un Options (ignoré ici). Ici, il se choisit dans Details.',
  'actor.setLocation': 'Le niveau est vu de dessus : Z est ignoré. Le déplacement se fait sans Sweep : l’acteur peut se poser dans un mur.',
  'timeline.node': 'Ici une piste est faite de segments droits entre ses points clés. Dans UE, on double-clique le nœud pour ouvrir l’éditeur de courbes, où chaque point peut aussi être arrondi (Auto) ; un Timeline peut porter des pistes Vector, Color et Event.',
  'trace.lineByChannel': 'Ici le rayon est tracé dans le plan du sol. Un Static Mesh qui bloque arrête les deux canaux ; une Box Collision (zone de déclenchement) n’en arrête aucun ; la capsule du joueur ignore Visibility et bloque Camera, comme le preset Pawn. Dans UE, cela se règle composant par composant dans Collision Presets.',
  'event.hit': 'Ici, seul le joueur se déplace en balayant le décor : Event Hit vient donc toujours d’un contact avec lui. Dans UE, un acteur déplacé avec Sweep coché, ou simulé par la physique (Simulation Generates Hit Events), en reçoit aussi.',
  'cs.entry': 'Dans UE, le Construction Script sert aussi à créer des composants (Add Static Mesh Component…). Ici il règle les composants existants.',
  'actor.getOwner': 'Dans UE, l’Owner d’un acteur se donne avec la pin Owner de Spawn Actor (le réseau s’en sert). Ici, Spawn Actor n’a pas cette pin : Get Owner d’un acteur renvoie toujours None.',
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
