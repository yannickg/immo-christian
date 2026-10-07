import { describe, expect, it } from 'vitest';
import { analyser } from '../analyses';
import { cashOnCash, ratioCouvertureDette, tauxCapitalisation } from '../exploitation';
import { projetExemple, projetVide } from '../../model/projets';
import { resoudre } from '../../model/defaults';
import { calculerScenarios } from '../scenarios';

describe('indicateurs', () => {
  it('RCD, TGA et cash-on-cash', () => {
    expect(ratioCouvertureDette(120_000, 100_000)).toBeCloseTo(1.2);
    expect(ratioCouvertureDette(10_000, 0)).toBe(Infinity);
    expect(tauxCapitalisation(50_000, 1_000_000)).toBeCloseTo(0.05);
    expect(cashOnCash(30_000, 500_000)).toBeCloseTo(0.06);
  });
});

describe('scénarios sur le jeu d\'exemple', () => {
  const analyse = analyser(projetExemple());
  const [A, B, C, D] = analyse.resultats;

  it('produit les 4 scénarios', () => {
    expect(analyse.resultats.map((r) => r.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('B : produit net = liquidités avant impôt − impôt, et manque vs mise de fonds', () => {
    const v = B.vente!;
    expect(v.produitNet).toBeCloseTo(v.liquiditesAvantImpot - v.imposition.impot, 6);
    expect(v.imposition.impot).toBeGreaterThan(50_000);
    // L'exemple est construit pour montrer que 500 000 $ + frais ne sont pas couverts.
    expect(B.surplus!).toBeLessThan(0);
    expect(B.faisable).toBe(false);
    expect(analyse.alertes.some((a) => a.scenario === 'B' && a.niveau === 'danger')).toBe(true);
  });

  it('B : RNE et flux de l\'immeuble de 11 logements', () => {
    expect(B.indicateurs.nbLogements).toBe(11);
    expect(B.an1.revenusBruts).toBeCloseTo(11 * 1_000 * 12);
    expect(B.an1.fluxAvantImpot).toBeCloseTo(B.an1.rne - B.an1.serviceDette, 6);
  });

  it('D : l\'étalement réduit l\'impôt par rapport à B', () => {
    expect(D.etalement!.impotTotal).toBeLessThan(B.vente!.imposition.impot);
  });

  it('C : aucune vente, donc aucun impôt sur gain; 20 logements au total', () => {
    expect(C.vente).toBeUndefined();
    expect(C.indicateurs.nbLogements).toBe(20);
    expect(C.refinancements!.length).toBe(2);
  });

  it('A : équité initiale = valeurs − soldes', () => {
    expect(A.indicateurs.capitalEngage).toBeCloseTo(1_000_000 - 420_000);
  });

  it('projection sur 10 ans : loyers croissants et équité croissante', () => {
    for (const r of analyse.resultats) {
      expect(r.projection).toHaveLength(10);
      expect(r.projection[9].revenusBruts).toBeGreaterThan(r.projection[0].revenusBruts);
      expect(r.projection[9].equite).toBeGreaterThan(r.projection[0].equite);
    }
    // Revenus an 10 = an 1 × 1,03^9
    expect(B.projection[9].revenusBruts).toBeCloseTo(B.projection[0].revenusBruts * Math.pow(1.03, 9), 4);
  });

  it('sensibilité : +1 % de taux réduit le flux de B; −10 % de loyers aussi', () => {
    const base = analyse.sensibilite.find((l) => l.variation.id === 'base')!;
    const t1 = analyse.sensibilite.find((l) => l.variation.id === 't+1')!;
    const l10 = analyse.sensibilite.find((l) => l.variation.id === 'l-10')!;
    expect(t1.flux.B).toBeLessThan(base.flux.B);
    expect(l10.flux.B).toBeLessThan(base.flux.B);
  });

  it('seuil d\'équilibre : au loyer requis, le flux atteint le besoin', () => {
    const eq = analyse.equilibres.find((e) => e.id === 'B')!;
    expect(eq.loyerRequis).not.toBeNull();
    const p = resoudre(projetExemple());
    p.vise.loyerMoyen = eq.loyerRequis!;
    const flux = calculerScenarios(p)[1].verdict.flux;
    expect(flux).toBeCloseTo(p.profil.besoinMensuelNet, 0);
  });

  it('alerte de prix par porte bas (≈ 90 909 $/logement)', () => {
    expect(analyse.alertes.some((a) => a.texte.includes('paraît bas pour du neuf'))).toBe(true);
  });
});

describe('projet vide', () => {
  it('se calcule avec les valeurs par défaut sans erreur', () => {
    const a = analyser(projetVide());
    for (const r of a.resultats) expect(Number.isFinite(r.verdict.flux)).toBe(true);
  });
});
