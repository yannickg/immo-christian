import { HYPOTHESES as H } from '../config/hypotheses';
import { droitsMutation, taxeScolaire } from '../calc/fiscal';
import type {
  Fiscal,
  FiscalR,
  ImmeubleActuel,
  ImmeubleActuelR,
  ImmeubleVise,
  ImmeubleViseR,
  Marche,
  MarcheR,
  Profil,
  ProfilR,
  Projet,
  ProjetResolu,
  Resolu,
  ScenarioC,
  ScenarioCR,
  ScenarioD,
  ScenarioDR,
} from './types';

export type Defauts = Record<string, number>;

/** Remplace chaque champ vide (null) par sa valeur par défaut. */
function fusion<T extends object>(saisi: T, defauts: Defauts): Resolu<T> {
  const r = { ...saisi } as Record<string, unknown>;
  for (const [k, v] of Object.entries(defauts)) {
    if (r[k] === null || r[k] === undefined) r[k] = v;
  }
  return r as Resolu<T>;
}

export function pctGestion(profil: ProfilR): number {
  return profil.gestion === 'gestionnaire' ? profil.gestionPct : 0;
}

export function defautsProfil(): Defauts {
  return { ...H.defauts.profil };
}

export function resoudreProfil(p: Profil): ProfilR {
  return fusion(p, defautsProfil());
}

export function defautsActuel(imm: ImmeubleActuel, profil: ProfilR): Defauts {
  const d = H.defauts.actuel;
  const nb = imm.nbLogements ?? d.nbLogements;
  const loyer = imm.loyerMoyen ?? d.loyerMoyen;
  const valeur = imm.valeurMarchande ?? nb * d.valeurParPorte;
  const solde = imm.soldeHypothecaire ?? 0;
  const taux = imm.tauxHypothecaire ?? d.tauxHypothecaire;
  const inocc = imm.inoccupationPct ?? d.inoccupationPct;
  const revenusEffectifs = nb * loyer * 12 * (1 - inocc);
  return {
    nbLogements: nb,
    loyerMoyen: loyer,
    valeurMarchande: valeur,
    prixAchat: valeur * d.ratioPrixAchat,
    anneeAchat: d.anneeAchat,
    renovations: 0,
    dpaDeduite: 0,
    soldeHypothecaire: 0,
    tauxHypothecaire: taux,
    amortissementRestant: d.amortissementRestant,
    fraisCourtagePct: d.fraisCourtagePct,
    fraisNotaireVente: d.fraisNotaireVente,
    penaliteHypothecaire: (solde * taux * d.moisPenalite) / 12,
    taxesMunicipales: valeur * H.marche.tauxTaxesMunicipales,
    taxesScolaires: taxeScolaire(valeur),
    assurances: nb * d.assuranceParPorte,
    entretien: nb * d.entretienParPorte,
    deneigement: nb * d.deneigementParPorte,
    energie: nb * d.energieParPorte,
    conciergerie: 0,
    gestion: revenusEffectifs * pctGestion(profil),
    autres: nb * d.autresParPorte,
    inoccupationPct: inocc,
  };
}

export function resoudreActuel(imm: ImmeubleActuel, profil: ProfilR): ImmeubleActuelR {
  const { gestion: _ignore, ...def } = defautsActuel(imm, profil);
  const { gestion, ...saisi } = imm;
  return { ...fusion(saisi, def), gestionFixe: gestion, gestionPct: pctGestion(profil) };
}

export function defautsVise(v: ImmeubleVise, profil: ProfilR): Defauts {
  const d = H.defauts.vise;
  const prix = v.prix ?? d.prix;
  const nb = v.nbLogements ?? d.nbLogements;
  return {
    prix,
    nbLogements: nb,
    loyerMoyen: d.loyerMoyen,
    autresRevenusMensuels: 0,
    miseDeFonds: prix * d.ratioMiseDeFonds,
    taux: d.taux,
    amortissement: d.amortissement,
    primeSchlPct: H.financement.schl.primeDefaut,
    taxesMunicipales: prix * H.marche.tauxTaxesMunicipales,
    taxesScolaires: taxeScolaire(prix),
    assurances: nb * d.assuranceParPorte,
    entretienPct: d.entretienPct,
    entretienParPorte: d.entretienParPorte,
    deneigement: nb * d.deneigementParPorte,
    energie: nb * d.energieParPorte,
    conciergerie: 0,
    autres: nb * d.autresParPorte,
    gestionPct: pctGestion(profil),
    inoccupationPct: d.inoccupationPct,
    fraisNotaire: d.fraisNotaire,
    droitsMutation: droitsMutation(prix),
    fraisInspection: d.fraisInspection,
    fraisEvaluation: d.fraisEvaluation,
    fraisEnvironnement: d.fraisEnvironnement,
    fraisAutres: d.fraisAutres,
  };
}

export function resoudreVise(v: ImmeubleVise, profil: ProfilR): ImmeubleViseR {
  return fusion(v, defautsVise(v, profil));
}

export function defautsMarche(): Defauts {
  const m = H.marche;
  return {
    hausseLoyers: m.hausseLoyers,
    hausseDepenses: m.hausseDepenses,
    appreciation: m.appreciation,
    loyerMedianLocal: m.loyerMedianLocal,
  };
}

export function resoudreMarche(m: Marche): MarcheR {
  return fusion(m, defautsMarche());
}

/** Le taux marginal manuel n'a pas de valeur par défaut : vide = calcul par paliers. */
export function defautsFiscal(): Defauts {
  return {
    tauxInclusion: H.fiscal.tauxInclusionGainCapital,
    partBatimentPct: H.fiscal.partBatimentDefaut,
    tauxDpa: H.fiscal.tauxDpaDefaut,
  };
}

export function resoudreFiscal(f: Fiscal): FiscalR {
  return fusion(f, defautsFiscal()) as FiscalR;
}

export function defautsScenarioC(): Defauts {
  return { ...H.defauts.scenarioC };
}

export function resoudreScenarioC(c: ScenarioC, actuels: ImmeubleActuel[]): ScenarioCR {
  const ids = new Set(actuels.map((a) => a.id));
  return { ...fusion(c, defautsScenarioC()), refinances: c.refinances.filter((id) => ids.has(id)) };
}

export function defautsScenarioD(d: ScenarioD, profil: ProfilR): Defauts {
  const c = H.defauts.scenarioD;
  return {
    nbAnnees: d.mode === 'reserve' ? c.nbAnneesReserve : c.nbAnneesEtalement,
    pctEncaisse: c.pctEncaisse,
    revenuAnneesSuivantes: profil.revenuEmploi + profil.autresRevenus,
  };
}

export function resoudreScenarioD(d: ScenarioD, profil: ProfilR): ScenarioDR {
  const r = fusion(d, defautsScenarioD(d, profil));
  const max = d.mode === 'reserve' ? 5 : 3;
  return {
    ...r,
    nbAnnees: Math.min(max, Math.max(1, Math.round(r.nbAnnees))),
    pctEncaisse: Math.min(1, Math.max(0, r.pctEncaisse)),
  };
}

export function resoudre(p: Projet): ProjetResolu {
  const profil = resoudreProfil(p.profil);
  return {
    profil,
    actuels: p.actuels.map((a) => resoudreActuel(a, profil)),
    vise: resoudreVise(p.vise, profil),
    marche: resoudreMarche(p.marche),
    fiscal: resoudreFiscal(p.fiscal),
    scenarioC: resoudreScenarioC(p.scenarioC, p.actuels),
    scenarioD: resoudreScenarioD(p.scenarioD, profil),
  };
}
