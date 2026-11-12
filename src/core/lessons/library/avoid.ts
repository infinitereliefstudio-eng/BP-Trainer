/**
 * Nodes that work but are a poor fit for a lesson's situation, by lesson id.
 * Found in a passed solution, they are pointed out with the reason and what
 * to use instead (core/quality/review.ts). No known solution of a lesson uses
 * a node of its own list (tested). core/lessons/index.ts attaches them.
 */
import type { Avoid } from '../types';

const SEARCH = ['actor.getAllOfClass', 'actor.getOfClass'];

const tick = (instead: string): Avoid => ({
  defs: ['event.tick'],
  label: 'Event Tick',
  why: `Tick s’exécute à chaque image, même quand rien ne se passe. Ici, un événement dit exactement quand agir : ${instead}`,
});

const search = (instead: string): Avoid => ({
  defs: SEARCH,
  label: 'Recherche d’acteurs dans le niveau',
  why: `Get (All) Actor(s) Of Class parcourt tout le niveau et prend ce qu’il trouve, sans savoir lequel te concerne. ${instead}`,
});

const delayLoop: Avoid = {
  defs: ['time.delay', 'time.retriggerableDelay'],
  label: 'Delay pour répéter',
  why: 'Une boucle faite d’un Delay qui se rappelle ne s’arrête pas proprement et ignore les appels pendant l’attente. Set Timer by Event en Looping répète à intervalle fixe et s’arrête avec Clear and Invalidate Timer by Handle.',
};

export const AVOID: Record<string, Avoid[]> = {
  'l03-interrupteur': [tick('Begin Overlap à l’entrée, End Overlap à la sortie.'), search('La lampe agit sur son propre composant : pas besoin de chercher.')],
  'l04-touche': [tick('l’événement de la touche E, à l’appui.')],
  'l-compteur': [tick('Begin Overlap, une fois par passage.')],
  'l-barriere': [tick('la touche ou l’overlap qui change l’état.')],
  'l05-porte': [tick('Begin Overlap, quand le joueur arrive.')],
  'l06-cle': [
    tick('Begin Overlap, quand le joueur touche la clé.'),
    search('Other Actor de l’overlap est déjà l’acteur qui touche la clé : un Cast To BP_Joueur suffit.'),
  ],
  'l07-verrou': [tick('Begin Overlap, quand le joueur arrive devant la porte.'), search('Other Actor de l’overlap te donne le joueur : un Cast To BP_Joueur suffit.')],
  'l08-refermer': [tick('End Overlap lance l’attente, un Delay la compte.')],
  'l-digicode': [tick('la touche, à chaque appui.')],
  'l-etats-porte': [tick('la touche ou l’overlap qui fait changer d’état.')],
  'l-inventaire': [tick('l’overlap qui ramasse, la touche qui affiche.')],
  'l-codes': [tick('l’événement qui demande le code.')],
  'l09-generateur': [search('La leçon porte sur une référence réglée dans le niveau (Instance Editable) : chaque lampe sait alors quel générateur est le sien, même s’il y en a plusieurs.')],
  'l10-dispatcher': [search('La lampe a déjà une référence vers son générateur : c’est sur elle qu’on fait le Bind.')],
  'l11-interface': [search('Get Overlapping Actors donne ceux qui sont à portée ; le message d’interface fait le reste.')],
  'l-vagues': [tick('un timer en Looping, une fois par seconde.'), delayLoop],
  'l-porte-glisse': [delayLoop],
  'l-regarder': [
    { defs: ['cast.to'], in: 'BP_Joueur', label: 'Cast To vers chaque objet', why: 'Un Cast par sorte d’objet oblige le joueur à connaître tous les Blueprints du jeu. Le message d’interface s’envoie à l’acteur touché sans savoir ce qu’il est.' },
    { defs: ['actor.getOverlappingActors'], in: 'BP_Joueur', label: 'Get Overlapping Actors', why: 'Il donne tout ce qui est à portée, pas ce que le joueur regarde. Le Line Trace donne l’acteur visé, et un seul.' },
  ],
  'l-caisse': [tick('Event Hit, tant que le joueur pousse.')],
  'l-salle-controle': [tick('le Dispatcher de la console prévient quand le mode change.')],
};
