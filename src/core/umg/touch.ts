/** Why a touch on a widget did nothing, said the way UE would explain it. */
import type { TouchOutcome } from './touchInput';

export function touchWhy(o: Extract<TouchOutcome, { kind: 'ignored' }>): { short: string; why: string } {
  const name = o.button.split('/').pop();
  switch (o.reason) {
    case 'gameOnly':
      return {
        short: `Toucher ignoré : ${name} ne reçoit rien en Game Only.`,
        why:
          'Le Player Controller est en mode Game Only (le mode du début de partie) : toutes les entrées vont au jeu, aucune aux widgets. Dans UE, le clic part dans le jeu et le bouton ne voit rien. Pour qu’un menu réponde, appelle Set Input Mode UI Only, ou Game and UI pour que les touches arrivent encore au jeu, quand tu l’ouvres ; et Set Input Mode Game Only quand tu le fermes.',
      };
    case 'disabled':
      return {
        short: `Toucher ignoré : ${name} est désactivé.`,
        why: 'Is Enabled est décoché sur ce bouton ou sur un panneau qui le contient (dans le Designer, ou par Set Is Enabled) : il prend le toucher mais ne déclenche aucun événement.',
      };
    case 'blocked':
      return {
        short: `Toucher pris par ${o.by}, posé sur ${name}.`,
        why: `${o.by} est au-dessus de ${name} et sa Visibility est Visible : il prend le toucher, qui n’arrive pas au bouton. Dans ses Details, mets Visibility sur Not Hit-Testable (Self Only) pour que le toucher le traverse, comme pour un Canvas Panel ou un Text.`,
      };
  }
}
