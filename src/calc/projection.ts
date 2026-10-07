import type { FiscalR, MarcheR } from '../model/types';
import { exploiter, type Actif } from './exploitation';
import { fluxSociete, impotIncremental } from './fiscal';
import { anneePret } from './hypotheque';

export interface AnneeProjection {
  annee: number;
  revenusBruts: number;
  perteInoccupation: number;
  revenusEffectifs: number;
  depenses: number;
  rne: number;
  serviceDette: number;
  interets: number;
  capitalRembourse: number;
  fluxAvantImpot: number;
  dpa: number;
  revenuImposable: number;
  impot: number;
  fluxApresImpot: number;
  valeur: number;
  soldeDette: number;
  liquidites: number;
  equite: number;
}

export interface ContexteImpot {
  fiscal: FiscalR;
  /** Revenu imposable de base pendant l'exploitation (autres revenus, sans emploi). */
  base: number;
}

/** Impôt total (société + particulier le cas échéant) sur le revenu locatif d'une année. */
export function impotExploitation(fluxAvantImpot: number, revenuImposable: number, ctx: ContexteImpot): number {
  if (ctx.fiscal.detention === 'societe') {
    return fluxAvantImpot - fluxSociete(fluxAvantImpot, revenuImposable, ctx.base).fluxApresImpot;
  }
  return impotIncremental({ base: ctx.base, ordinaire: revenuImposable, tauxManuel: ctx.fiscal.tauxMarginalManuel });
}

/**
 * Projection annuelle d'un portefeuille. Hypothèses : loyers et dépenses croissent
 * à taux constant; les prêts sont renouvelés au même taux; la DPA (si réclamée)
 * ne peut pas créer de perte locative.
 */
export function projeter(
  actifs: Actif[],
  marche: MarcheR,
  ctx: ContexteImpot,
  liquiditesInitiales = 0,
  annees = 10,
): AnneeProjection[] {
  const fnacc = actifs.map((a) => a.fnacc);
  const lignes: AnneeProjection[] = [];
  for (let t = 1; t <= annees; t++) {
    const fl = Math.pow(1 + marche.hausseLoyers, t - 1);
    const fd = Math.pow(1 + marche.hausseDepenses, t - 1);
    let revenusBruts = 0, perte = 0, effectifs = 0, depenses = 0, rne = 0;
    let service = 0, interets = 0, capital = 0, solde = 0, valeur = 0;
    for (const a of actifs) {
      const e = exploiter(a, fl, fd);
      revenusBruts += e.revenusBruts;
      perte += e.perteInoccupation;
      effectifs += e.revenusEffectifs;
      depenses += e.depenses;
      rne += e.rne;
      const p = anneePret(a.pret, t);
      service += p.paiements;
      interets += p.interets;
      capital += p.capitalRembourse;
      solde += p.soldeFin;
      valeur += a.valeur * Math.pow(1 + marche.appreciation, t);
    }
    let dpa = 0;
    if (ctx.fiscal.reclamerDpa) {
      const dpaMax = fnacc.reduce((s, f) => s + f * ctx.fiscal.tauxDpa, 0);
      dpa = Math.min(dpaMax, Math.max(0, rne - interets));
      const proportion = dpaMax > 0 ? dpa / dpaMax : 0;
      for (let i = 0; i < fnacc.length; i++) fnacc[i] -= fnacc[i] * ctx.fiscal.tauxDpa * proportion;
    }
    const fluxAvantImpot = rne - service;
    const revenuImposable = rne - interets - dpa;
    const impot = impotExploitation(fluxAvantImpot, revenuImposable, ctx);
    lignes.push({
      annee: t,
      revenusBruts,
      perteInoccupation: perte,
      revenusEffectifs: effectifs,
      depenses,
      rne,
      serviceDette: service,
      interets,
      capitalRembourse: capital,
      fluxAvantImpot,
      dpa,
      revenuImposable,
      impot,
      fluxApresImpot: fluxAvantImpot - impot,
      valeur,
      soldeDette: solde,
      liquidites: liquiditesInitiales,
      equite: valeur - solde + liquiditesInitiales,
    });
  }
  return lignes;
}
