/**
 * Hypothèque canadienne : le taux affiché est composé semestriellement
 * (Loi sur l'intérêt), mais les paiements sont mensuels.
 */
export interface Pret {
  capital: number;
  /** Taux annuel nominal composé semestriellement (0,05 = 5 %). */
  taux: number;
  amortissementAns: number;
}

/** Taux mensuel équivalent : (1 + i/2)^(2/12) − 1. */
export function tauxMensuelEquivalent(tauxAnnuel: number): number {
  return Math.pow(1 + tauxAnnuel / 2, 1 / 6) - 1;
}

function nbMois(amortissementAns: number): number {
  return Math.max(0, Math.round(amortissementAns * 12));
}

/** Paiement mensuel constant (capital + intérêts). */
export function paiementMensuel(capital: number, tauxAnnuel: number, amortissementAns: number): number {
  const n = nbMois(amortissementAns);
  if (capital <= 0 || n === 0) return 0;
  const r = tauxMensuelEquivalent(tauxAnnuel);
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

/** Solde restant après un certain nombre de paiements mensuels. */
export function soldeApres(pret: Pret, mois: number): number {
  const n = nbMois(pret.amortissementAns);
  if (pret.capital <= 0 || n === 0) return 0;
  if (mois >= n) return 0;
  const r = tauxMensuelEquivalent(pret.taux);
  const pmt = paiementMensuel(pret.capital, pret.taux, pret.amortissementAns);
  if (r === 0) return Math.max(0, pret.capital - pmt * mois);
  const f = Math.pow(1 + r, mois);
  return Math.max(0, pret.capital * f - (pmt * (f - 1)) / r);
}

export interface AnneePret {
  paiements: number;
  interets: number;
  capitalRembourse: number;
  soldeDebut: number;
  soldeFin: number;
}

/** Totaux d'une année d'amortissement (année 1 = 12 premiers mois). */
export function anneePret(pret: Pret | null, annee: number): AnneePret {
  if (!pret || pret.capital <= 0) {
    return { paiements: 0, interets: 0, capitalRembourse: 0, soldeDebut: 0, soldeFin: 0 };
  }
  const n = nbMois(pret.amortissementAns);
  const debut = (annee - 1) * 12;
  const fin = Math.min(annee * 12, n);
  const moisPayes = Math.max(0, fin - debut);
  const pmt = paiementMensuel(pret.capital, pret.taux, pret.amortissementAns);
  const soldeDebut = soldeApres(pret, debut);
  const soldeFin = soldeApres(pret, Math.max(debut, fin));
  const paiements = pmt * moisPayes;
  const capitalRembourse = soldeDebut - soldeFin;
  return { paiements, interets: paiements - capitalRembourse, capitalRembourse, soldeDebut, soldeFin };
}
