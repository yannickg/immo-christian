import { HYPOTHESES as H } from '../config/hypotheses';
import { argent, pct } from '../calc/format';
import { Avis } from './Avis';

const f = H.fiscal;

export const POINTS_A_VALIDER = {
  comptable: [
    "Le prix de base rajusté réel de chaque immeuble (prix d'achat, frais d'acquisition, rénovations capitalisées) et la DPA réellement déduite (FNACC).",
    "La répartition terrain / bâtiment, qui change la récupération d'amortissement et une éventuelle perte finale.",
    "L'impôt réel l'année de la vente, y compris l'impôt minimum de remplacement (IMR) et l'effet sur les crédits et cotisations.",
    'Le calendrier de vente : étalement sur plusieurs années, réserve pour solde de prix de vente et risques liés.',
    "La détention personnelle ou par société : transfert par roulement (art. 85 / 518), impôt sur le revenu de placement, IMRTD, compte de dividende en capital, coûts annuels d'une société.",
    "Si tu as habité un des immeubles : l'exemption pour résidence principale pourrait réduire le gain.",
    "La déductibilité des intérêts d'un refinancement (scénario C) et la DPA à réclamer sur l'immeuble récent.",
    "L'application possible de la TPS/TVQ si l'immeuble visé est neuf et acheté du constructeur.",
  ],
  courtier: [
    'La valeur marchande réaliste de tes 3 immeubles et les frais de vente (commission, pénalités hypothécaires exactes).',
    "Le prix réaliste d'un immeuble récent de 10 à 12 logements dans la région (prix par porte, TGA des ventes comparables).",
    "Les loyers réellement atteignables dans le récent et le taux d'inoccupation local (rapport SCHL sur le marché locatif).",
    'Les dépenses réelles du récent (taxes, assurances, énergie) : demande les états financiers et les baux du vendeur.',
    'Le financement : RCD exigé, ratio prêt/valeur, taux, amortissement, admissibilité SCHL (et à quel programme) et prime.',
    "Pour le scénario C : le montant de refinancement qu'un prêteur accepterait réellement sur tes immeubles actuels.",
  ],
};

export function Methode() {
  return (
    <article className="methode" aria-labelledby="t-methode">
      <h2 id="t-methode">Comment ça marche</h2>
      <p className="intro">
        Voici les formules et hypothèses utilisées. Les valeurs fiscales et de marché sont dans un seul fichier de configuration (
        <code>src/config/hypotheses.ts</code>), mis à jour le <strong>{H.dateMiseAJour}</strong>.
      </p>

      <section>
        <h3>1. Vente des immeubles actuels</h3>
        <ul>
          <li><strong>Produit net de vente</strong> = prix de vente − courtage − notaire et frais.</li>
          <li><strong>Prix de base rajusté (PBR)</strong> = prix d'achat + rénovations majeures capitalisées.</li>
          <li><strong>Gain en capital</strong> = produit net de vente − PBR.</li>
          <li>
            <strong>Récupération d'amortissement</strong> = la plus petite de (DPA déduite) et (produit net − (PBR − DPA déduite)). Elle
            est imposable à 100 % comme revenu ordinaire.
          </li>
          <li>
            <strong>Revenu imposable ajouté</strong> = gain net positif × taux d'inclusion ({pct(f.tauxInclusionGainCapital, 0)} par
            défaut) + récupération. Une perte nette n'est pas reportée (simplification).
          </li>
          <li>
            <strong>Impôt sur la vente</strong> = impôt (revenu de base + revenu ajouté) − impôt (revenu de base). Le revenu de base est
            ton revenu d'emploi + autres revenus de l'année de la vente.
          </li>
          <li>
            <strong>Produit net disponible</strong> = produit net de vente − solde hypothécaire − pénalité − impôt estimé. C'est le
            capital réellement réinvestissable.
          </li>
        </ul>
      </section>

      <section>
        <h3>2. Impôt des particuliers (approximation {H.anneeFiscale})</h3>
        <ul>
          <li>
            Paliers fédéraux : {f.federal.tranches.map((t) => `${pct(t.taux, 1)} dès ${argent(t.de)}`).join(' · ')}. Abattement du
            Québec de {pct(f.federal.abattementQuebec, 1)} sur l'impôt fédéral.
          </li>
          <li>Paliers du Québec : {f.quebec.tranches.map((t) => `${pct(t.taux, 2)} dès ${argent(t.de)}`).join(' · ')}.</li>
          <li>
            Seuls les montants personnels de base ({argent(f.federal.montantPersonnelBase)} fédéral,{' '}
            {argent(f.quebec.montantPersonnelBase)} Québec) sont considérés. Pas de cotisations sociales, pas d'IMR, pas d'autres crédits.
          </li>
          <li>Si tu saisis un taux marginal, il remplace le calcul par paliers : impôt = revenu ajouté × taux.</li>
          <li>
            <strong>Impôt sur les loyers</strong> : calculé sur RNE − intérêts − DPA (si réclamée), ajouté à tes autres revenus seulement
            (on suppose que tu as cessé de travailler).
          </li>
        </ul>
      </section>

      <section>
        <h3>3. Détention par société (approximation)</h3>
        <ul>
          <li>Impôt de la société sur le revenu de placement : {pct(f.societe.tauxRevenuPlacement, 2)}.</li>
          <li>
            Le flux restant est versé en dividendes non déterminés; la société récupère {pct(f.societe.tauxRemboursementDividende, 2)} des
            dividendes versés, jusqu'à {pct(f.societe.impotRemboursable, 2)} du revenu de placement (IMRTD).
          </li>
          <li>
            Dividendes : majoration de {pct(f.majorationDividendeNonDetermine, 0)}, crédits de {pct(f.federal.creditDividendeNonDetermine, 2)}{' '}
            (fédéral) et {pct(f.quebec.creditDividendeNonDetermine, 2)} (Québec) du dividende majoré.
          </li>
          <li>Vente en société : le revenu imposable ajouté est imposé à {pct(f.societe.tauxRevenuPlacement, 2)}, sans remboursement (l'argent reste dans la société pour être réinvesti).</li>
        </ul>
      </section>

      <section>
        <h3>4. Hypothèque canadienne</h3>
        <ul>
          <li>Taux mensuel équivalent : r = (1 + taux ÷ 2)^(1/6) − 1 (composition semestrielle).</li>
          <li>Paiement mensuel = capital × r ÷ (1 − (1 + r)^−n), où n = amortissement × 12.</li>
          <li>Solde après k mois = capital × (1 + r)^k − paiement × ((1 + r)^k − 1) ÷ r.</li>
          <li>Les prêts sont supposés renouvelés au même taux pendant toute la projection.</li>
          <li>SCHL : prime (par défaut {pct(H.financement.schl.primeDefaut, 1)}) ajoutée au prêt.</li>
        </ul>
      </section>

      <section>
        <h3>5. Exploitation et indicateurs</h3>
        <ul>
          <li>Revenus bruts = (logements × loyer + autres revenus) × 12.</li>
          <li>Revenus effectifs = revenus bruts × (1 − inoccupation).</li>
          <li><strong>RNE</strong> (revenu net d'exploitation) = revenus effectifs − dépenses d'exploitation (sans hypothèque).</li>
          <li><strong>Taux de capitalisation (TGA)</strong> = RNE ÷ prix ou valeur.</li>
          <li><strong>RCD</strong> (ratio de couverture de la dette) = RNE ÷ paiements hypothécaires annuels. Alerte sous {H.alertes.rcdMinimum.toFixed(2).replace('.', ',')}; seuil habituel des prêteurs : {H.financement.conventionnel.rcdMin.toFixed(2).replace('.', ',')} conventionnel, {H.financement.schl.rcdMin.toFixed(2).replace('.', ',')} SCHL.</li>
          <li><strong>Flux avant impôt</strong> = RNE − paiements hypothécaires.</li>
          <li><strong>Rendement comptant (cash-on-cash)</strong> = flux avant impôt ÷ capital engagé.</li>
          <li><strong>Ratio dépenses/revenus</strong> = dépenses ÷ revenus effectifs.</li>
          <li><strong>Valeur nette (équité)</strong> = valeur des immeubles − soldes hypothécaires + liquidités.</li>
        </ul>
      </section>

      <section>
        <h3>6. Les quatre scénarios</h3>
        <ul>
          <li><strong>A. Statu quo</strong> : tes immeubles actuels avec leurs hypothèques actuelles.</li>
          <li><strong>B. Vendre et acheter</strong> : vente de tous les immeubles la même année, impôt calculé une seule fois, achat du récent. Un surplus reste en liquidités.</li>
          <li><strong>C. Refinancer</strong> : nouveau prêt = RPV max. × valeur; liquidités = nouveau prêt − solde − pénalité − frais. Aucune vente, aucun impôt sur gain. Portefeuille = immeubles actuels + récent.</li>
          <li>
            <strong>D. Étalement</strong> : soit les immeubles sont vendus sur 2 ou 3 années d'imposition (en alternance), soit une réserve
            pour solde de prix de vente étale l'inclusion du gain jusqu'à 5 ans. Avec la réserve, chaque année on inclut au moins la part
            du prix encaissée, et au moins 20 % du gain cumulativement. La récupération est imposée l'an 1.
          </li>
        </ul>
      </section>

      <section>
        <h3>7. Projection, sensibilité et seuil d'équilibre</h3>
        <ul>
          <li>Projection sur 10 ans : loyers et dépenses croissent à taux constant; la valeur s'apprécie à taux constant.</li>
          <li>Sensibilité : taux ±1 % et +2 %, loyers ±5 % et ±10 %, inoccupation 3, 5 et 8 %, prix du récent +5 % et +10 %.</li>
          <li>Seuil d'équilibre : recherche du loyer moyen (par dichotomie) pour lequel le flux net après impôt égale ton besoin.</li>
        </ul>
      </section>

      <section>
        <h3>8. Valeurs par défaut (champs vides)</h3>
        <ul>
          <li>Taxes municipales : {pct(H.marche.tauxTaxesMunicipales, 2)} de la valeur. Taxes scolaires : {pct(H.marche.tauxTaxeScolaire, 2)} de la valeur au-delà de {argent(H.marche.exemptionTaxeScolaire)}.</li>
          <li>Immeubles actuels, par logement par an : assurances {argent(H.defauts.actuel.assuranceParPorte)}, entretien {argent(H.defauts.actuel.entretienParPorte)}, déneigement {argent(H.defauts.actuel.deneigementParPorte)}, énergie {argent(H.defauts.actuel.energieParPorte)}, autres {argent(H.defauts.actuel.autresParPorte)}.</li>
          <li>Immeuble récent, par logement par an : assurances {argent(H.defauts.vise.assuranceParPorte)}, déneigement {argent(H.defauts.vise.deneigementParPorte)}, énergie {argent(H.defauts.vise.energieParPorte)}, autres {argent(H.defauts.vise.autresParPorte)}; entretien {pct(H.defauts.vise.entretienPct, 0)} des loyers.</li>
          <li>Inoccupation : {pct(H.defauts.actuel.inoccupationPct, 0)}. Hausse des loyers : {pct(H.marche.hausseLoyers, 1)}/an. Hausse des dépenses : {pct(H.marche.hausseDepenses, 1)}/an. Appréciation : {pct(H.marche.appreciation, 1)}/an.</li>
          <li>Loyer médian local de référence : {argent(H.marche.loyerMedianLocal)} (estimation à valider).</li>
          <li>Pénalité hypothécaire : {H.defauts.actuel.moisPenalite} mois d'intérêt. Courtage : {pct(H.defauts.actuel.fraisCourtagePct, 0)} du prix.</li>
        </ul>
      </section>

      <section className="a-valider">
        <h3>Points à faire valider</h3>
        <div className="grille-2">
          <div>
            <h4>Avec un comptable ou fiscaliste</h4>
            <ul>{POINTS_A_VALIDER.comptable.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div>
            <h4>Avec un courtier commercial ou un prêteur</h4>
            <ul>{POINTS_A_VALIDER.courtier.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      </section>

      <section>
        <h3>Limites connues du modèle</h3>
        <ul>
          <li>Pas d'impôt minimum de remplacement, pas de cotisations sociales, pas de report de pertes en capital.</li>
          <li>Les loyers du nouvel immeuble ne sont pas ajoutés au revenu de base pour l'impôt des années d'étalement.</li>
          <li>Le surplus de liquidités n'est pas investi; le solde de prix de vente (réserve) ne porte pas intérêt dans le calcul.</li>
          <li>Taxes de vente (TPS/TVQ) non modélisées : un immeuble neuf acheté du constructeur (jamais occupé) peut être taxable, avec des remboursements possibles pour immeubles locatifs neufs; un immeuble récent déjà loué est généralement exonéré. À valider.</li>
          <li>Les hypothèques sont renouvelées au même taux; en pratique, les taux changeront.</li>
        </ul>
      </section>

      <Avis />
    </article>
  );
}
