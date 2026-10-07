import { immeubleVide, projetVide } from './projets';
import type { Projet } from './types';

const CLE = 'simulateur-immobilier:projet:v1';

/** Garde les clés du gabarit; un champ numérique invalide devient vide (null). */
function nettoyer<T extends object>(gabarit: T, brut: unknown): T {
  if (!brut || typeof brut !== 'object') return gabarit;
  const src = brut as Record<string, unknown>;
  const out = { ...gabarit } as Record<string, unknown>;
  for (const [k, defaut] of Object.entries(gabarit)) {
    if (!(k in src)) continue;
    const v = src[k];
    if (defaut === null || typeof defaut === 'number') {
      out[k] = typeof v === 'number' && Number.isFinite(v) ? v : null;
    } else if (typeof defaut === 'string') {
      out[k] = typeof v === 'string' ? v : defaut;
    } else if (typeof defaut === 'boolean') {
      out[k] = typeof v === 'boolean' ? v : defaut;
    } else if (Array.isArray(defaut)) {
      out[k] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : defaut;
    }
  }
  return out as T;
}

/** Valide et complète un projet importé (JSON) ou relu du stockage local. */
export function normaliserProjet(brut: unknown): Projet {
  const vide = projetVide();
  if (!brut || typeof brut !== 'object') throw new Error('Fichier invalide.');
  const b = brut as Record<string, unknown>;
  const actuelsBruts = Array.isArray(b.actuels) ? b.actuels : null;
  if (!actuelsBruts || !b.vise || !b.profil) throw new Error("Ce fichier ne semble pas provenir du simulateur.");
  const p: Projet = {
    version: 1,
    profil: nettoyer(vide.profil, b.profil),
    actuels: actuelsBruts.slice(0, 8).map((a, i) => nettoyer(immeubleVide(i + 1), a)),
    vise: nettoyer(vide.vise, b.vise),
    marche: nettoyer(vide.marche, b.marche),
    fiscal: nettoyer(vide.fiscal, b.fiscal),
    scenarioC: nettoyer(vide.scenarioC, b.scenarioC),
    scenarioD: nettoyer(vide.scenarioD, b.scenarioD),
  };
  if (p.profil.gestion !== 'soi' && p.profil.gestion !== 'gestionnaire') p.profil.gestion = 'soi';
  if (p.fiscal.detention !== 'personnelle' && p.fiscal.detention !== 'societe') p.fiscal.detention = 'personnelle';
  if (p.vise.entretienMode !== 'pct' && p.vise.entretienMode !== 'porte') p.vise.entretienMode = 'pct';
  if (p.scenarioD.mode !== 'etalement' && p.scenarioD.mode !== 'reserve') p.scenarioD.mode = 'etalement';
  return p;
}

export function chargerProjet(): Projet | null {
  try {
    const t = localStorage.getItem(CLE);
    return t ? normaliserProjet(JSON.parse(t)) : null;
  } catch {
    return null;
  }
}

export function sauvegarderProjet(p: Projet): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* stockage indisponible (navigation privée, etc.) : on continue sans sauvegarde */
  }
}

export function exporterJson(p: Projet): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulation-immobiliere-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importerJson(fichier: File): Promise<Projet> {
  const texte = await fichier.text();
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }
  return normaliserProjet(brut);
}
