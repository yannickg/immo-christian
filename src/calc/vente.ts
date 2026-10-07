import { HYPOTHESES } from '../config/hypotheses';
import type { FiscalR, ImmeubleActuelR } from '../model/types';
import { impotIncremental } from './fiscal';

export interface DetailVente {
  id: string;
  nom: string;
  prixVente: number;
  fraisCourtage: number;
  fraisNotaire: number;
  /** Produit de disposition net des frais de vente. */
  produitNetVente: number;
  /** Prix de base rajusté : prix d'achat + rénovations capitalisées. */
  pbr: number;
  gainCapital: number;
  recuperation: number;
  solde: number;
  penalite: number;
  /** Ce qui reste après frais et remboursement de l'hypothèque, AVANT impôt. */
  liquiditesAvantImpot: number;
}

export function detailVente(imm: ImmeubleActuelR): DetailVente {
  const prixVente = imm.valeurMarchande;
  const fraisCourtage = prixVente * imm.fraisCourtagePct;
  const fraisNotaire = imm.fraisNotaireVente;
  const produitNetVente = prixVente - fraisCourtage - fraisNotaire;
  const pbr = imm.prixAchat + imm.renovations;
  const gainCapital = produitNetVente - pbr;
  // Récupération : la DPA déduite redevient imposable, jusqu'à concurrence du gain sur la FNACC.
  const fnacc = pbr - imm.dpaDeduite;
  const recuperation = Math.min(imm.dpaDeduite, Math.max(0, produitNetVente - fnacc));
  return {
    id: imm.id,
    nom: imm.nom,
    prixVente,
    fraisCourtage,
    fraisNotaire,
    produitNetVente,
    pbr,
    gainCapital,
    recuperation,
    solde: imm.soldeHypothecaire,
    penalite: imm.penaliteHypothecaire,
    liquiditesAvantImpot: produitNetVente - imm.soldeHypothecaire - imm.penaliteHypothecaire,
  };
}

export interface ImpositionVente {
  gainNet: number;
  gainImposable: number;
  /** Partie non imposable du gain (en société : compte de dividende en capital). */
  gainNonImposable: number;
  recuperation: number;
  revenuAjoute: number;
  impot: number;
  /** Revenu de base auquel s'ajoute la vente (emploi + autres revenus). */
  base: number;
}

/**
 * Impôt estimé sur une vente : gain imposable (taux d'inclusion × gain net positif)
 * + récupération d'amortissement (100 % imposable). Une perte nette n'est pas
 * reportée (simplification).
 */
export function imposerVente(gainNet: number, recuperation: number, fiscal: FiscalR, base: number): ImpositionVente {
  const gainPositif = Math.max(0, gainNet);
  const gainImposable = gainPositif * fiscal.tauxInclusion;
  const revenuAjoute = gainImposable + recuperation;
  const impot =
    fiscal.detention === 'societe'
      ? revenuAjoute * HYPOTHESES.fiscal.societe.tauxRevenuPlacement
      : impotIncremental({ base, ordinaire: revenuAjoute, tauxManuel: fiscal.tauxMarginalManuel });
  return {
    gainNet,
    gainImposable,
    gainNonImposable: gainPositif - gainImposable,
    recuperation,
    revenuAjoute,
    impot,
    base,
  };
}

/** Répartit l'impôt total entre les immeubles au prorata de leur revenu imposable. */
export function repartirImpot(details: DetailVente[], impot: number, tauxInclusion: number): number[] {
  const poids = details.map((d) => Math.max(0, d.gainCapital) * tauxInclusion + d.recuperation);
  const total = poids.reduce((s, x) => s + x, 0);
  return poids.map((w) => (total > 0 ? (impot * w) / total : 0));
}

/**
 * Réserve pour solde de prix de vente : fraction cumulative du gain à inclure à la
 * fin de chaque année k (k = 1..N). Au minimum 20 % par année cumulativement
 * (donc tout est inclus au plus tard la 5e année), et au moins la proportion du
 * prix déjà encaissée. Le solde est supposé encaissé en parts égales sur N − 1 ans.
 */
export function inclusionCumulativeReserve(k: number, nbAnnees: number, pctEncaisse: number): number {
  if (k >= nbAnnees) return 1;
  const recu = nbAnnees <= 1 ? 1 : pctEncaisse + ((1 - pctEncaisse) * (k - 1)) / (nbAnnees - 1);
  return Math.min(1, Math.max(recu, 0.2 * k));
}
