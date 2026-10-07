import type { ImmeubleActuel, Projet } from './types';

export function immeubleVide(numero: number): ImmeubleActuel {
  return {
    id: `imm-${Date.now().toString(36)}-${numero}`,
    nom: `Immeuble ${numero}`,
    nbLogements: null,
    loyerMoyen: null,
    valeurMarchande: null,
    prixAchat: null,
    anneeAchat: null,
    renovations: null,
    dpaDeduite: null,
    soldeHypothecaire: null,
    tauxHypothecaire: null,
    amortissementRestant: null,
    dateRenouvellement: '',
    fraisCourtagePct: null,
    fraisNotaireVente: null,
    penaliteHypothecaire: null,
    taxesMunicipales: null,
    taxesScolaires: null,
    assurances: null,
    entretien: null,
    deneigement: null,
    energie: null,
    conciergerie: null,
    gestion: null,
    autres: null,
    inoccupationPct: null,
  };
}

export function projetVide(): Projet {
  const actuels = [1, 2, 3].map((i) => ({ ...immeubleVide(i), id: `imm${i}` }));
  return {
    version: 1,
    profil: {
      age: null,
      revenuEmploi: null,
      autresRevenus: null,
      besoinMensuelNet: null,
      gestion: 'soi',
      gestionPct: null,
    },
    actuels,
    vise: {
      prix: null,
      nbLogements: null,
      loyerMoyen: null,
      autresRevenusMensuels: null,
      miseDeFonds: null,
      taux: null,
      amortissement: null,
      schl: false,
      primeSchlPct: null,
      taxesMunicipales: null,
      taxesScolaires: null,
      assurances: null,
      entretienMode: 'pct',
      entretienPct: null,
      entretienParPorte: null,
      deneigement: null,
      energie: null,
      conciergerie: null,
      autres: null,
      gestionPct: null,
      inoccupationPct: null,
      fraisNotaire: null,
      droitsMutation: null,
      fraisInspection: null,
      fraisEvaluation: null,
      fraisEnvironnement: null,
      fraisAutres: null,
    },
    marche: { hausseLoyers: null, hausseDepenses: null, appreciation: null, loyerMedianLocal: null },
    fiscal: {
      tauxInclusion: null,
      detention: 'personnelle',
      tauxMarginalManuel: null,
      reclamerDpa: false,
      partBatimentPct: null,
      tauxDpa: null,
    },
    scenarioC: {
      refinances: ['imm1', 'imm2'],
      rpvMax: null,
      tauxRefi: null,
      amortissementRefi: null,
      fraisRefi: null,
    },
    scenarioD: { mode: 'etalement', nbAnnees: null, pctEncaisse: null, revenuAnneesSuivantes: null },
  };
}

/**
 * Jeu de données d'exemple FICTIF : 3 immeubles de 3 logements à 700 $/mois
 * (valeur totale 1 000 000 $) vs un immeuble récent de 11 logements à 1 000 $/mois
 * pour 1 000 000 $, mise de fonds 500 000 $.
 */
export function projetExemple(): Projet {
  const p = projetVide();
  p.profil = {
    age: 48,
    revenuEmploi: 75_000,
    autresRevenus: 0,
    besoinMensuelNet: 4_000,
    gestion: 'soi',
    gestionPct: null,
  };
  const donnees = [
    { nom: 'Triplex rue Notre-Dame (exemple)', valeur: 330_000, achat: 180_000, annee: 2010, renos: 30_000, dpa: 40_000, solde: 90_000, taux: 0.045, amort: 15, renouv: '2027-06' },
    { nom: 'Triplex rue Saint-Jean (exemple)', valeur: 330_000, achat: 220_000, annee: 2014, renos: 20_000, dpa: 25_000, solde: 140_000, taux: 0.05, amort: 20, renouv: '2028-03' },
    { nom: 'Triplex boul. des Bois-Francs (exemple)', valeur: 340_000, achat: 260_000, annee: 2018, renos: 10_000, dpa: 10_000, solde: 190_000, taux: 0.052, amort: 22, renouv: '2027-11' },
  ];
  p.actuels = p.actuels.map((imm, i) => {
    const d = donnees[i];
    return {
      ...imm,
      nom: d.nom,
      nbLogements: 3,
      loyerMoyen: 700,
      valeurMarchande: d.valeur,
      prixAchat: d.achat,
      anneeAchat: d.annee,
      renovations: d.renos,
      dpaDeduite: d.dpa,
      soldeHypothecaire: d.solde,
      tauxHypothecaire: d.taux,
      amortissementRestant: d.amort,
      dateRenouvellement: d.renouv,
    };
  });
  p.vise = {
    ...p.vise,
    prix: 1_000_000,
    nbLogements: 11,
    loyerMoyen: 1_000,
    miseDeFonds: 500_000,
    taux: 0.0475,
    amortissement: 25,
  };
  return p;
}
