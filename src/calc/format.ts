const fmtArgent2 = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtArgent0 = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format monétaire québécois : « 1 234,56 $ ». */
export function argent(n: number, decimales = false): string {
  if (!Number.isFinite(n)) return '—';
  return (decimales ? fmtArgent2 : fmtArgent0).format(n);
}

/** Pourcentage : 0,05 → « 5,0 % ». */
export function pct(n: number, decimales = 1): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-CA', {
    style: 'percent',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}

export function nombre(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-CA', { maximumFractionDigits: decimales }).format(n);
}

export function ratio(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return nombre(n, 2);
}

/**
 * Lit un nombre saisi à la française (« 1 234,56 », « 5 % », « 700 $ »).
 * Retourne null si vide, NaN si invalide.
 */
export function lireNombre(texte: string): number | null {
  const t = texte.replace(/[\s  $%]/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
