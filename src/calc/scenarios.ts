import { HYPOTHESES as H } from '../config/hypotheses';
import type { FiscalR, ImmeubleViseR, ProjetResolu } from '../model/types';
import {
  actifActuel,
  actifVise,
  cashOnCash,
  exploiter,
  pretActuel,
  ratioCouvertureDette,
  tauxCapitalisation,
  type Actif,
  type Ligne,
} from './exploitation';
import { paiementMensuel, type Pret } from './hypotheque';
import { projeter, type AnneeProjection } from './projection';
import {
  detailVente,
  imposerVente,
  inclusionCumulativeReserve,
  repartirImpot,
  type DetailVente,
  type ImpositionVente,
} from './vente';

export type IdScenario = 'A' | 'B' | 'C' | 'D';
export const IDS_SCENARIOS: IdScenario[] = ['A', 'B', 'C', 'D'];

export const NOMS_SCENARIOS: Record<IdScenario, string> = {
  A: 'A. Statu quo',
  B: 'B. Vendre et acheter 1 récent',
  C: 'C. Refinancer et acheter',
  D: 'D. Vendre avec étalement',
};

export const COULEURS_SCENARIOS: Record<IdScenario, string> = {
  A: '#6b7280',
  B: '#1d4ed8',
  C: '#047857',
  D: '#b45309',
};

export interface FinancementVise {
  pret: Pret;
  montantBase: number;
  primeSchl: number;
  rpv: number;
  rpvMax: number;
  rcdMin: number;
  amortissementMax: number;
  paiementMensuel: number;
  frais: Ligne[];
  totalFrais: number;
  /** Mise de fonds + frais d'acquisition : le comptant nécessaire. */
  capitalRequis: number;
  rcd: number;
}

export function financerVise(v: ImmeubleViseR, fiscal: FiscalR): FinancementVise {
  const regles = v.schl ? H.financement.schl : H.financement.conventionnel;
  const montantBase = Math.max(0, v.prix - v.miseDeFonds);
  const primeSchl = v.schl ? montantBase * v.primeSchlPct : 0;
  const pret: Pret = { capital: montantBase + primeSchl, taux: v.taux, amortissementAns: v.amortissement };
  const frais: Ligne[] = [
    { libelle: 'Notaire', montant: v.fraisNotaire },
    { libelle: 'Droits de mutation (taxe de bienvenue)', montant: v.droitsMutation },
    { libelle: 'Inspection', montant: v.fraisInspection },
    { libelle: 'Évaluation', montant: v.fraisEvaluation },
    { libelle: 'Évaluation environnementale', montant: v.fraisEnvironnement },
    { libelle: 'Autres frais', montant: v.fraisAutres },
  ];
  const totalFrais = frais.reduce((s, f) => s + f.montant, 0);
  const pmt = paiementMensuel(pret.capital, pret.taux, pret.amortissementAns);
  const e = exploiter(actifVise(v, fiscal, pret));
  return {
    pret,
    montantBase,
    primeSchl,
    rpv: v.prix > 0 ? montantBase / v.prix : 0,
    rpvMax: regles.rpvMax,
    rcdMin: regles.rcdMin,
    amortissementMax: regles.amortissementMax,
    paiementMensuel: pmt,
    frais,
    totalFrais,
    capitalRequis: v.miseDeFonds + totalFrais,
    rcd: ratioCouvertureDette(e.rne, pmt * 12),
  };
}

export interface SommaireVente {
  details: DetailVente[];
  imposition: ImpositionVente;
  impotParImmeuble: number[];
  liquiditesAvantImpot: number;
  /** Capital réellement réinvestissable après impôt. */
  produitNet: number;
}

export interface Refinancement {
  id: string;
  nom: string;
  valeur: number;
  ancienSolde: number;
  penalite: number;
  frais: number;
  nouveauPret: number;
  liquidites: number;
  paiementMensuel: number;
  rcd: number;
  possible: boolean;
}

export interface AnneeEtalement {
  annee: number;
  base: number;
  gainImposable: number;
  recuperation: number;
  impot: number;
  encaissement: number;
}

export interface Etalement {
  mode: 'etalement' | 'reserve';
  nbAnnees: number;
  annees: AnneeEtalement[];
  impotTotal: number;
  impotSansEtalement: number;
  soldeARecevoir: number;
  /** Liquidités à la vente : encaissé l'an 1 − remboursements − impôt de l'an 1. */
  liquiditesAnnee1: number;
}

export interface Indicateurs {
  nbLogements: number;
  valeur: number;
  prixParPorte: number;
  revenusBruts: number;
  rne: number;
  tga: number;
  rcd: number;
  cashOnCash: number;
  ratioDepenses: number;
  capitalEngage: number;
  fluxMensuelAvantImpot: number;
  fluxMensuelApresImpot: number;
  impotAnnuel: number;
}

export interface Verdict {
  besoin: number;
  flux: number;
  ecart: number;
  ecartPct: number;
  atteint: boolean;
}

export interface ResultatScenario {
  id: IdScenario;
  nom: string;
  description: string;
  actifs: Actif[];
  projection: AnneeProjection[];
  an1: AnneeProjection;
  indicateurs: Indicateurs;
  verdict: Verdict;
  vente?: SommaireVente;
  financement?: FinancementVise;
  refinancements?: Refinancement[];
  etalement?: Etalement;
  /** Capital disponible pour l'achat (après impôt / refinancement). */
  capitalDisponible?: number;
  capitalRequis?: number;
  /** Positif = surplus; négatif = manque. */
  surplus?: number;
  faisable: boolean;
}

function assembler(
  id: IdScenario,
  description: string,
  p: ProjetResolu,
  actifs: Actif[],
  capitalEngage: number,
  liquiditesInitiales: number,
  extra: Partial<ResultatScenario> = {},
): ResultatScenario {
  const projection = projeter(actifs, p.marche, { fiscal: p.fiscal, base: p.profil.autresRevenus }, liquiditesInitiales);
  const an1 = projection[0];
  const valeur = actifs.reduce((s, a) => s + a.valeur, 0);
  const nbLogements = actifs.reduce((s, a) => s + a.nbLogements, 0);
  const besoin = p.profil.besoinMensuelNet;
  const flux = an1.fluxApresImpot / 12;
  const ecart = flux - besoin;
  return {
    id,
    nom: NOMS_SCENARIOS[id],
    description,
    actifs,
    projection,
    an1,
    indicateurs: {
      nbLogements,
      valeur,
      prixParPorte: nbLogements > 0 ? valeur / nbLogements : NaN,
      revenusBruts: an1.revenusBruts,
      rne: an1.rne,
      tga: tauxCapitalisation(an1.rne, valeur),
      rcd: ratioCouvertureDette(an1.rne, an1.serviceDette),
      cashOnCash: cashOnCash(an1.fluxAvantImpot, capitalEngage),
      ratioDepenses: an1.revenusEffectifs > 0 ? an1.depenses / an1.revenusEffectifs : NaN,
      capitalEngage,
      fluxMensuelAvantImpot: an1.fluxAvantImpot / 12,
      fluxMensuelApresImpot: flux,
      impotAnnuel: an1.impot,
    },
    verdict: { besoin, flux, ecart, ecartPct: besoin > 0 ? ecart / besoin : 0, atteint: ecart >= 0 },
    faisable: extra.surplus === undefined || extra.surplus >= 0,
    ...extra,
  };
}

function equiteActuelle(p: ProjetResolu): number {
  return p.actuels.reduce((s, a) => s + a.valeurMarchande - a.soldeHypothecaire, 0);
}

function scenarioA(p: ProjetResolu): ResultatScenario {
  const actifs = p.actuels.map((imm) => actifActuel(imm, p.fiscal, pretActuel(imm)));
  return assembler('A', 'Tu gardes tes immeubles actuels, sans vente ni achat.', p, actifs, equiteActuelle(p), 0);
}

function sommaireVente(p: ProjetResolu, impot: number, imposition: ImpositionVente): SommaireVente {
  const details = p.actuels.map(detailVente);
  const liquiditesAvantImpot = details.reduce((s, d) => s + d.liquiditesAvantImpot, 0);
  return {
    details,
    imposition,
    impotParImmeuble: repartirImpot(details, impot, p.fiscal.tauxInclusion),
    liquiditesAvantImpot,
    produitNet: liquiditesAvantImpot - impot,
  };
}

function baseAnneeVente(p: ProjetResolu): number {
  return p.profil.revenuEmploi + p.profil.autresRevenus;
}

function imposerTout(p: ProjetResolu): ImpositionVente {
  const details = p.actuels.map(detailVente);
  return imposerVente(
    details.reduce((s, d) => s + d.gainCapital, 0),
    details.reduce((s, d) => s + d.recuperation, 0),
    p.fiscal,
    baseAnneeVente(p),
  );
}

function scenarioB(p: ProjetResolu): ResultatScenario {
  const imposition = imposerTout(p);
  const vente = sommaireVente(p, imposition.impot, imposition);
  const fin = financerVise(p.vise, p.fiscal);
  const surplus = vente.produitNet - fin.capitalRequis;
  const actifs = [actifVise(p.vise, p.fiscal, fin.pret)];
  return assembler(
    'B',
    'Tu vends les immeubles actuels la même année et tu achètes un seul immeuble récent.',
    p,
    actifs,
    fin.capitalRequis,
    Math.max(0, surplus),
    { vente, financement: fin, capitalDisponible: vente.produitNet, capitalRequis: fin.capitalRequis, surplus },
  );
}

function scenarioC(p: ProjetResolu): ResultatScenario {
  const fin = financerVise(p.vise, p.fiscal);
  const c = p.scenarioC;
  const refinancements: Refinancement[] = [];
  const actifs = p.actuels.map((imm) => {
    if (!c.refinances.includes(imm.id)) return actifActuel(imm, p.fiscal, pretActuel(imm));
    const nouveauPret = c.rpvMax * imm.valeurMarchande;
    const possible = nouveauPret > imm.soldeHypothecaire + imm.penaliteHypothecaire + c.fraisRefi;
    const pret: Pret | null = possible
      ? { capital: nouveauPret, taux: c.tauxRefi, amortissementAns: c.amortissementRefi }
      : pretActuel(imm);
    const actif = actifActuel(imm, p.fiscal, pret);
    const pmt = pret ? paiementMensuel(pret.capital, pret.taux, pret.amortissementAns) : 0;
    refinancements.push({
      id: imm.id,
      nom: imm.nom,
      valeur: imm.valeurMarchande,
      ancienSolde: imm.soldeHypothecaire,
      penalite: imm.penaliteHypothecaire,
      frais: c.fraisRefi,
      nouveauPret,
      liquidites: possible ? nouveauPret - imm.soldeHypothecaire - imm.penaliteHypothecaire - c.fraisRefi : 0,
      paiementMensuel: pmt,
      rcd: ratioCouvertureDette(exploiter(actif).rne, pmt * 12),
      possible,
    });
    return actif;
  });
  actifs.push(actifVise(p.vise, p.fiscal, fin.pret));
  const capitalDisponible = refinancements.reduce((s, r) => s + r.liquidites, 0);
  const surplus = capitalDisponible - fin.capitalRequis;
  return assembler(
    'C',
    "Tu gardes tes immeubles, tu en refinances pour dégager la mise de fonds (aucun gain réalisé), et tu achètes l'immeuble récent.",
    p,
    actifs,
    equiteActuelle(p),
    Math.max(0, surplus),
    { financement: fin, refinancements, capitalDisponible, capitalRequis: fin.capitalRequis, surplus },
  );
}

function scenarioD(p: ProjetResolu): ResultatScenario {
  const d = p.scenarioD;
  const N = d.nbAnnees;
  const details = p.actuels.map(detailVente);
  const impositionB = imposerTout(p);
  const baseAn = (k: number) => (k === 1 ? baseAnneeVente(p) : d.revenuAnneesSuivantes);
  const annees: AnneeEtalement[] = [];
  const liquiditesAvantImpot = details.reduce((s, x) => s + x.liquiditesAvantImpot, 0);
  let soldeARecevoir = 0;

  if (d.mode === 'etalement') {
    // Les immeubles sont vendus sur N années d'imposition différentes (répartition en alternance).
    for (let k = 1; k <= N; k++) {
      const vendus = details.filter((_, i) => i % N === k - 1);
      const gain = vendus.reduce((s, x) => s + x.gainCapital, 0);
      const recup = vendus.reduce((s, x) => s + x.recuperation, 0);
      const imp = imposerVente(gain, recup, p.fiscal, baseAn(k));
      annees.push({
        annee: k,
        base: imp.base,
        gainImposable: imp.gainImposable,
        recuperation: recup,
        impot: imp.impot,
        encaissement: vendus.reduce((s, x) => s + x.liquiditesAvantImpot, 0),
      });
    }
  } else {
    // Réserve : une partie du prix est payée plus tard; le gain est inclus graduellement.
    const prixTotal = details.reduce((s, x) => s + x.prixVente, 0);
    const pctEnc = N <= 1 ? 1 : d.pctEncaisse;
    soldeARecevoir = (1 - pctEnc) * prixTotal;
    const gainNet = Math.max(0, details.reduce((s, x) => s + x.gainCapital, 0));
    const recupTotale = details.reduce((s, x) => s + x.recuperation, 0);
    let cumulPrec = 0;
    for (let k = 1; k <= N; k++) {
      const cumul = inclusionCumulativeReserve(k, N, pctEnc);
      const recup = k === 1 ? recupTotale : 0; // la récupération n'est pas admissible à la réserve
      const imp = imposerVente(gainNet * (cumul - cumulPrec), recup, p.fiscal, baseAn(k));
      cumulPrec = cumul;
      annees.push({
        annee: k,
        base: imp.base,
        gainImposable: imp.gainImposable,
        recuperation: recup,
        impot: imp.impot,
        encaissement: k === 1 ? liquiditesAvantImpot - soldeARecevoir : soldeARecevoir / (N - 1),
      });
    }
  }

  const impotTotal = annees.reduce((s, a) => s + a.impot, 0);
  const fin = financerVise(p.vise, p.fiscal);
  const imposition: ImpositionVente = {
    ...impositionB,
    gainImposable: annees.reduce((s, a) => s + a.gainImposable, 0),
    impot: impotTotal,
  };
  const vente = sommaireVente(p, impotTotal, imposition);
  const liquiditesAnnee1 = annees[0].encaissement - annees[0].impot;
  // Étalement : on suppose le produit des ventes disponible à l'achat (sinon financement relais).
  // Réserve : seul le comptant encaissé à la vente, moins l'impôt de l'an 1, est disponible.
  const capitalDisponible = d.mode === 'reserve' ? liquiditesAnnee1 : vente.produitNet;
  const surplus = capitalDisponible - fin.capitalRequis;
  const aRecevoirNet = annees.slice(1).reduce((s, a) => s + (d.mode === 'reserve' ? a.encaissement : 0) - a.impot, 0);
  const liquidites = Math.max(0, surplus) + (d.mode === 'reserve' ? aRecevoirNet : 0);
  const description =
    d.mode === 'etalement'
      ? `Comme B, mais les ventes sont réparties sur ${N} années d'imposition pour réduire l'impôt progressif.`
      : `Comme B, mais avec une réserve pour solde de prix de vente sur ${N} ans (${Math.round(d.pctEncaisse * 100)} % encaissé à la vente).`;
  return assembler('D', description, p, [actifVise(p.vise, p.fiscal, fin.pret)], fin.capitalRequis, liquidites, {
    vente,
    financement: fin,
    etalement: {
      mode: d.mode,
      nbAnnees: N,
      annees,
      impotTotal,
      impotSansEtalement: impositionB.impot,
      soldeARecevoir,
      liquiditesAnnee1,
    },
    capitalDisponible,
    capitalRequis: fin.capitalRequis,
    surplus,
  });
}

const CALCULS: Record<IdScenario, (p: ProjetResolu) => ResultatScenario> = {
  A: scenarioA,
  B: scenarioB,
  C: scenarioC,
  D: scenarioD,
};

export function calculerScenario(p: ProjetResolu, id: IdScenario): ResultatScenario {
  return CALCULS[id](p);
}

export function calculerScenarios(p: ProjetResolu): ResultatScenario[] {
  return IDS_SCENARIOS.map((id) => CALCULS[id](p));
}
