import { HYPOTHESES as H } from '../config/hypotheses';
import { argent, pct } from '../calc/format';
import { tauxMarginal } from '../calc/fiscal';
import {
  defautsActuel,
  defautsFiscal,
  defautsMarche,
  defautsProfil,
  defautsScenarioC,
  defautsScenarioD,
  defautsVise,
  resoudreProfil,
} from '../model/defaults';
import { immeubleVide } from '../model/projets';
import type { CleNombre, ImmeubleActuel, ImmeubleVise, Nombre, Projet } from '../model/types';
import { ChampCase, ChampChoix, ChampNombre, ChampsNombres, ChampTexte, Groupe, type DefChamp } from './Champs';

interface PropsEtape {
  projet: Projet;
  onChange: (p: Projet) => void;
}

const NOTE_DEFAUTS = 'Laisse un champ vide pour utiliser la valeur par défaut affichée en gris.';

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export function EtapeProfil({ projet, onChange }: PropsEtape) {
  const p = projet.profil;
  const d = defautsProfil();
  const set = (patch: Partial<typeof p>) => onChange({ ...projet, profil: { ...p, ...patch } });
  return (
    <section aria-labelledby="t-profil">
      <h2 id="t-profil">Profil</h2>
      <p className="intro">{NOTE_DEFAUTS}</p>
      <Groupe titre="Toi">
        <ChampNombre label="Âge" unite="ans" valeur={p.age} defaut={d.age} onChange={(v) => set({ age: v })} />
        <ChampNombre
          label="Revenu d'emploi annuel actuel"
          unite="$/an"
          valeur={p.revenuEmploi}
          defaut={d.revenuEmploi}
          onChange={(v) => set({ revenuEmploi: v })}
          aide="Revenu brut d'emploi. Il s'ajoute au gain l'année de la vente, ce qui augmente l'impôt sur la vente."
        />
        <ChampNombre
          label="Autres revenus annuels"
          unite="$/an"
          valeur={p.autresRevenus}
          defaut={d.autresRevenus}
          onChange={(v) => set({ autresRevenus: v })}
          aide="Revenus qui continueraient une fois que tu cesses de travailler (pension, placements, conjoint non inclus). Sert de base pour l'impôt sur les loyers."
        />
        <ChampNombre
          label="Revenu mensuel net souhaité pour cesser de travailler"
          unite="$/mois"
          valeur={p.besoinMensuelNet}
          defaut={d.besoinMensuelNet}
          onChange={(v) => set({ besoinMensuelNet: v })}
          aide="Montant net d'impôt dont tu as besoin chaque mois pour vivre. C'est la cible du verdict."
        />
      </Groupe>
      <Groupe titre="Gestion des immeubles">
        <ChampChoix
          label="Qui gère?"
          valeur={p.gestion}
          options={[
            { valeur: 'soi', libelle: 'Moi-même (autogestion)' },
            { valeur: 'gestionnaire', libelle: 'Un gestionnaire' },
          ]}
          onChange={(v) => set({ gestion: v })}
          aide="En autogestion, aucun frais n'est compté, mais ton temps a une valeur. Les prêteurs imputent souvent des frais de gestion de 4 à 5 % même en autogestion."
        />
        {p.gestion === 'gestionnaire' && (
          <ChampNombre
            label="Frais de gestion (% des loyers perçus)"
            unite="%"
            valeur={p.gestionPct}
            defaut={d.gestionPct}
            onChange={(v) => set({ gestionPct: v })}
          />
        )}
      </Groupe>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Immeubles actuels
// ---------------------------------------------------------------------------

type CleActuel = CleNombre<ImmeubleActuel>;

const SECTIONS_ACTUEL: { titre: string; defs: DefChamp<CleActuel>[] }[] = [
  {
    titre: 'Logements et revenus',
    defs: [
      { cle: 'nbLogements', label: 'Nombre de logements', unite: 'log.' },
      { cle: 'loyerMoyen', label: 'Loyer mensuel moyen par logement', unite: '$/mois' },
      { cle: 'inoccupationPct', label: "Taux d'inoccupation", unite: '%', aide: 'Part des loyers perdue en logements vides ou mauvaises créances.' },
    ],
  },
  {
    titre: 'Valeur et fiscalité',
    defs: [
      { cle: 'valeurMarchande', label: 'Valeur marchande estimée', aide: 'Prix de vente réaliste aujourd\'hui. Idéalement une évaluation de courtier, pas l\'évaluation municipale.' },
      { cle: 'prixAchat', label: "Prix d'achat", aide: "Prix payé à l'achat. Essentiel pour calculer le gain en capital. Si vide, une hypothèse prudente est utilisée et une alerte s'affiche." },
      { cle: 'anneeAchat', label: "Année d'achat", unite: '' },
      { cle: 'renovations', label: 'Rénovations majeures capitalisées', aide: 'Travaux qui ont été ajoutés au coût de l\'immeuble (pas les réparations déduites en dépenses). Ils réduisent le gain en capital.' },
      { cle: 'dpaDeduite', label: 'Amortissement fiscal (DPA) déjà déduit', aide: 'Total de la déduction pour amortissement réclamée au fil des ans. À la vente, ce montant redevient imposable à 100 % (récupération). Ton comptable l\'a dans tes déclarations (formulaire T776 / TP-128).' },
    ],
  },
  {
    titre: 'Hypothèque',
    defs: [
      { cle: 'soldeHypothecaire', label: 'Solde hypothécaire' },
      { cle: 'tauxHypothecaire', label: "Taux d'intérêt", unite: '%' },
      { cle: 'amortissementRestant', label: 'Amortissement restant', unite: 'ans', aide: 'Nombre d\'années restantes pour rembourser complètement le prêt. Sert à calculer le paiement mensuel.' },
    ],
  },
  {
    titre: 'Frais de vente',
    defs: [
      { cle: 'fraisCourtagePct', label: 'Commission de courtage', unite: '%', aide: 'En % du prix de vente, taxes incluses approximativement.' },
      { cle: 'fraisNotaireVente', label: 'Notaire et frais divers à la vente' },
      { cle: 'penaliteHypothecaire', label: 'Pénalité hypothécaire possible', aide: 'Pénalité pour rembourser (vente) ou refinancer avant l\'échéance. Par défaut : 3 mois d\'intérêt. Pour un taux fixe, le différentiel de taux peut être beaucoup plus élevé : demande le montant exact à ton prêteur.' },
    ],
  },
  {
    titre: 'Dépenses annuelles',
    defs: [
      { cle: 'taxesMunicipales', label: 'Taxes municipales' },
      { cle: 'taxesScolaires', label: 'Taxes scolaires' },
      { cle: 'assurances', label: 'Assurances' },
      { cle: 'entretien', label: 'Entretien et réparations' },
      { cle: 'deneigement', label: 'Déneigement' },
      { cle: 'energie', label: 'Électricité et chauffage payés par le propriétaire' },
      { cle: 'conciergerie', label: 'Conciergerie' },
      { cle: 'gestion', label: 'Gestion', aide: 'Montant annuel. Si vide, le % de gestion du profil est appliqué aux loyers perçus (0 $ en autogestion).' },
      { cle: 'autres', label: 'Autres (comptable, publicité, permis…)' },
    ],
  },
];

export function EtapeActuels({ projet, onChange }: PropsEtape) {
  const profil = resoudreProfil(projet.profil);
  const majImm = (i: number, patch: Partial<ImmeubleActuel>) =>
    onChange({ ...projet, actuels: projet.actuels.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const ajouter = () => onChange({ ...projet, actuels: [...projet.actuels, immeubleVide(projet.actuels.length + 1)] });
  const retirer = (i: number) => {
    const id = projet.actuels[i].id;
    onChange({
      ...projet,
      actuels: projet.actuels.filter((_, j) => j !== i),
      scenarioC: { ...projet.scenarioC, refinances: projet.scenarioC.refinances.filter((x) => x !== id) },
    });
  };
  return (
    <section aria-labelledby="t-actuels">
      <h2 id="t-actuels">Immeubles actuels</h2>
      <p className="intro">
        {NOTE_DEFAUTS} Les champs les plus importants pour l'impôt sont le <strong>prix d'achat</strong>, les{' '}
        <strong>rénovations capitalisées</strong>, la <strong>DPA déduite</strong> et le <strong>solde hypothécaire</strong>.
      </p>
      {projet.actuels.map((imm, i) => {
        const defs = defautsActuel(imm, profil);
        return (
          <details key={imm.id} className="carte-immeuble" open={i === 0}>
            <summary>
              <span className="carte-titre">{imm.nom || `Immeuble ${i + 1}`}</span>
              <span className="carte-resume">
                {imm.nbLogements ?? defs.nbLogements} log. · {argent(imm.valeurMarchande ?? defs.valeurMarchande)}
              </span>
            </summary>
            <div className="carte-corps">
              <Groupe titre="Identification">
                <ChampTexte label="Adresse ou nom" valeur={imm.nom} onChange={(v) => majImm(i, { nom: v })} />
                <ChampTexte
                  label="Date de renouvellement de l'hypothèque"
                  valeur={imm.dateRenouvellement}
                  placeholder="AAAA-MM"
                  onChange={(v) => majImm(i, { dateRenouvellement: v })}
                  aide="Vendre ou refinancer avant cette date entraîne souvent une pénalité."
                />
              </Groupe>
              {SECTIONS_ACTUEL.map((s) => (
                <Groupe key={s.titre} titre={s.titre}>
                  <ChampsNombres
                    defs={s.defs}
                    valeurs={imm as unknown as Record<CleActuel, Nombre>}
                    defauts={defs}
                    onChange={(cle, v) => majImm(i, { [cle]: v } as Partial<ImmeubleActuel>)}
                  />
                </Groupe>
              ))}
              {projet.actuels.length > 1 && (
                <button type="button" className="btn btn-lien danger" onClick={() => retirer(i)}>
                  Retirer cet immeuble
                </button>
              )}
            </div>
          </details>
        );
      })}
      {projet.actuels.length < 8 && (
        <button type="button" className="btn" onClick={ajouter}>
          + Ajouter un immeuble
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Immeuble visé (+ marché + scénario C)
// ---------------------------------------------------------------------------

type CleVise = CleNombre<ImmeubleVise>;

const SECTIONS_VISE: { titre: string; defs: DefChamp<CleVise>[] }[] = [
  {
    titre: 'Immeuble et revenus',
    defs: [
      { cle: 'prix', label: "Prix d'achat" },
      { cle: 'nbLogements', label: 'Nombre de logements', unite: 'log.' },
      { cle: 'loyerMoyen', label: 'Loyer mensuel moyen visé', unite: '$/mois' },
      { cle: 'autresRevenusMensuels', label: 'Autres revenus (stationnement, buanderie, rangement)', unite: '$/mois' },
      { cle: 'inoccupationPct', label: "Taux d'inoccupation", unite: '%' },
    ],
  },
  {
    titre: 'Financement',
    defs: [
      { cle: 'miseDeFonds', label: 'Mise de fonds' },
      { cle: 'taux', label: 'Taux hypothécaire', unite: '%', aide: 'Taux affiché (composé semestriellement, comme au Canada). Les prêts assurés SCHL ont souvent un taux plus bas.' },
      { cle: 'amortissement', label: 'Amortissement', unite: 'ans', aide: 'Habituellement 25 ou 30 ans en conventionnel; jusqu\'à 40 ans ou plus avec certains programmes SCHL (p. ex. MLI Select).' },
    ],
  },
  {
    titre: 'Dépenses annuelles',
    defs: [
      { cle: 'taxesMunicipales', label: 'Taxes municipales' },
      { cle: 'taxesScolaires', label: 'Taxes scolaires' },
      { cle: 'assurances', label: 'Assurances' },
      { cle: 'deneigement', label: 'Déneigement' },
      { cle: 'energie', label: 'Électricité et chauffage (aires communes)' },
      { cle: 'conciergerie', label: 'Conciergerie' },
      { cle: 'autres', label: 'Autres' },
      { cle: 'gestionPct', label: 'Gestion (% des loyers perçus)', unite: '%' },
    ],
  },
  {
    titre: "Frais d'acquisition",
    defs: [
      { cle: 'fraisNotaire', label: 'Notaire' },
      { cle: 'droitsMutation', label: 'Droits de mutation (taxe de bienvenue)', aide: 'Calculés automatiquement selon le barème de base du Québec. Certaines municipalités ont des taux plus élevés au-delà de 500 000 $ : vérifie auprès de la Ville.' },
      { cle: 'fraisInspection', label: 'Inspection' },
      { cle: 'fraisEvaluation', label: 'Évaluation (exigée par le prêteur)' },
      { cle: 'fraisEnvironnement', label: 'Évaluation environnementale (phase 1)' },
      { cle: 'fraisAutres', label: 'Autres frais (frais de dossier, ajustements…)' },
    ],
  },
];

export function EtapeVise({ projet, onChange }: PropsEtape) {
  const profil = resoudreProfil(projet.profil);
  const v = projet.vise;
  const defs = defautsVise(v, profil);
  const setV = (patch: Partial<ImmeubleVise>) => onChange({ ...projet, vise: { ...v, ...patch } });
  const m = projet.marche;
  const dm = defautsMarche();
  const setM = (patch: Partial<typeof m>) => onChange({ ...projet, marche: { ...m, ...patch } });
  const c = projet.scenarioC;
  const dc = defautsScenarioC();
  const setC = (patch: Partial<typeof c>) => onChange({ ...projet, scenarioC: { ...c, ...patch } });
  const regles = v.schl ? H.financement.schl : H.financement.conventionnel;

  return (
    <section aria-labelledby="t-vise">
      <h2 id="t-vise">Immeuble récent visé</h2>
      <p className="intro">{NOTE_DEFAUTS}</p>
      {SECTIONS_VISE.map((s) => (
        <Groupe
          key={s.titre}
          titre={s.titre}
          note={
            s.titre === 'Financement'
              ? `Règles indicatives ${v.schl ? 'SCHL' : 'conventionnelles'} : prêt max. ${pct(regles.rpvMax, 0)} de la valeur, RCD min. ${regles.rcdMin.toFixed(2).replace('.', ',')}, amortissement max. ${regles.amortissementMax} ans.`
              : undefined
          }
        >
          <ChampsNombres
            defs={s.defs}
            valeurs={v as unknown as Record<CleVise, Nombre>}
            defauts={defs}
            onChange={(cle, val) => setV({ [cle]: val } as Partial<ImmeubleVise>)}
          />
          {s.titre === 'Financement' && (
            <>
              <ChampCase
                label="Financement assuré SCHL"
                valeur={v.schl}
                onChange={(x) => setV({ schl: x })}
                aide="L'assurance SCHL permet un prêt plus élevé et un amortissement plus long, moyennant une prime ajoutée au prêt. L'admissibilité dépend de l'immeuble et du programme : à valider avec un prêteur."
              />
              {v.schl && (
                <ChampNombre
                  label="Prime SCHL (% du prêt)"
                  unite="%"
                  valeur={v.primeSchlPct}
                  defaut={defs.primeSchlPct}
                  onChange={(x) => setV({ primeSchlPct: x })}
                />
              )}
            </>
          )}
          {s.titre === 'Dépenses annuelles' && (
            <>
              <ChampChoix
                label="Réserve d'entretien"
                valeur={v.entretienMode}
                options={[
                  { valeur: 'pct', libelle: 'En % des loyers' },
                  { valeur: 'porte', libelle: 'En $ par logement' },
                ]}
                onChange={(x) => setV({ entretienMode: x })}
              />
              {v.entretienMode === 'pct' ? (
                <ChampNombre label="Entretien (% des loyers)" unite="%" valeur={v.entretienPct} defaut={defs.entretienPct} onChange={(x) => setV({ entretienPct: x })} />
              ) : (
                <ChampNombre label="Entretien par logement par année" unite="$/an" valeur={v.entretienParPorte} defaut={defs.entretienParPorte} onChange={(x) => setV({ entretienParPorte: x })} />
              )}
            </>
          )}
        </Groupe>
      ))}

      <Groupe titre="Marché et croissance (tous les scénarios)">
        <ChampNombre label="Hausse annuelle des loyers" unite="%" valeur={m.hausseLoyers} defaut={dm.hausseLoyers} onChange={(x) => setM({ hausseLoyers: x })} aide="Au Québec, les hausses sont encadrées par le Tribunal administratif du logement. Pour les immeubles de moins de 5 ans, la clause F du bail peut s'appliquer." />
        <ChampNombre label="Hausse annuelle des dépenses" unite="%" valeur={m.hausseDepenses} defaut={dm.hausseDepenses} onChange={(x) => setM({ hausseDepenses: x })} />
        <ChampNombre label="Appréciation annuelle de la valeur" unite="%" valeur={m.appreciation} defaut={dm.appreciation} onChange={(x) => setM({ appreciation: x })} />
        <ChampNombre label="Loyer médian de référence du marché local" unite="$/mois" valeur={m.loyerMedianLocal} defaut={dm.loyerMedianLocal} onChange={(x) => setM({ loyerMedianLocal: x })} aide="Estimation à valider (rapport SCHL sur le marché locatif, courtiers locaux). Sert seulement à l'alerte si le loyer visé est nettement plus élevé." />
      </Groupe>

      <Groupe titre="Scénario C : refinancement des immeubles actuels" note="Choisis les immeubles à refinancer pour dégager la mise de fonds sans vendre.">
        <div className="champ champ-large">
          <span className="champ-label">Immeubles à refinancer</span>
          <div className="liste-cases">
            {projet.actuels.map((a) => (
              <label key={a.id} className="case-inline">
                <input
                  type="checkbox"
                  checked={c.refinances.includes(a.id)}
                  onChange={(e) =>
                    setC({ refinances: e.target.checked ? [...c.refinances, a.id] : c.refinances.filter((x) => x !== a.id) })
                  }
                />
                {a.nom}
              </label>
            ))}
          </div>
        </div>
        <ChampNombre label="Ratio prêt/valeur (RPV) maximal" unite="%" valeur={c.rpvMax} defaut={dc.rpvMax} onChange={(x) => setC({ rpvMax: x })} aide="Pourcentage de la valeur que le prêteur acceptera de prêter. 75 % est courant en conventionnel." />
        <ChampNombre label="Taux du refinancement" unite="%" valeur={c.tauxRefi} defaut={dc.tauxRefi} onChange={(x) => setC({ tauxRefi: x })} />
        <ChampNombre label="Amortissement du refinancement" unite="ans" valeur={c.amortissementRefi} defaut={dc.amortissementRefi} onChange={(x) => setC({ amortissementRefi: x })} />
        <ChampNombre label="Frais de refinancement par immeuble" valeur={c.fraisRefi} defaut={dc.fraisRefi} onChange={(x) => setC({ fraisRefi: x })} aide="Notaire, évaluation, frais de dossier. La pénalité hypothécaire saisie pour chaque immeuble s'ajoute." />
      </Groupe>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hypothèses fiscales (+ scénario D)
// ---------------------------------------------------------------------------

export function EtapeFiscal({ projet, onChange }: PropsEtape) {
  const f = projet.fiscal;
  const df = defautsFiscal();
  const setF = (patch: Partial<typeof f>) => onChange({ ...projet, fiscal: { ...f, ...patch } });
  const d = projet.scenarioD;
  const profil = resoudreProfil(projet.profil);
  const dd = defautsScenarioD(d, profil);
  const setD = (patch: Partial<typeof d>) => onChange({ ...projet, scenarioD: { ...d, ...patch } });
  const revenuVente = profil.revenuEmploi + profil.autresRevenus;

  return (
    <section aria-labelledby="t-fiscal">
      <h2 id="t-fiscal">Hypothèses fiscales</h2>
      <div className="bandeau attention" role="note">
        <strong>À valider avec un comptable.</strong> Ces valeurs par défaut sont des approximations de {H.anneeFiscale} (mise à jour du{' '}
        {H.dateMiseAJour}). L'impôt réel dépend de toute ta situation.
      </div>
      <Groupe titre="Gain en capital et taux d'impôt">
        <ChampNombre
          label="Taux d'inclusion du gain en capital"
          unite="%"
          valeur={f.tauxInclusion}
          defaut={df.tauxInclusion}
          onChange={(x) => setF({ tauxInclusion: x })}
          aide="Part du gain en capital qui est imposable. 50 % par défaut : la hausse à 66,67 % proposée en 2024 a été abandonnée. Modifiable si les règles changent."
        />
        <ChampNombre
          label="Taux marginal combiné (optionnel)"
          unite="%"
          valeur={f.tauxMarginalManuel}
          onChange={(x) => setF({ tauxMarginalManuel: x })}
          aide="Laisse vide pour un calcul par paliers fédéral + Québec (recommandé : un gros gain fait monter de palier). Si tu saisis un taux, il est appliqué tel quel au revenu ajouté."
        />
        <div className="champ champ-info">
          <span className="champ-label">Taux marginal calculé (approx.)</span>
          <span>
            Avec ton revenu d'emploi : <strong>{pct(tauxMarginal(revenuVente))}</strong>
            <br />
            Sans revenu d'emploi : <strong>{pct(tauxMarginal(profil.autresRevenus))}</strong>
            <br />
            Au palier le plus élevé : <strong>{pct(tauxMarginal(400_000))}</strong>
          </span>
        </div>
        <p className="champ-large note-legale">
          Récupération d'amortissement : 100 % imposable comme revenu ordinaire, l'année de la vente.
        </p>
      </Groupe>

      <Groupe titre="Mode de détention">
        <ChampChoix
          label="Les immeubles sont détenus"
          valeur={f.detention}
          options={[
            { valeur: 'personnelle', libelle: 'Personnellement' },
            { valeur: 'societe', libelle: 'Par une société (approximation)' },
          ]}
          onChange={(x) => setF({ detention: x })}
          aide="Mode société : impôt d'environ 50 % sur le revenu de placement, remboursé en partie lors du versement de dividendes. C'est une estimation simple. Transférer des immeubles dans une société (art. 85 / art. 518) reporte l'impôt, mais le gain latent suit les immeubles : il ne disparaît pas."
        />
        {f.detention === 'societe' && (
          <p className="champ-large bandeau info">
            Approximation : la société paie {pct(H.fiscal.societe.tauxRevenuPlacement, 2)} sur le revenu de placement, verse le flux en
            dividendes non déterminés et récupère jusqu'à {pct(H.fiscal.societe.impotRemboursable, 2)} (IMRTD). La moitié non imposable du
            gain va au compte de dividende en capital (CDC), non modélisé en détail.
          </p>
        )}
      </Groupe>

      <Groupe titre="Amortissement fiscal (DPA) futur">
        <ChampCase
          label="Réclamer la DPA chaque année (catégorie 1)"
          valeur={f.reclamerDpa}
          onChange={(x) => setF({ reclamerDpa: x })}
          aide="La DPA réduit l'impôt chaque année, sans pouvoir créer de perte locative, mais elle sera récupérée (imposée) à la vente. Désactivée par défaut : estimation prudente."
        />
        {f.reclamerDpa && (
          <>
            <ChampNombre label="Part du prix attribuée au bâtiment" unite="%" valeur={f.partBatimentPct} defaut={df.partBatimentPct} onChange={(x) => setF({ partBatimentPct: x })} aide="Le terrain n'est pas amortissable." />
            <ChampNombre label="Taux de DPA" unite="%" valeur={f.tauxDpa} defaut={df.tauxDpa} onChange={(x) => setF({ tauxDpa: x })} />
          </>
        )}
      </Groupe>

      <Groupe titre="Scénario D : étalement de l'impôt sur la vente">
        <ChampChoix
          label="Méthode"
          valeur={d.mode}
          options={[
            { valeur: 'etalement', libelle: 'Ventes réparties sur 2 ou 3 années' },
            { valeur: 'reserve', libelle: 'Réserve pour solde de prix de vente (jusqu\'à 5 ans)' },
          ]}
          onChange={(x) => setD({ mode: x, nbAnnees: null })}
          aide="Étalement : chaque immeuble est vendu dans une année d'imposition différente. Réserve : l'acheteur te paie une partie du prix plus tard; au moins 20 % du gain est imposé chaque année (cumulatif)."
        />
        <ChampNombre
          label="Nombre d'années"
          unite="ans"
          valeur={d.nbAnnees}
          defaut={dd.nbAnnees}
          onChange={(x) => setD({ nbAnnees: x })}
          aide={d.mode === 'reserve' ? 'Entre 1 et 5 ans.' : 'Entre 1 et 3 ans.'}
        />
        {d.mode === 'reserve' && (
          <ChampNombre
            label="Part du prix encaissée à la vente"
            unite="%"
            valeur={d.pctEncaisse}
            defaut={dd.pctEncaisse}
            onChange={(x) => setD({ pctEncaisse: x })}
            aide="Le reste est payé par l'acheteur sur les années suivantes. Attention : l'argent non encaissé n'est pas disponible pour ta mise de fonds."
          />
        )}
        <ChampNombre
          label="Revenu imposable de base les années suivantes"
          unite="$/an"
          valeur={d.revenuAnneesSuivantes}
          defaut={dd.revenuAnneesSuivantes}
          onChange={(x) => setD({ revenuAnneesSuivantes: x })}
          aide="Revenu (emploi + autres) les années 2 et suivantes. Si tu cesses de travailler, ce revenu baisse et l'étalement devient plus avantageux. Les loyers du nouvel immeuble ne sont pas ajoutés (simplification)."
        />
      </Groupe>
    </section>
  );
}
