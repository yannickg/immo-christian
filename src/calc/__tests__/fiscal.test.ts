import { describe, expect, it } from 'vitest';
import { droitsMutation, fluxSociete, impotIncremental, impotPersonnel, impotTranches, tauxMarginal } from '../fiscal';
import { detailVente, imposerVente, inclusionCumulativeReserve } from '../vente';
import type { FiscalR, ImmeubleActuelR } from '../../model/types';

const fiscal: FiscalR = {
  tauxInclusion: 0.5,
  detention: 'personnelle',
  tauxMarginalManuel: null,
  reclamerDpa: false,
  partBatimentPct: 0.8,
  tauxDpa: 0.04,
};

function immeuble(partiel: Partial<ImmeubleActuelR>): ImmeubleActuelR {
  return {
    id: 'x', nom: 'Test', nbLogements: 3, loyerMoyen: 700, valeurMarchande: 330_000, prixAchat: 180_000,
    anneeAchat: 2010, renovations: 30_000, dpaDeduite: 40_000, soldeHypothecaire: 90_000, tauxHypothecaire: 0.045,
    amortissementRestant: 12, dateRenouvellement: '', fraisCourtagePct: 0.05, fraisNotaireVente: 1_500,
    penaliteHypothecaire: 1_000, taxesMunicipales: 0, taxesScolaires: 0, assurances: 0, entretien: 0, deneigement: 0,
    energie: 0, conciergerie: 0, autres: 0, inoccupationPct: 0, gestionFixe: null, gestionPct: 0, ...partiel,
  };
}

describe('impôt par paliers', () => {
  const paliers = [{ de: 0, taux: 0.1 }, { de: 10_000, taux: 0.2 }, { de: 50_000, taux: 0.3 }];
  it('applique chaque taux à sa tranche', () => {
    expect(impotTranches(5_000, paliers)).toBeCloseTo(500);
    expect(impotTranches(60_000, paliers)).toBeCloseTo(1_000 + 8_000 + 3_000);
  });

  it('impôt personnel nul sous les montants personnels de base, croissant ensuite', () => {
    expect(impotPersonnel(10_000).total).toBe(0);
    expect(impotPersonnel(80_000).total).toBeGreaterThan(impotPersonnel(60_000).total);
  });

  it('taux marginal combiné plausible au Québec (~53 % au sommet)', () => {
    expect(tauxMarginal(400_000)).toBeCloseTo(0.33 * (1 - 0.165) + 0.2575, 3);
    expect(tauxMarginal(70_000)).toBeGreaterThan(0.3);
    expect(tauxMarginal(70_000)).toBeLessThan(0.45);
  });

  it('impôt incrémental : taux manuel fixe si fourni', () => {
    expect(impotIncremental({ base: 50_000, ordinaire: 10_000, tauxManuel: 0.4 })).toBeCloseTo(4_000);
    const p = impotIncremental({ base: 50_000, ordinaire: 10_000 });
    expect(p).toBeGreaterThan(2_500);
    expect(p).toBeLessThan(3_500);
  });
});

describe('gain en capital et récupération d\'amortissement', () => {
  it('calcule le gain sur le prix de base rajusté et la récupération séparément', () => {
    const d = detailVente(immeuble({}));
    // Produit net : 330 000 − 5 % − 1 500 = 312 000
    expect(d.produitNetVente).toBeCloseTo(312_000);
    // PBR = 180 000 + 30 000
    expect(d.pbr).toBe(210_000);
    expect(d.gainCapital).toBeCloseTo(102_000);
    expect(d.recuperation).toBe(40_000);
    // Liquidités avant impôt : 312 000 − 90 000 − 1 000
    expect(d.liquiditesAvantImpot).toBeCloseTo(221_000);
  });

  it('pas de récupération si le prix de vente est sous la FNACC', () => {
    const d = detailVente(immeuble({ valeurMarchande: 150_000, prixAchat: 200_000, renovations: 0, dpaDeduite: 20_000, fraisCourtagePct: 0, fraisNotaireVente: 0 }));
    expect(d.gainCapital).toBe(-50_000);
    expect(d.recuperation).toBe(0);
  });

  it('applique le taux d\'inclusion et ajoute la récupération à 100 %', () => {
    const imp = imposerVente(100_000, 40_000, fiscal, 0);
    expect(imp.gainImposable).toBe(50_000);
    expect(imp.revenuAjoute).toBe(90_000);
    expect(imp.impot).toBeCloseTo(impotPersonnel(90_000).total);
    const imp67 = imposerVente(100_000, 0, { ...fiscal, tauxInclusion: 2 / 3 }, 0);
    expect(imp67.gainImposable).toBeCloseTo(66_666.67, 1);
  });

  it('une perte nette n\'est pas imposée', () => {
    expect(imposerVente(-10_000, 0, fiscal, 50_000).impot).toBe(0);
  });

  it('l\'impôt est plus élevé si la vente s\'ajoute à un revenu d\'emploi', () => {
    expect(imposerVente(200_000, 0, fiscal, 75_000).impot).toBeGreaterThan(imposerVente(200_000, 0, fiscal, 0).impot);
  });

  it('société : taux fixe sur le revenu de placement', () => {
    const imp = imposerVente(100_000, 0, { ...fiscal, detention: 'societe' }, 0);
    expect(imp.impot).toBeCloseTo(50_000 * 0.5017);
  });
});

describe('réserve pour solde de prix de vente', () => {
  it('impose au minimum 20 % du gain par année (cumulatif)', () => {
    expect(inclusionCumulativeReserve(1, 5, 0.1)).toBeCloseTo(0.2);
    expect(inclusionCumulativeReserve(2, 5, 0.1)).toBeCloseTo(0.4);
    expect(inclusionCumulativeReserve(5, 5, 0.1)).toBe(1);
  });
  it('impose au moins la proportion encaissée', () => {
    expect(inclusionCumulativeReserve(1, 5, 0.5)).toBeCloseTo(0.5);
    expect(inclusionCumulativeReserve(1, 1, 0.5)).toBe(1);
  });
});

describe('société et droits de mutation', () => {
  it('flux société : dividende et impôt personnel cohérents', () => {
    const r = fluxSociete(50_000, 40_000, 0);
    expect(r.impotSociete).toBeCloseTo(40_000 * 0.5017);
    expect(r.remboursement).toBeLessThanOrEqual(40_000 * 0.3067 + 1e-6);
    expect(r.fluxApresImpot).toBeLessThan(50_000);
    expect(r.fluxApresImpot).toBeGreaterThan(0);
  });

  it('droits de mutation : barème par tranches', () => {
    expect(droitsMutation(50_000)).toBeCloseTo(250);
    const d = droitsMutation(1_000_000);
    expect(d).toBeCloseTo(62_900 * 0.005 + (315_000 - 62_900) * 0.01 + (1_000_000 - 315_000) * 0.015, 2);
  });
});
