import { HYPOTHESES as H } from '../config/hypotheses';
import { resoudre } from '../model/defaults';
import type { Projet, ProjetResolu } from '../model/types';
import { argent, pct, ratio } from './format';
import { calculerScenario, calculerScenarios, IDS_SCENARIOS, type IdScenario, type ResultatScenario } from './scenarios';

// ---------------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------------

export interface Alerte {
  niveau: 'danger' | 'attention' | 'info';
  texte: string;
  scenario?: IdScenario;
}

export function alertes(projet: Projet, p: ProjetResolu, resultats: ResultatScenario[]): Alerte[] {
  const out: Alerte[] = [];
  const v = p.vise;
  const prixParPorte = v.nbLogements > 0 ? v.prix / v.nbLogements : NaN;
  if (prixParPorte < H.alertes.prixParPorteMinRecent) {
    out.push({
      niveau: 'attention',
      texte: `Prix par logement de l'immeuble visé : ${argent(prixParPorte)}. Ce prix par logement paraît bas pour du neuf ou du récent dans la région; valide avec un courtier ou des données de ventes comparables (SCHL, courtiers commerciaux locaux).`,
    });
  }
  if (v.loyerMoyen > p.marche.loyerMedianLocal * (1 + H.alertes.ecartLoyerMedian)) {
    out.push({
      niveau: 'attention',
      texte: `Le loyer visé (${argent(v.loyerMoyen)}) dépasse nettement le loyer médian de référence du marché local (${argent(p.marche.loyerMedianLocal)}). Vérifie que des logements comparables se louent réellement à ce prix.`,
    });
  }
  projet.actuels.forEach((a) => {
    if (a.prixAchat === null) {
      out.push({
        niveau: 'attention',
        texte: `« ${a.nom} » : prix d'achat non saisi. Le gain en capital est estimé avec une hypothèse (${pct(H.defauts.actuel.ratioPrixAchat, 0)} de la valeur actuelle), ce qui change beaucoup l'impôt.`,
      });
    }
    if (a.soldeHypothecaire === null) {
      out.push({ niveau: 'info', texte: `« ${a.nom} » : solde hypothécaire non saisi (0 $ supposé).` });
    }
  });

  for (const r of resultats) {
    const s = r.id;
    if (r.an1.fluxApresImpot < 0) {
      out.push({ niveau: 'danger', scenario: s, texte: `Flux net après impôt négatif (${argent(r.verdict.flux)}/mois) : il faudrait ajouter de l'argent chaque mois.` });
    }
    if (r.indicateurs.rcd < H.alertes.rcdMinimum) {
      out.push({ niveau: 'danger', scenario: s, texte: `Ratio de couverture de la dette faible (${ratio(r.indicateurs.rcd)}) : sous ${ratio(H.alertes.rcdMinimum)}, le RNE couvre à peine les paiements.` });
    }
    if (r.surplus !== undefined && r.surplus < 0) {
      out.push({
        niveau: 'danger',
        scenario: s,
        texte: `Le capital disponible (${argent(r.capitalDisponible ?? 0)}) ne couvre pas la mise de fonds + frais d'acquisition (${argent(r.capitalRequis ?? 0)}) : manque de ${argent(-r.surplus)}.`,
      });
    }
    if (r.vente && r.vente.imposition.revenuAjoute > H.fiscal.seuilAlerteImpotMinimum && p.fiscal.detention === 'personnelle') {
      out.push({ niveau: 'info', scenario: s, texte: "Revenu imposable élevé l'année de la vente : l'impôt minimum de remplacement (IMR) pourrait s'appliquer. À valider avec un fiscaliste." });
    }
    if (r.refinancements) {
      for (const rf of r.refinancements) {
        if (!rf.possible) {
          out.push({ niveau: 'attention', scenario: s, texte: `« ${rf.nom} » : un prêt à ${pct(p.scenarioC.rpvMax, 0)} de la valeur ne dégage aucune liquidité (solde trop élevé). Immeuble non refinancé.` });
        } else if (rf.rcd < H.financement.conventionnel.rcdMin) {
          out.push({ niveau: 'attention', scenario: s, texte: `« ${rf.nom} » : après refinancement, RCD de ${ratio(rf.rcd)}, sous le seuil habituel des prêteurs (${ratio(H.financement.conventionnel.rcdMin)}). Le prêt pourrait être refusé ou réduit.` });
        }
      }
    }
    if (r.etalement?.mode === 'reserve' && r.etalement.liquiditesAnnee1 < 0) {
      out.push({ niveau: 'danger', scenario: s, texte: "Avec la réserve, le comptant reçu à la vente ne suffit pas à rembourser les hypothèques et l'impôt de l'an 1." });
    }
    if (s === 'D' && p.fiscal.detention === 'societe') {
      out.push({ niveau: 'info', scenario: s, texte: "En société, l'impôt sur le revenu de placement est à taux fixe : l'étalement procure peu ou pas d'économie dans ce modèle." });
    }
  }

  // Financement de l'immeuble visé (commun à B, C, D)
  const fin = resultats.find((r) => r.financement)?.financement;
  if (fin) {
    if (fin.rcd < fin.rcdMin) {
      out.push({ niveau: 'attention', texte: `RCD de l'immeuble visé : ${ratio(fin.rcd)}, sous le seuil de financement habituel (${ratio(fin.rcdMin)}${v.schl ? ', SCHL' : ', conventionnel'}). Le prêteur pourrait exiger une mise de fonds plus élevée.` });
    }
    if (fin.rpv > fin.rpvMax + 1e-9) {
      out.push({ niveau: 'attention', texte: `Ratio prêt/valeur de ${pct(fin.rpv)} : au-delà du maximum habituel (${pct(fin.rpvMax, 0)}) pour ce type de financement.` });
    }
    if (v.amortissement > fin.amortissementMax) {
      out.push({ niveau: 'attention', texte: `Amortissement de ${v.amortissement} ans : au-delà du maximum habituel (${fin.amortissementMax} ans) pour ce type de financement.` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Analyse de sensibilité
// ---------------------------------------------------------------------------

export interface Variation {
  id: string;
  groupe: string;
  libelle: string;
  appliquer: (p: ProjetResolu) => void;
}

function tousLesTaux(delta: number) {
  return (p: ProjetResolu) => {
    p.vise.taux += delta;
    p.scenarioC.tauxRefi += delta;
    p.actuels.forEach((a) => (a.tauxHypothecaire += delta));
  };
}
function tousLesLoyers(f: number) {
  return (p: ProjetResolu) => {
    p.vise.loyerMoyen *= f;
    p.actuels.forEach((a) => (a.loyerMoyen *= f));
  };
}
function inoccupation(x: number) {
  return (p: ProjetResolu) => {
    p.vise.inoccupationPct = x;
    p.actuels.forEach((a) => (a.inoccupationPct = x));
  };
}

export const VARIATIONS: Variation[] = [
  { id: 'base', groupe: 'Base', libelle: 'Hypothèses saisies', appliquer: () => {} },
  { id: 't-1', groupe: "Taux d'intérêt", libelle: 'Taux −1 %', appliquer: tousLesTaux(-0.01) },
  { id: 't+1', groupe: "Taux d'intérêt", libelle: 'Taux +1 %', appliquer: tousLesTaux(0.01) },
  { id: 't+2', groupe: "Taux d'intérêt", libelle: 'Taux +2 %', appliquer: tousLesTaux(0.02) },
  { id: 'l-10', groupe: 'Loyers', libelle: 'Loyers −10 %', appliquer: tousLesLoyers(0.9) },
  { id: 'l-5', groupe: 'Loyers', libelle: 'Loyers −5 %', appliquer: tousLesLoyers(0.95) },
  { id: 'l+5', groupe: 'Loyers', libelle: 'Loyers +5 %', appliquer: tousLesLoyers(1.05) },
  { id: 'l+10', groupe: 'Loyers', libelle: 'Loyers +10 %', appliquer: tousLesLoyers(1.1) },
  { id: 'i3', groupe: 'Inoccupation', libelle: 'Inoccupation 3 %', appliquer: inoccupation(0.03) },
  { id: 'i5', groupe: 'Inoccupation', libelle: 'Inoccupation 5 %', appliquer: inoccupation(0.05) },
  { id: 'i8', groupe: 'Inoccupation', libelle: 'Inoccupation 8 %', appliquer: inoccupation(0.08) },
  { id: 'p+5', groupe: "Prix d'achat", libelle: 'Prix du récent +5 %', appliquer: (p) => (p.vise.prix *= 1.05) },
  { id: 'p+10', groupe: "Prix d'achat", libelle: 'Prix du récent +10 %', appliquer: (p) => (p.vise.prix *= 1.1) },
];

export interface LigneSensibilite {
  variation: Variation;
  flux: Record<IdScenario, number>;
  rcdVise: number;
}

export function sensibilite(p: ProjetResolu): LigneSensibilite[] {
  return VARIATIONS.map((variation) => {
    const q = structuredClone(p);
    variation.appliquer(q);
    const res = calculerScenarios(q);
    const flux = Object.fromEntries(res.map((r) => [r.id, r.verdict.flux])) as Record<IdScenario, number>;
    return { variation, flux, rcdVise: res.find((r) => r.financement)?.financement?.rcd ?? NaN };
  });
}

// ---------------------------------------------------------------------------
// Seuil d'équilibre : loyer moyen minimal pour atteindre le revenu net souhaité
// ---------------------------------------------------------------------------

export interface Equilibre {
  id: IdScenario;
  /** Loyer moyen requis (null si inatteignable sous le plafond testé). */
  loyerRequis: number | null;
  loyerActuel: number;
  portee: string;
}

function loyerMoyenPondere(p: ProjetResolu): number {
  const nb = p.actuels.reduce((s, a) => s + a.nbLogements, 0);
  return nb > 0 ? p.actuels.reduce((s, a) => s + a.nbLogements * a.loyerMoyen, 0) / nb : 0;
}

export function seuilEquilibre(p: ProjetResolu, id: IdScenario): Equilibre {
  const besoin = p.profil.besoinMensuelNet;
  const surActuels = id === 'A';
  const loyerActuel = surActuels ? loyerMoyenPondere(p) : p.vise.loyerMoyen;
  const portee = surActuels ? 'loyer moyen des immeubles actuels' : "loyer moyen de l'immeuble récent";
  const fluxPour = (loyer: number) => {
    const q = structuredClone(p);
    if (surActuels) {
      const f = loyerActuel > 0 ? loyer / loyerActuel : 0;
      q.actuels.forEach((a) => (a.loyerMoyen = loyerActuel > 0 ? a.loyerMoyen * f : loyer));
    } else {
      q.vise.loyerMoyen = loyer;
    }
    return calculerScenario(q, id).verdict.flux;
  };
  let bas = 0;
  let haut = 6_000;
  if (fluxPour(haut) < besoin) return { id, loyerRequis: null, loyerActuel, portee };
  if (fluxPour(bas) >= besoin) return { id, loyerRequis: 0, loyerActuel, portee };
  for (let i = 0; i < 40; i++) {
    const m = (bas + haut) / 2;
    if (fluxPour(m) >= besoin) haut = m;
    else bas = m;
  }
  return { id, loyerRequis: haut, loyerActuel, portee };
}

// ---------------------------------------------------------------------------
// Point d'entrée unique
// ---------------------------------------------------------------------------

export interface Analyse {
  resolu: ProjetResolu;
  resultats: ResultatScenario[];
  alertes: Alerte[];
  sensibilite: LigneSensibilite[];
  equilibres: Equilibre[];
}

export function analyser(projet: Projet): Analyse {
  const resolu = resoudre(projet);
  const resultats = calculerScenarios(resolu);
  return {
    resolu,
    resultats,
    alertes: alertes(projet, resolu, resultats),
    sensibilite: sensibilite(resolu),
    equilibres: IDS_SCENARIOS.map((id) => seuilEquilibre(resolu, id)),
  };
}
