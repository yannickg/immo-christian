/**
 * ============================================================================
 *  FICHIER UNIQUE DES HYPOTHÈSES FISCALES, DE FINANCEMENT ET DE MARCHÉ
 * ============================================================================
 *
 *  Toutes les valeurs ci-dessous sont des ESTIMATIONS À VALIDER avec un
 *  comptable / fiscaliste, un prêteur et un courtier immobilier commercial.
 *
 *  Pour mettre à jour :
 *    1. Modifier les valeurs voulues ci-dessous.
 *    2. Mettre à jour `dateMiseAJour`.
 *    3. Lancer `npm test` pour vérifier que les formules fonctionnent toujours.
 *
 *  Convention : tous les taux sont exprimés en décimales (0,05 = 5 %).
 */
export const HYPOTHESES = {
  dateMiseAJour: '2026-10-04',
  anneeFiscale: 2026,

  // --------------------------------------------------------------------------
  // Fiscalité des particuliers (approximations 2026, montants indexés estimés)
  // --------------------------------------------------------------------------
  fiscal: {
    /** Taux d'inclusion du gain en capital. La hausse à 66,67 % proposée en 2024 a été abandonnée. */
    tauxInclusionGainCapital: 0.5,

    federal: {
      /** Paliers d'imposition fédéraux (seuil inférieur de chaque palier). */
      tranches: [
        { de: 0, taux: 0.14 },
        { de: 58_523, taux: 0.205 },
        { de: 117_045, taux: 0.26 },
        { de: 181_440, taux: 0.29 },
        { de: 258_482, taux: 0.33 },
      ],
      /** Montant personnel de base (crédit au taux du premier palier). */
      montantPersonnelBase: 16_452,
      /** Abattement du Québec : réduction de l'impôt fédéral de base pour les résidents du Québec. */
      abattementQuebec: 0.165,
      /** Crédit d'impôt pour dividendes non déterminés (en % du dividende majoré). */
      creditDividendeNonDetermine: 0.090301,
    },

    quebec: {
      tranches: [
        { de: 0, taux: 0.14 },
        { de: 54_345, taux: 0.19 },
        { de: 108_680, taux: 0.24 },
        { de: 132_245, taux: 0.2575 },
      ],
      montantPersonnelBase: 18_952,
      creditDividendeNonDetermine: 0.0342,
    },

    /** Majoration des dividendes non déterminés (« ordinaires »). */
    majorationDividendeNonDetermine: 0.15,

    /** Société : revenu de placement (loyers) — estimation simplifiée. */
    societe: {
      /** Taux combiné fédéral + Québec sur le revenu de placement d'une SPCC. */
      tauxRevenuPlacement: 0.5017,
      /** Partie remboursable (IMRTD) sur le revenu de placement. */
      impotRemboursable: 0.3067,
      /** Remboursement au titre de dividendes (en % des dividendes imposables versés). */
      tauxRemboursementDividende: 0.3833,
    },

    /** Part du prix attribuée au bâtiment (le terrain n'est pas amortissable). */
    partBatimentDefaut: 0.8,
    /** Taux de DPA, catégorie 1 (immeubles locatifs résidentiels), solde dégressif. */
    tauxDpaDefaut: 0.04,
    /** Au-delà de ce gain imposable + récupération, avertir de l'impôt minimum de remplacement (IMR). */
    seuilAlerteImpotMinimum: 175_000,
  },

  // --------------------------------------------------------------------------
  // Droits de mutation immobilière (barème de base du Québec, 2026 estimé).
  // Certaines municipalités appliquent des taux plus élevés au-delà de 500 000 $.
  // --------------------------------------------------------------------------
  droitsMutation: {
    tranches: [
      { de: 0, taux: 0.005 },
      { de: 62_900, taux: 0.01 },
      { de: 315_000, taux: 0.015 },
    ],
  },

  // --------------------------------------------------------------------------
  // Financement (règles générales simplifiées — chaque prêteur a les siennes)
  // --------------------------------------------------------------------------
  financement: {
    conventionnel: { rpvMax: 0.75, rcdMin: 1.2, amortissementMax: 30 },
    schl: { rpvMax: 0.85, rcdMin: 1.1, amortissementMax: 40, primeDefaut: 0.03 },
  },

  // --------------------------------------------------------------------------
  // Marché (Victoriaville et environs — estimations à valider)
  // --------------------------------------------------------------------------
  marche: {
    hausseLoyers: 0.03,
    hausseDepenses: 0.03,
    appreciation: 0.025,
    /** Loyer médian de référence du marché local (estimation à valider : SCHL, courtiers locaux). */
    loyerMedianLocal: 900,
    /** Taux de taxes municipales approximatif, en % de la valeur. */
    tauxTaxesMunicipales: 0.009,
    /** Taux de taxe scolaire approximatif (taux unique provincial). */
    tauxTaxeScolaire: 0.0009,
    exemptionTaxeScolaire: 25_000,
  },

  // --------------------------------------------------------------------------
  // Seuils d'alerte
  // --------------------------------------------------------------------------
  alertes: {
    prixParPorteMinRecent: 120_000,
    rcdMinimum: 1.1,
    /** Alerte si le loyer visé dépasse le loyer médian local de plus de ce pourcentage. */
    ecartLoyerMedian: 0.15,
  },

  // --------------------------------------------------------------------------
  // Valeurs par défaut des champs laissés vides (affichées en gris dans l'app)
  // --------------------------------------------------------------------------
  defauts: {
    profil: {
      age: 48,
      revenuEmploi: 70_000,
      autresRevenus: 0,
      besoinMensuelNet: 4_000,
      gestionPct: 0.05,
    },
    actuel: {
      nbLogements: 3,
      loyerMoyen: 700,
      valeurParPorte: 111_000,
      /** Si le prix d'achat est inconnu : hypothèse prudente = 50 % de la valeur actuelle. */
      ratioPrixAchat: 0.5,
      anneeAchat: 2012,
      tauxHypothecaire: 0.05,
      amortissementRestant: 20,
      fraisCourtagePct: 0.05,
      fraisNotaireVente: 1_500,
      /** Pénalité de remboursement anticipé estimée à X mois d'intérêt. */
      moisPenalite: 3,
      assuranceParPorte: 800,
      entretienParPorte: 1_000,
      deneigementParPorte: 250,
      energieParPorte: 250,
      autresParPorte: 200,
      inoccupationPct: 0.03,
    },
    vise: {
      prix: 1_000_000,
      nbLogements: 11,
      loyerMoyen: 1_000,
      ratioMiseDeFonds: 0.5,
      taux: 0.0475,
      amortissement: 25,
      assuranceParPorte: 500,
      entretienPct: 0.04,
      entretienParPorte: 500,
      deneigementParPorte: 200,
      energieParPorte: 150,
      autresParPorte: 200,
      inoccupationPct: 0.03,
      fraisNotaire: 3_000,
      fraisInspection: 2_000,
      fraisEvaluation: 4_000,
      fraisEnvironnement: 3_500,
      fraisAutres: 2_500,
    },
    scenarioC: {
      rpvMax: 0.75,
      tauxRefi: 0.0475,
      amortissementRefi: 25,
      fraisRefi: 3_000,
    },
    scenarioD: {
      nbAnneesEtalement: 2,
      nbAnneesReserve: 5,
      pctEncaisse: 0.5,
    },
  },
};

export type Hypotheses = typeof HYPOTHESES;
