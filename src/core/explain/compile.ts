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
    why: 'Une fonction s’exécute d’un bloc, dans la même image, et rend la main tout de suite. Un nœud qui attend (Delay, Retriggerable Delay…) ne peut donc pas y être.',
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
  duplicateCustomEvent: {
    why: 'Un Custom Event est appelé par son nom : deux du même nom dans un Blueprint seraient ambigus.',
    fixes: ['Renomme l’un des deux dans Details.'],
  },
};

export function explainCompile(code: CompileCode | undefined): Explanation | undefined {
  return code ? COMPILE[code] : undefined;
}
