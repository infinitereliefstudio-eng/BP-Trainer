/**
 * The chapters of the learning path (UI-2, V7.85): each level cut into a few groups of steps on the same subject
 * (« Ouvrir des portes », « Cast To », « Menus et UMG »…), so that the path is not one list of 155 cards.
 *
 * A chapter is declared by its first step and runs until the next chapter's first step: a step added in the
 * middle of a chapter needs nothing here. A level with a single chapter shows no chapter heading.
 * tests/chapters.test.ts checks that every step falls in one chapter of its own level.
 */
import { LESSONS } from './index';
import type { Level } from './levels';
import type { Lesson } from './types';

export interface Chapter {
  level: Level;
  title: string;
  /** Its first step. */
  from: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { level: 'debutant', title: 'Premiers pas', from: 'l01-bonjour' },
  { level: 'debutant', title: 'Réagir au joueur', from: 'l03-interrupteur' },
  { level: 'debutant', title: 'Compter et vérifier', from: 'l-jauge' },
  { level: 'debutant', title: 'Fin du niveau', from: 's1-passage' },

  { level: 'intermediaire', title: 'Ouvrir des portes', from: 'p1-sequence-delay' },
  { level: 'intermediaire', title: 'Cast To : parler aux autres', from: 'p13-qui-entre' },
  { level: 'intermediaire', title: 'Attendre et répéter', from: 'l08-refermer' },
  { level: 'intermediaire', title: 'Valeurs, cas et états', from: 'l-valeur-lampe' },
  { level: 'intermediaire', title: 'Enhanced Input', from: 'l-ei-lampe' },
  { level: 'intermediaire', title: 'L’écran, les tableaux et les Map', from: 'l-compteur-ecran' },
  { level: 'intermediaire', title: 'Animer avec un Timeline', from: 'l-porte-glisse' },
  { level: 'intermediaire', title: 'Fin du niveau', from: 'a1-piege' },

  { level: 'confirme', title: 'Références entre acteurs', from: 'l09-generateur' },
  { level: 'confirme', title: 'Prévenir et interagir', from: 'l10-dispatcher' },
  { level: 'confirme', title: 'Organiser le code', from: 'l-qui-modifie' },
  { level: 'confirme', title: 'Locales, structures et copies', from: 'l-locales' },
  { level: 'confirme', title: 'Données et hasard', from: 'l-catalogue' },
  { level: 'confirme', title: 'Construction et ordre de départ', from: 'l-rangee-lampes' },
  { level: 'confirme', title: 'Timers et vagues', from: 'l-vagues' },
  { level: 'confirme', title: 'Menus et UMG', from: 'l-menu-pause' },
  { level: 'confirme', title: 'Cycle de vie des acteurs', from: 'l-cloture' },
  { level: 'confirme', title: 'Save Game', from: 'l-tirelire' },
  { level: 'confirme', title: 'Fin du niveau', from: 'm4-stand-tir' },

  { level: 'avance', title: 'Fonctions', from: 'l-fonctions' },
  { level: 'avance', title: 'Remettre la station en route', from: 'd13-vagues' },
  { level: 'avance', title: 'Héritage et Actor Components', from: 'l-heritage' },
  { level: 'avance', title: 'Interagir et regarder', from: 'l-salle-controle' },
  { level: 'avance', title: 'Viser et pousser', from: 'd6-tourelle-aveugle' },
  { level: 'avance', title: 'Grilles, sacs et inventaires', from: 'd15-grille' },
  { level: 'avance', title: 'Widgets dans le monde', from: 't4-energie' },
  { level: 'avance', title: 'Dialogues et sauvegarde', from: 'l-interrogatoire' },
  { level: 'avance', title: 'Niveaux et GameInstance', from: 'l-couloir' },
  { level: 'avance', title: 'Fin du niveau', from: 'm5-marche' },

  { level: 'expert', title: 'Projets', from: 'x2-atelier' },
];

export interface ChapterSteps extends Chapter {
  steps: Lesson[];
}

let cache: ChapterSteps[] | undefined;

/** Every chapter with its steps, in the order of the path. */
export function chapterSteps(): ChapterSteps[] {
  if (cache) return cache;
  const starts = new Map(CHAPTERS.map((c) => [c.from, c]));
  const out: ChapterSteps[] = [];
  for (const l of LESSONS) {
    const start = starts.get(l.id);
    if (start) out.push({ ...start, steps: [] });
    // A step before its level's first chapter (a test fails on it) still shows, in the chapter before.
    out[out.length - 1]?.steps.push(l);
  }
  cache = out;
  return out;
}

export function chaptersOf(level: Level): ChapterSteps[] {
  return chapterSteps().filter((c) => c.level === level);
}

export function chapterOf(lessonId: string): ChapterSteps | undefined {
  return chapterSteps().find((c) => c.steps.some((l) => l.id === lessonId));
}
