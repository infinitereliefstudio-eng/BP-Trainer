/**
 * Parcours › Codes (UI-2, V7.85): what the number or letter on a step's card means, and its marks.
 */
interface Props {
  onClose: () => void;
}

const CODES: [string, string, string][] = [
  ['1', 'Leçon', 'une notion nouvelle, pas à pas'],
  ['P', 'Prédis', 'lis un graphe et devine ce qu’il fait, avant de le lancer'],
  ['D', 'Débogue', 'un graphe qui ne marche pas, à réparer'],
  ['C', 'Complète', 'un graphe commencé, à finir'],
  ['R', 'Refactor', 'réécris-le mieux, sans changer ce qu’il fait'],
  ['T', 'Transfert', 'une notion connue dans une autre situation, sans plan'],
  ['A', 'Autonomie', 'un cahier des charges, sans liste des nœuds'],
  ['M', 'Entraînement', 'plusieurs notions mêlées : à toi de choisir les outils'],
  ['S', 'Synthèse', 'tout le niveau, en fin de niveau ; conseillée, jamais obligatoire'],
  ['X', 'Projet Expert', 'un long projet en jalons, sur plusieurs séances'],
];

export function CodeLegend({ onClose }: Props) {
  return (
    <section class="code-legend" aria-label="Les codes du parcours">
      <dl>
        {CODES.map(([code, name, what]) => (
          <div key={code} class="legend-row">
            <dt>
              <span class={`legend-num${code === '1' ? '' : ' dashed'}`}>{code}</span>
            </dt>
            <dd>
              <strong>{name}</strong> : {what}
            </dd>
          </div>
        ))}
        <div class="legend-row">
          <dt>
            <span class="legend-num ok">✓</span>
          </dt>
          <dd>
            <strong>Réussie</strong> : la ligne dessous dit comment (seul, avec indices, solution vue)
          </dd>
        </div>
        <div class="legend-row">
          <dt>
            <span class="legend-num next" />
          </dt>
          <dd>
            <strong>À suivre</strong> : la prochaine étape du parcours, encadrée en bleu
          </dd>
        </div>
      </dl>
      <button class="btn" onClick={onClose}>
        Fermer
      </button>
    </section>
  );
}
