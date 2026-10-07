export function Avis() {
  return (
    <aside className="avis" aria-labelledby="t-avis">
      <h2 id="t-avis">Avis et limites</h2>
      <ul>
        <li>
          Cet outil est un <strong>simulateur éducatif</strong>. Il ne constitue pas un conseil financier, fiscal ou juridique.
        </li>
        <li>
          Avant toute transaction, fais valider les chiffres par un <strong>comptable ou fiscaliste</strong> (planification de la
          vente, société ou détention personnelle, réserve, DPA) et par un <strong>courtier immobilier commercial</strong> ou un{' '}
          <strong>prêteur</strong>.
        </li>
        <li>
          L'outil ne recommande ni d'acheter ni de vendre : il présente des chiffres, des risques et des hypothèses.
        </li>
        <li>
          Il n'existe pas d'équivalent canadien au « 1031 exchange » américain : vendre un immeuble qui a pris de la valeur entraîne de
          l'impôt. Un transfert à une société (art. 85 fédéral, art. 518 Québec) peut reporter l'impôt, mais le gain latent suit les
          immeubles.
        </li>
      </ul>
    </aside>
  );
}
