import { HYPOTHESES } from '../config/hypotheses';

type ConfigFiscale = typeof HYPOTHESES.fiscal;
interface Tranche {
  de: number;
  taux: number;
}

/** Impôt progressif selon des paliers (seuil inférieur de chaque palier). */
export function impotTranches(revenu: number, tranches: Tranche[]): number {
  let impot = 0;
  for (let i = 0; i < tranches.length; i++) {
    const haut = i + 1 < tranches.length ? tranches[i + 1].de : Infinity;
    if (revenu > tranches[i].de) impot += (Math.min(revenu, haut) - tranches[i].de) * tranches[i].taux;
  }
  return impot;
}

export interface ImpotPersonnel {
  federal: number;
  quebec: number;
  total: number;
}

/**
 * Impôt fédéral + Québec approximatif d'un particulier résident du Québec.
 * Ne tient compte que du montant personnel de base, de l'abattement du Québec et
 * du crédit pour dividendes non déterminés. Pas de cotisations sociales ni d'IMR.
 * @param revenuImposable revenu imposable total (incluant les dividendes majorés)
 * @param dividendesMajores portion du revenu qui est un dividende non déterminé majoré
 */
export function impotPersonnel(
  revenuImposable: number,
  dividendesMajores = 0,
  cfg: ConfigFiscale = HYPOTHESES.fiscal,
): ImpotPersonnel {
  const rev = Math.max(0, revenuImposable);
  const f = cfg.federal;
  const q = cfg.quebec;
  const fedBase = Math.max(
    0,
    impotTranches(rev, f.tranches) -
      f.montantPersonnelBase * f.tranches[0].taux -
      dividendesMajores * f.creditDividendeNonDetermine,
  );
  const federal = fedBase * (1 - f.abattementQuebec);
  const quebec = Math.max(
    0,
    impotTranches(rev, q.tranches) -
      q.montantPersonnelBase * q.tranches[0].taux -
      dividendesMajores * q.creditDividendeNonDetermine,
  );
  return { federal, quebec, total: federal + quebec };
}

/** Taux marginal combiné approximatif à un niveau de revenu donné. */
export function tauxMarginal(revenu: number): number {
  const d = 100;
  return (impotPersonnel(revenu + d).total - impotPersonnel(revenu).total) / d;
}

export interface ParamsIncremental {
  /** Revenu imposable déjà présent (emploi, autres revenus). */
  base: number;
  /** Revenu ordinaire ajouté (loyers nets, gain imposable, récupération). */
  ordinaire: number;
  /** Dividendes non déterminés reçus (montant réel, non majoré). */
  dividendes?: number;
  /** Si fourni, taux fixe appliqué au revenu ordinaire ajouté au lieu des paliers. */
  tauxManuel?: number | null;
}

/** Impôt supplémentaire causé par un revenu ajouté à une base existante. */
export function impotIncremental({ base, ordinaire, dividendes = 0, tauxManuel = null }: ParamsIncremental): number {
  const majore = dividendes * (1 + HYPOTHESES.fiscal.majorationDividendeNonDetermine);
  if (tauxManuel !== null && tauxManuel !== undefined) {
    const impotDiv =
      majore > 0 ? impotPersonnel(base + majore, majore).total - impotPersonnel(base).total : 0;
    return ordinaire * tauxManuel + impotDiv;
  }
  return impotPersonnel(base + ordinaire + majore, majore).total - impotPersonnel(base).total;
}

export interface FluxSociete {
  impotSociete: number;
  remboursement: number;
  dividende: number;
  impotPersonnel: number;
  fluxApresImpot: number;
}

/**
 * Détention en société (APPROXIMATION) : la société paie l'impôt sur le revenu de
 * placement, verse le flux restant en dividendes non déterminés et récupère une
 * partie de l'impôt (IMRTD). Le particulier paie l'impôt sur les dividendes.
 */
export function fluxSociete(fluxAvantImpot: number, revenuImposable: number, base: number): FluxSociete {
  const s = HYPOTHESES.fiscal.societe;
  const imposable = Math.max(0, revenuImposable);
  const impotSociete = imposable * s.tauxRevenuPlacement;
  const disponible = fluxAvantImpot - impotSociete;
  if (disponible <= 0) {
    return { impotSociete, remboursement: 0, dividende: 0, impotPersonnel: 0, fluxApresImpot: disponible };
  }
  const plafond = imposable * s.impotRemboursable;
  const sansPlafond = disponible / (1 - s.tauxRemboursementDividende);
  const dividende = sansPlafond * s.tauxRemboursementDividende <= plafond ? sansPlafond : disponible + plafond;
  const impotPerso = impotIncremental({ base, ordinaire: 0, dividendes: dividende });
  return {
    impotSociete,
    remboursement: dividende - disponible,
    dividende,
    impotPersonnel: impotPerso,
    fluxApresImpot: dividende - impotPerso,
  };
}

/** Droits de mutation immobilière (« taxe de bienvenue »), barème de base du Québec. */
export function droitsMutation(prix: number): number {
  return impotTranches(prix, HYPOTHESES.droitsMutation.tranches);
}

export function taxeScolaire(valeur: number): number {
  const m = HYPOTHESES.marche;
  return Math.max(0, valeur - m.exemptionTaxeScolaire) * m.tauxTaxeScolaire;
}
