import { describe, expect, it } from 'vitest';
import { anneePret, paiementMensuel, soldeApres, tauxMensuelEquivalent } from '../hypotheque';

describe('hypothèque canadienne (composition semestrielle)', () => {
  it('calcule le taux mensuel équivalent', () => {
    // 5 % composé semestriellement → (1,025)^(1/6) − 1
    expect(tauxMensuelEquivalent(0.05)).toBeCloseTo(0.0041239, 6);
  });

  it('donne le paiement de référence : 100 000 $ à 5 % sur 25 ans ≈ 581,60 $', () => {
    expect(paiementMensuel(100_000, 0.05, 25)).toBeCloseTo(581.6, 1);
  });

  it('est plus bas qu\'avec une composition mensuelle', () => {
    const r = 0.05 / 12;
    const mensuelUS = (100_000 * r) / (1 - Math.pow(1 + r, -300));
    expect(paiementMensuel(100_000, 0.05, 25)).toBeLessThan(mensuelUS);
  });

  it('gère un taux nul et un capital nul', () => {
    expect(paiementMensuel(120_000, 0, 10)).toBeCloseTo(1_000, 6);
    expect(paiementMensuel(0, 0.05, 25)).toBe(0);
  });

  it('rembourse entièrement le prêt à la fin de l\'amortissement', () => {
    const pret = { capital: 500_000, taux: 0.0475, amortissementAns: 25 };
    expect(soldeApres(pret, 300)).toBe(0);
    expect(soldeApres(pret, 299)).toBeGreaterThan(0);
    expect(soldeApres(pret, 0)).toBeCloseTo(500_000, 6);
  });

  it('année 1 : paiements = intérêts + capital, et le capital remboursé réduit le solde', () => {
    const pret = { capital: 500_000, taux: 0.05, amortissementAns: 25 };
    const a1 = anneePret(pret, 1);
    expect(a1.paiements).toBeCloseTo(paiementMensuel(500_000, 0.05, 25) * 12, 6);
    expect(a1.interets + a1.capitalRembourse).toBeCloseTo(a1.paiements, 6);
    expect(a1.soldeFin).toBeCloseTo(500_000 - a1.capitalRembourse, 6);
    // Intérêts de l'an 1 ≈ 24 400 $ sur 500 000 $ à 5 %
    expect(a1.interets).toBeGreaterThan(24_000);
    expect(a1.interets).toBeLessThan(24_800);
  });

  it('la somme du capital remboursé sur toute la durée égale le capital emprunté', () => {
    const pret = { capital: 250_000, taux: 0.06, amortissementAns: 20 };
    let total = 0;
    for (let t = 1; t <= 21; t++) total += anneePret(pret, t).capitalRembourse;
    expect(total).toBeCloseTo(250_000, 4);
    expect(anneePret(pret, 21).paiements).toBe(0);
  });
});
