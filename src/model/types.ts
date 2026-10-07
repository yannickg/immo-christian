/** Un champ numérique laissé vide (null) prend sa valeur par défaut. */
export type Nombre = number | null;

/** Convention : tous les pourcentages sont stockés en décimales (0,05 = 5 %). */

export interface Profil {
  age: Nombre;
  revenuEmploi: Nombre;
  autresRevenus: Nombre;
  besoinMensuelNet: Nombre;
  gestion: 'soi' | 'gestionnaire';
  gestionPct: Nombre;
}

export interface ImmeubleActuel {
  id: string;
  nom: string;
  nbLogements: Nombre;
  loyerMoyen: Nombre;
  valeurMarchande: Nombre;
  prixAchat: Nombre;
  anneeAchat: Nombre;
  renovations: Nombre;
  dpaDeduite: Nombre;
  soldeHypothecaire: Nombre;
  tauxHypothecaire: Nombre;
  amortissementRestant: Nombre;
  dateRenouvellement: string;
  fraisCourtagePct: Nombre;
  fraisNotaireVente: Nombre;
  penaliteHypothecaire: Nombre;
  taxesMunicipales: Nombre;
  taxesScolaires: Nombre;
  assurances: Nombre;
  entretien: Nombre;
  deneigement: Nombre;
  energie: Nombre;
  conciergerie: Nombre;
  /** Montant annuel; vide = % du profil appliqué aux loyers perçus. */
  gestion: Nombre;
  autres: Nombre;
  inoccupationPct: Nombre;
}

export interface ImmeubleVise {
  prix: Nombre;
  nbLogements: Nombre;
  loyerMoyen: Nombre;
  autresRevenusMensuels: Nombre;
  miseDeFonds: Nombre;
  taux: Nombre;
  amortissement: Nombre;
  schl: boolean;
  primeSchlPct: Nombre;
  taxesMunicipales: Nombre;
  taxesScolaires: Nombre;
  assurances: Nombre;
  entretienMode: 'pct' | 'porte';
  entretienPct: Nombre;
  entretienParPorte: Nombre;
  deneigement: Nombre;
  energie: Nombre;
  conciergerie: Nombre;
  autres: Nombre;
  gestionPct: Nombre;
  inoccupationPct: Nombre;
  fraisNotaire: Nombre;
  droitsMutation: Nombre;
  fraisInspection: Nombre;
  fraisEvaluation: Nombre;
  fraisEnvironnement: Nombre;
  fraisAutres: Nombre;
}

export interface Marche {
  hausseLoyers: Nombre;
  hausseDepenses: Nombre;
  appreciation: Nombre;
  loyerMedianLocal: Nombre;
}

export interface Fiscal {
  tauxInclusion: Nombre;
  detention: 'personnelle' | 'societe';
  /** Si saisi, remplace le calcul par paliers (taux fixe appliqué au revenu ajouté). */
  tauxMarginalManuel: Nombre;
  reclamerDpa: boolean;
  partBatimentPct: Nombre;
  tauxDpa: Nombre;
}

export interface ScenarioC {
  refinances: string[];
  rpvMax: Nombre;
  tauxRefi: Nombre;
  amortissementRefi: Nombre;
  fraisRefi: Nombre;
}

export interface ScenarioD {
  mode: 'etalement' | 'reserve';
  nbAnnees: Nombre;
  pctEncaisse: Nombre;
  revenuAnneesSuivantes: Nombre;
}

export interface Projet {
  version: 1;
  profil: Profil;
  actuels: ImmeubleActuel[];
  vise: ImmeubleVise;
  marche: Marche;
  fiscal: Fiscal;
  scenarioC: ScenarioC;
  scenarioD: ScenarioD;
}

/** Version « résolue » : chaque champ vide est remplacé par sa valeur par défaut. */
export type Resolu<T> = { [K in keyof T]: T[K] extends Nombre ? number : T[K] };

/** Clés numériques d'un objet (pour générer les formulaires). */
export type CleNombre<T> = { [K in keyof T]: T[K] extends Nombre ? K : never }[keyof T];

export type ProfilR = Resolu<Profil>;
export type ImmeubleActuelR = Omit<Resolu<ImmeubleActuel>, 'gestion'> & {
  gestionFixe: number | null;
  gestionPct: number;
};
export type ImmeubleViseR = Resolu<ImmeubleVise>;
export type MarcheR = Resolu<Marche>;
export type FiscalR = Omit<Resolu<Fiscal>, 'tauxMarginalManuel'> & { tauxMarginalManuel: number | null };
export type ScenarioCR = Resolu<ScenarioC>;
export type ScenarioDR = Resolu<ScenarioD>;

export interface ProjetResolu {
  profil: ProfilR;
  actuels: ImmeubleActuelR[];
  vise: ImmeubleViseR;
  marche: MarcheR;
  fiscal: FiscalR;
  scenarioC: ScenarioCR;
  scenarioD: ScenarioDR;
}
