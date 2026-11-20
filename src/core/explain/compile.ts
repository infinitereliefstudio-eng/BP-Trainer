/**
 * "Pourquoi ?" for Compiler Results: the compiler's text says what is wrong;
 * this says why UE refuses it and what is usually done about it.
 */
import type { CompileCode } from '../compiler/validate';
import type { Explanation } from './types';

const COMPILE: Record<CompileCode, Explanation> = {
  unknownNode: {
    why: 'Ce nœud vient d’un projet fait avec une autre version de l’appli : cette version ne le connaît pas.',
    fixes: ['Supprime-le et remplace-le par un nœud de la palette.'],
  },
  variableGone: {
    why: 'Un Get ou un Set pointe vers une variable précise. Elle a été supprimée : le nœud ne sait plus quoi lire ou écrire.',
    fixes: ['Supprime ce nœud.', 'Ou recrée la variable, puis place un nouveau Get ou Set depuis My Blueprint.'],
  },
  componentGone: {
    why: 'Le nœud vise un composant de ce Blueprint qui a été supprimé.',
    fixes: ['Supprime le nœud, ou recrée le composant et refais le nœud depuis la liste Components.'],
  },
  ownerGone: {
    why: 'Le nœud dépend d’un autre Blueprint (sa classe, ses variables, ses fonctions) qui a été supprimé du projet.',
    fixes: ['Supprime ce nœud, ou remplace-le par celui d’un Blueprint qui existe.'],
  },
  memberGone: {
    why: 'Le nœud appelle une variable, une fonction, un Event Dispatcher ou un Custom Event par son identité. Il a été supprimé, ou recréé : ce n’est plus le même.',
    fixes: ['Supprime ce nœud et place le nouveau depuis la palette ou My Blueprint.'],
  },
  private: {
    why: 'Une variable Private ne peut être lue ou modifiée que par son propre Blueprint. C’est voulu : chaque Blueprint garde la main sur son état, et les autres passent par ses fonctions ou ses événements.',
    fixes: [
      'Ajoute au Blueprint propriétaire une fonction ou un Custom Event qui change la variable, et appelle-le d’ici.',
      'Ou décoche Private sur la variable, si d’autres Blueprints doivent vraiment y accéder directement.',
    ],
  },
  notImplemented: {
    why: 'Un événement d’interface n’existe que dans un Blueprint qui implémente cette interface.',
    fixes: ['Class Settings › Implemented Interfaces › ajoute l’interface.', 'Ou supprime l’événement.'],
  },
  duplicateEvent: {
    why: 'Un Blueprint n’a qu’un seul Event BeginPlay, un seul Event Tick, etc. : UE refuse le même événement en double.',
    fixes: ['Garde un seul nœud d’événement.', 'Pour enchaîner plusieurs actions, relie-le à un Sequence, ou mets les actions à la suite.'],
  },
  latentInFunction: {
    why: 'Une fonction, comme le Construction Script, s’exécute d’un bloc, dans la même image, et rend la main tout de suite. Un nœud qui attend (Delay, Retriggerable Delay, Timeline…) ne peut donc pas y être.',
    fixes: ['Mets l’attente dans l’Event Graph, par exemple dans un Custom Event que la fonction appelle.', 'Ou utilise Set Timer by Event, qui n’attend pas.'],
  },
  byRef: {
    why: 'Une pin en losange reçoit la variable elle-même, pas une copie de sa valeur : le nœud la modifie directement. Il lui faut donc le Get de la variable à modifier, pas un résultat de calcul.',
    fixes: ['Relie le Get de la variable directement sur la pin en losange.'],
  },
  wildcard: {
    why: 'Ce nœud accepte n’importe quel type (pin grise, Wildcard). Il prend le type du premier fil qu’on y relie ; sans fil, il ne sait pas quoi manipuler.',
    fixes: ['Relie une valeur ou une variable sur la pin grise : toutes ses pins prennent alors ce type.'],
  },
  pickClass: {
    why: 'Ce nœud travaille sur une classe précise de Blueprint : sans classe choisie, il ne sait pas quoi créer ou chercher.',
    fixes: ['Choisis la classe dans la liste de la pin Class.', 'Ou relie-y une variable de type Class Reference.'],
  },
  pickTable: {
    why: 'Ce nœud lit une Data Table précise : sans table choisie (ou si elle a été supprimée), il n’a aucune ligne où chercher.',
    fixes: ['Sélectionne le nœud et choisis la Data Table dans Details.', 'Ou crée-en une : Content Drawer › + Add › Miscellaneous › Data Table.'],
  },
  pickInputAsset: {
    why: 'Ce nœud travaille sur un asset Enhanced Input précis (une Input Action ou un Mapping Context) : sans asset choisi, ou s’il a été supprimé, il ne sait pas lequel.',
    fixes: ['Sélectionne le nœud et choisis l’asset dans Details.', 'Ou crée-le : Content Drawer › + Add › Input.'],
  },
  pickSaveGame: {
    why: 'Create Save Game Object fabrique un objet d’une classe SaveGame : il faut savoir laquelle, pour connaître ses variables.',
    fixes: ['Choisis la classe dans la liste de la pin Save Game Class.', 'Pas de classe SaveGame ? Content Drawer › + Add › Blueprint Class › All Classes › SaveGame.'],
  },
  pickEnum: {
    why: 'Switch on Enum crée une sortie par valeur de l’Enum : il faut savoir lequel.',
    fixes: ['Sélectionne le nœud et choisis l’Enum dans Details.'],
  },
  targetRequired: {
    why: 'Ce nœud agit sur un acteur d’un autre Blueprint. Ici, « self » est l’acteur de ce Blueprint, pas celui visé : il faut lui dire lequel avec une référence.',
    fixes: [
      'Relie une variable de référence vers cet acteur (cochée Instance Editable et réglée dans le niveau, ou remplie par un Set).',
      'Ou la sortie d’un Cast, d’un Get Actor Of Class, ou Other Actor d’un overlap.',
    ],
  },
  badLink: {
    why: 'Les deux pins n’ont pas le même type (pas la même couleur), ou l’une a disparu après un changement de type. UE refuse ce fil.',
    fixes: ['Supprime le fil (appui long sur la pin).', 'Relie une pin du même type, ou passe par un nœud de conversion.'],
  },
  unreachable: {
    why: 'Un nœud avec des pins blanches ne s’exécute que si un fil d’exécution arrive sur son entrée. Sans fil, il est ignoré, sans erreur.',
    fixes: ['Relie sa pin d’entrée blanche à la sortie d’un événement ou du nœud qui doit le précéder.'],
  },
  inheritedName: {
    why: 'Un Blueprint enfant a déjà toutes les variables de sa classe parente : deux variables du même nom seraient ambiguës.',
    fixes: ['Renomme la variable de l’enfant.', 'Ou supprime-la et utilise celle du parent (elle est déjà là).'],
  },
  overrideSignature: {
    why: 'Une fonction du même nom que celle du parent la redéfinit : partout où la fonction du parent est appelée sur cet acteur, c’est elle qui s’exécute. Elle doit donc accepter les mêmes entrées et rendre les mêmes sorties.',
    fixes: ['Donne-lui exactement les entrées, sorties et la case Pure de la fonction du parent.', 'Ou renomme-la si ce n’est pas une redéfinition.'],
  },
  localScope: {
    why: 'Une variable locale n’existe que dans sa fonction, et seulement pendant un appel. Un autre graphe ne peut pas la voir : il n’y a rien à lire ni à écrire.',
    fixes: [
      'Crée une variable locale dans cette fonction (My Blueprint › Local Variables) et remplace le nœud.',
      'Ou, si la valeur doit survivre entre deux appels ou servir ailleurs, utilise une variable du Blueprint.',
    ],
  },
  interfaceFunction: {
    why: 'UE implémente une fonction d’interface qui renvoie une valeur comme une fonction : un événement ne peut rien renvoyer à celui qui envoie le message.',
    fixes: [
      'Supprime cet événement et ouvre la fonction dans My Blueprint › Interfaces.',
      'Ou retire la sortie de la fonction dans l’interface, si rien ne doit être renvoyé.',
    ],
  },
  interfaceName: {
    why: 'Un message d’interface déclenche l’événement d’interface (Event …), pas un Custom Event qui porte le même nom. Ici, le message passe sans rien faire.',
    fixes: ['Appui long sur le Custom Event › Convertir en événement d’interface : ses fils sont gardés.', 'Ou renomme le Custom Event, s’il n’a rien à voir avec l’interface.'],
  },
  noParentEvent: {
    why: 'Un nœud Parent: appelle la version de la classe parente. Ici, aucune classe parente n’a cet événement : il n’y a rien à appeler.',
    fixes: ['Supprime le nœud Parent:.', 'Ou vérifie la classe parente dans Class Settings.'],
  },
  selfType: {
    why: 'Une pin Target laissée vide veut dire « self », l’objet de ce Blueprint. Ce nœud agit sur un objet d’une autre sorte (un acteur, souvent) : ici, self n’en est pas un. Dans un Actor Component, self est le composant, pas l’acteur qui le porte.',
    fixes: [
      'Dans un Actor Component : relie Target à Get Owner, l’acteur qui porte le composant.',
      'Ailleurs : relie une référence vers l’objet visé (une variable, un Cast, Other Actor…).',
    ],
  },
  notInComponent: {
    why: 'Un Actor Component n’a ni forme ni place dans le niveau : il ne reçoit ni overlap, ni Hit, ni clic, ni entrées, et UE n’y accepte pas de Timeline. C’est son acteur qui vit dans le monde.',
    fixes: [
      'Pour un overlap : au BeginPlay du composant, Bind Event to On Actor Begin Overlap avec Target = Get Owner.',
      'Pour une touche : l’acteur (ou le Player Controller) reçoit l’entrée et appelle une fonction du composant.',
      'Pour animer : un timer (Set Timer by Event), ou un Timeline dans l’acteur.',
    ],
  },
  notInWidget: {
    why: 'Un widget est une interface dessinée par-dessus le jeu, pas un acteur : il n’est pas dans le niveau, n’a ni overlap ni composants, et n’a pas d’Event BeginPlay.',
    fixes: [
      'Pour démarrer : Event Construct (à chaque ajout à l’écran) ou Event On Initialized (une fois, à la création).',
      'Pour une touche : le Player Controller reçoit l’Input Action et appelle une fonction ou un Custom Event du widget.',
      'Pour suivre une valeur du jeu : l’acteur appelle un Event Dispatcher, le widget s’y abonne dans Event Construct.',
    ],
  },
  widgetOnly: {
    why: 'Event Construct, Pre Construct, Destruct et On Initialized appartiennent aux Widget Blueprints : un acteur ne les reçoit jamais.',
    fixes: ['Dans un acteur : Event BeginPlay.', 'Pour une interface : crée un Widget Blueprint (Content Drawer › + Add › User Interface › Widget Blueprint).'],
  },
  widgetGone: {
    why: 'Le nœud lit un widget du Designer qui a été supprimé, ou dont Is Variable a été décoché : il n’existe plus comme variable du Graph.',
    fixes: ['Dans le Designer, coche Is Variable en haut des Details du widget.', 'Ou supprime le nœud et prends le bon widget dans My Blueprint (Variables).'],
  },
  duplicateCustomEvent: {
    why: 'Un Custom Event est appelé par son nom : deux du même nom dans un Blueprint seraient ambigus.',
    fixes: ['Renomme l’un des deux dans Details.'],
  },
};

export function explainCompile(code: CompileCode | undefined): Explanation | undefined {
  return code ? COMPILE[code] : undefined;
}
