import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HYPOTHESES as H } from '../config/hypotheses';
import type { Analyse } from '../calc/analyses';
import { argent, pct, ratio } from '../calc/format';
import { COULEURS_SCENARIOS, IDS_SCENARIOS, NOMS_SCENARIOS, type ResultatScenario } from '../calc/scenarios';
import { Avis } from './Avis';

function Montant({ n, signe = false }: { n: number; signe?: boolean }) {
  const cls = n < 0 ? 'negatif' : signe && n > 0 ? 'positif' : '';
  return <span className={cls}>{signe && n > 0 ? '+' : ''}{argent(n)}</span>;
}

function Verdict({ r }: { r: ResultatScenario }) {
  const v = r.verdict;
  return (
    <article className={`verdict ${v.atteint && r.faisable ? 'ok' : 'ko'}`} style={{ borderTopColor: COULEURS_SCENARIOS[r.id] }}>
      <h3>{r.nom}</h3>
      <p className="verdict-flux">
        <Montant n={v.flux} /> <span className="unite">/ mois</span>
      </p>
      <p className="verdict-detail">
        net après impôt estimé, vs ton besoin de {argent(v.besoin)}/mois
      </p>
      <p className="verdict-ecart">
        Écart : <Montant n={v.ecart} signe /> ({v.ecartPct > 0 ? '+' : ''}
        {pct(v.ecartPct, 0)})
      </p>
      {!r.faisable && (
        <p className="verdict-alerte">
          ⚠ Mise de fonds non couverte : manque de {argent(-(r.surplus ?? 0))}
        </p>
      )}
      <p className="verdict-desc">{r.description}</p>
    </article>
  );
}

function ProduitNet({ analyse }: { analyse: Analyse }) {
  const B = analyse.resultats.find((r) => r.id === 'B')!;
  const D = analyse.resultats.find((r) => r.id === 'D')!;
  const C = analyse.resultats.find((r) => r.id === 'C')!;
  const v = B.vente!;
  const fin = B.financement!;
  const p = analyse.resolu;
  return (
    <section className="bloc produit-net" aria-labelledby="t-pn">
      <h2 id="t-pn">Capital réellement réinvestissable (scénario B)</h2>
      <p className="intro">
        C'est souvent ici que la stratégie échoue : après les frais de vente, le remboursement des hypothèques et l'impôt, il reste
        moins que la valeur des immeubles laisse croire.
      </p>
      <div className="tableau-defilant">
        <table>
          <caption className="sr-only">Calcul du produit net de vente par immeuble</caption>
          <thead>
            <tr>
              <th scope="col">Étape</th>
              {v.details.map((d) => (
                <th scope="col" key={d.id}>{d.nom}</th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {([
              ['Prix de vente', (d) => d.prixVente],
              ['− Courtage', (d) => -d.fraisCourtage],
              ['− Notaire et frais', (d) => -d.fraisNotaire],
              ['= Produit net de vente', (d) => d.produitNetVente, 'sous-total'],
              ['Prix de base rajusté (achat + rénovations)', (d) => d.pbr, 'info'],
              ['Gain en capital', (d) => d.gainCapital, 'info'],
              ["Récupération d'amortissement (DPA)", (d) => d.recuperation, 'info'],
              ['− Solde hypothécaire', (d) => -d.solde],
              ['− Pénalité hypothécaire', (d) => -d.penalite],
              ['= Liquidités avant impôt', (d) => d.liquiditesAvantImpot, 'sous-total'],
            ] as [string, (d: (typeof v.details)[number]) => number, string?][]).map(([lib, f, cls]) => (
              <tr key={lib} className={cls}>
                <th scope="row">{lib}</th>
                {v.details.map((d) => (
                  <td key={d.id}><Montant n={f(d)} /></td>
                ))}
                <td><Montant n={v.details.reduce((s, d) => s + f(d), 0)} /></td>
              </tr>
            ))}
            <tr>
              <th scope="row">− Impôt estimé sur la vente</th>
              {v.impotParImmeuble.map((x, i) => (
                <td key={i}><Montant n={-x} /></td>
              ))}
              <td><Montant n={-v.imposition.impot} /></td>
            </tr>
            <tr className="total">
              <th scope="row">= Produit net disponible</th>
              {v.details.map((d, i) => (
                <td key={d.id}><Montant n={d.liquiditesAvantImpot - v.impotParImmeuble[i]} /></td>
              ))}
              <td><Montant n={v.produitNet} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grille-2">
        <div>
          <h3>Décomposition de l'impôt sur la vente</h3>
          <dl className="liste-def">
            <dt>Gain en capital net</dt><dd>{argent(v.imposition.gainNet)}</dd>
            <dt>Gain imposable ({pct(p.fiscal.tauxInclusion, 0)} d'inclusion)</dt><dd>{argent(v.imposition.gainImposable)}</dd>
            <dt>Récupération d'amortissement (100 %)</dt><dd>{argent(v.imposition.recuperation)}</dd>
            <dt>Revenu imposable ajouté</dt><dd>{argent(v.imposition.revenuAjoute)}</dd>
            <dt>{p.fiscal.detention === 'societe' ? 'Taux société (revenu de placement)' : "S'ajoute à un revenu de base de"}</dt>
            <dd>{p.fiscal.detention === 'societe' ? pct(H.fiscal.societe.tauxRevenuPlacement, 2) : argent(v.imposition.base)}</dd>
            <dt><strong>Impôt estimé</strong></dt><dd><strong>{argent(v.imposition.impot)}</strong></dd>
            <dt>Taux effectif sur le gain + récupération</dt>
            <dd>{pct(v.imposition.revenuAjoute > 0 ? v.imposition.impot / (v.imposition.gainNet + v.imposition.recuperation) : 0)}</dd>
          </dl>
        </div>
        <div>
          <h3>Faisabilité de la mise de fonds</h3>
          <dl className="liste-def">
            <dt>Mise de fonds visée</dt><dd>{argent(p.vise.miseDeFonds)}</dd>
            {fin.frais.map((f) => (
              <FragmentDef key={f.libelle} dt={`+ ${f.libelle}`} dd={argent(f.montant)} />
            ))}
            <dt><strong>Comptant requis</strong></dt><dd><strong>{argent(fin.capitalRequis)}</strong></dd>
          </dl>
          <table className="faisabilite">
            <thead>
              <tr><th scope="col">Scénario</th><th scope="col">Disponible</th><th scope="col">Surplus / manque</th></tr>
            </thead>
            <tbody>
              {[B, C, D].map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.nom}</th>
                  <td>{argent(r.capitalDisponible ?? 0)}</td>
                  <td><Montant n={r.surplus ?? 0} signe /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note-legale">Un surplus est conservé en liquidités (non investi dans le calcul du flux).</p>
        </div>
      </div>
    </section>
  );
}

function FragmentDef({ dt, dd }: { dt: string; dd: string }) {
  return (
    <>
      <dt>{dt}</dt>
      <dd>{dd}</dd>
    </>
  );
}

function TableauComparatif({ analyse }: { analyse: Analyse }) {
  const rs = analyse.resultats;
  const lignes: [string, (r: ResultatScenario) => string, string?][] = [
    ['Nombre de logements', (r) => String(r.indicateurs.nbLogements)],
    ['Valeur des immeubles', (r) => argent(r.indicateurs.valeur)],
    ['Prix (valeur) par porte', (r) => argent(r.indicateurs.prixParPorte)],
    ['Revenus bruts annuels', (r) => argent(r.an1.revenusBruts)],
    ['− Inoccupation', (r) => argent(-r.an1.perteInoccupation)],
    ["− Dépenses d'exploitation", (r) => argent(-r.an1.depenses)],
    ["= Revenu net d'exploitation (RNE)", (r) => argent(r.an1.rne), 'sous-total'],
    ['− Service de la dette (paiements)', (r) => argent(-r.an1.serviceDette)],
    ['= Flux monétaire avant impôt', (r) => argent(r.an1.fluxAvantImpot), 'sous-total'],
    ['− Impôt estimé sur les loyers', (r) => argent(-r.an1.impot)],
    ['= Flux net après impôt (annuel)', (r) => argent(r.an1.fluxApresImpot), 'total'],
    ['Flux net après impôt (mensuel)', (r) => argent(r.verdict.flux), 'total'],
    ['Taux de capitalisation (RNE ÷ valeur)', (r) => pct(r.indicateurs.tga)],
    ['Rendement comptant (cash-on-cash)', (r) => pct(r.indicateurs.cashOnCash)],
    ['Ratio de couverture de la dette (RCD)', (r) => ratio(r.indicateurs.rcd)],
    ['Ratio dépenses / revenus', (r) => pct(r.indicateurs.ratioDepenses)],
    ['Intérêts payés (an 1)', (r) => argent(r.an1.interets)],
    ['Capital remboursé (an 1)', (r) => argent(r.an1.capitalRembourse)],
    ['Valeur nette (équité) fin an 1', (r) => argent(r.an1.equite)],
  ];
  return (
    <section className="bloc" aria-labelledby="t-comp">
      <h2 id="t-comp">Comparaison des scénarios (année 1)</h2>
      <div className="tableau-defilant">
        <table className="comparatif">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              {rs.map((r) => (
                <th scope="col" key={r.id} style={{ color: COULEURS_SCENARIOS[r.id] }}>{r.nom}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map(([lib, f, cls]) => (
              <tr key={lib} className={cls}>
                <th scope="row">{lib}</th>
                {rs.map((r) => (
                  <td key={r.id} className={lib.includes('RCD') && r.indicateurs.rcd < H.alertes.rcdMinimum ? 'negatif' : ''}>{f(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note-legale">
        Le rendement comptant est calculé sur le capital engagé : mise de fonds + frais (B, D) ou équité actuelle des immeubles (A, C).
        Impôt sur les loyers calculé comme si tu ne travaillais plus (revenu de base : autres revenus).
      </p>
    </section>
  );
}

function ListeAlertes({ analyse }: { analyse: Analyse }) {
  if (analyse.alertes.length === 0) return null;
  const ordre = { danger: 0, attention: 1, info: 2 };
  const triees = [...analyse.alertes].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
  return (
    <section className="bloc" aria-labelledby="t-alertes">
      <h2 id="t-alertes">Alertes</h2>
      <ul className="alertes">
        {triees.map((a, i) => (
          <li key={i} className={`alerte ${a.niveau}`}>
            <span className="alerte-niveau">{a.niveau === 'danger' ? 'Important' : a.niveau === 'attention' ? 'Attention' : 'Info'}</span>
            {a.scenario && <span className="alerte-scenario">Scénario {a.scenario}</span>}
            <span>{a.texte}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Graphiques({ analyse }: { analyse: Analyse }) {
  const besoinAnnuel = analyse.resolu.profil.besoinMensuelNet * 12;
  const donnees = analyse.resultats[0].projection.map((_, t) => {
    const ligne: Record<string, number> = { annee: t + 1 };
    for (const r of analyse.resultats) {
      ligne[`flux${r.id}`] = Math.round(r.projection[t].fluxApresImpot);
      ligne[`eq${r.id}`] = Math.round(r.projection[t].equite);
    }
    return ligne;
  });
  const fmtK = (v: number) => `${Math.round(v / 1000)} k$`;
  const tooltip = (v: number) => argent(v);
  return (
    <section className="bloc" aria-labelledby="t-proj">
      <h2 id="t-proj">Projection sur 10 ans</h2>
      <p className="intro">
        Loyers +{pct(analyse.resolu.marche.hausseLoyers)}/an, dépenses +{pct(analyse.resolu.marche.hausseDepenses)}/an, valeur +
        {pct(analyse.resolu.marche.appreciation)}/an. Hypothèques renouvelées au même taux. B et D exploitent le même immeuble : leurs
        courbes de flux se superposent; seule la vente (impôt, liquidités) diffère.
      </p>
      <div className="grille-2">
        <figure className="graphique">
          <figcaption>Flux net annuel après impôt (ligne pointillée : ton besoin)</figcaption>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={donnees} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="annee" tickFormatter={(v) => `An ${v}`} fontSize={12} />
              <YAxis tickFormatter={fmtK} fontSize={12} width={56} />
              <Tooltip formatter={tooltip} labelFormatter={(l) => `Année ${l}`} />
              <Legend />
              <ReferenceLine y={besoinAnnuel} stroke="#111827" strokeDasharray="6 4" />
              {IDS_SCENARIOS.map((id) => (
                <Line key={id} type="monotone" dataKey={`flux${id}`} name={NOMS_SCENARIOS[id]} stroke={COULEURS_SCENARIOS[id]} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </figure>
        <figure className="graphique">
          <figcaption>Valeur nette (équité) : valeur − dettes + liquidités</figcaption>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={donnees} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="annee" tickFormatter={(v) => `An ${v}`} fontSize={12} />
              <YAxis tickFormatter={fmtK} fontSize={12} width={64} />
              <Tooltip formatter={tooltip} labelFormatter={(l) => `Année ${l}`} />
              <Legend />
              {IDS_SCENARIOS.map((id) => (
                <Line key={id} type="monotone" dataKey={`eq${id}`} name={NOMS_SCENARIOS[id]} stroke={COULEURS_SCENARIOS[id]} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </figure>
      </div>
      <details className="details-tableau">
        <summary>Voir le tableau de projection</summary>
        <div className="tableau-defilant">
          <table>
            <thead>
              <tr>
                <th scope="col">Année</th>
                {analyse.resultats.map((r) => (
                  <th scope="col" key={r.id} colSpan={3}>{r.nom}</th>
                ))}
              </tr>
              <tr>
                <th scope="col"></th>
                {analyse.resultats.map((r) => [
                  <th scope="col" key={`${r.id}f`}>Flux net</th>,
                  <th scope="col" key={`${r.id}c`}>Capital remb.</th>,
                  <th scope="col" key={`${r.id}e`}>Équité</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {analyse.resultats[0].projection.map((_, t) => (
                <tr key={t}>
                  <th scope="row">{t + 1}</th>
                  {analyse.resultats.map((r) => [
                    <td key={`${r.id}f`}><Montant n={r.projection[t].fluxApresImpot} /></td>,
                    <td key={`${r.id}c`}>{argent(r.projection[t].capitalRembourse)}</td>,
                    <td key={`${r.id}e`}>{argent(r.projection[t].equite)}</td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {analyse.resultats.find((r) => r.etalement?.mode === 'reserve') && (
        <p className="note-legale">Scénario D (réserve) : la valeur nette inclut le solde de prix de vente à recevoir, net de l'impôt futur.</p>
      )}
    </section>
  );
}

function Sensibilite({ analyse }: { analyse: Analyse }) {
  const besoin = analyse.resolu.profil.besoinMensuelNet;
  return (
    <section className="bloc" aria-labelledby="t-sens">
      <h2 id="t-sens">Analyse de sensibilité</h2>
      <p className="intro">
        Flux net mensuel après impôt selon différentes variations. En vert : atteint ton besoin de {argent(besoin)}/mois.
        Les taux s'appliquent à toutes les hypothèques (au renouvellement); les loyers et l'inoccupation, à tous les immeubles.
      </p>
      <div className="tableau-defilant">
        <table className="sensibilite">
          <thead>
            <tr>
              <th scope="col">Variation</th>
              {IDS_SCENARIOS.map((id) => (
                <th scope="col" key={id}>{NOMS_SCENARIOS[id]}</th>
              ))}
              <th scope="col">RCD du récent</th>
            </tr>
          </thead>
          <tbody>
            {analyse.sensibilite.map((l) => (
              <tr key={l.variation.id} className={l.variation.id === 'base' ? 'sous-total' : ''}>
                <th scope="row">{l.variation.libelle}</th>
                {IDS_SCENARIOS.map((id) => (
                  <td key={id} className={l.flux[id] >= besoin ? 'cellule-ok' : 'cellule-ko'}>{argent(l.flux[id])}</td>
                ))}
                <td className={l.rcdVise < H.alertes.rcdMinimum ? 'negatif' : ''}>{ratio(l.rcdVise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SeuilEquilibre({ analyse }: { analyse: Analyse }) {
  return (
    <section className="bloc" aria-labelledby="t-eq">
      <h2 id="t-eq">Seuil d'équilibre</h2>
      <p className="intro">Loyer moyen minimal pour atteindre ton revenu net souhaité de {argent(analyse.resolu.profil.besoinMensuelNet)}/mois, toutes autres hypothèses égales.</p>
      <div className="tableau-defilant">
        <table>
          <thead>
            <tr><th scope="col">Scénario</th><th scope="col">Loyer testé</th><th scope="col">Loyer actuel</th><th scope="col">Loyer requis</th><th scope="col">Écart</th></tr>
          </thead>
          <tbody>
            {analyse.equilibres.map((e) => (
              <tr key={e.id}>
                <th scope="row">{NOMS_SCENARIOS[e.id]}</th>
                <td>{e.portee}</td>
                <td>{argent(e.loyerActuel)}</td>
                <td>{e.loyerRequis === null ? 'Plus de 6 000 $' : argent(e.loyerRequis)}</td>
                <td>{e.loyerRequis === null ? '—' : <Montant n={e.loyerRequis - e.loyerActuel} signe />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailsScenarios({ analyse }: { analyse: Analyse }) {
  const C = analyse.resultats.find((r) => r.id === 'C')!;
  const D = analyse.resultats.find((r) => r.id === 'D')!;
  const fin = C.financement!;
  const e = D.etalement!;
  return (
    <section className="bloc" aria-labelledby="t-det">
      <h2 id="t-det">Détails des scénarios C et D</h2>
      <div className="grille-2">
        <div>
          <h3>C. Refinancement</h3>
          <div className="tableau-defilant">
            <table>
              <thead>
                <tr><th scope="col">Immeuble</th><th scope="col">Nouveau prêt</th><th scope="col">Liquidités dégagées</th><th scope="col">RCD après</th></tr>
              </thead>
              <tbody>
                {C.refinancements!.length === 0 && (
                  <tr><td colSpan={4}>Aucun immeuble choisi (étape « Immeuble visé »).</td></tr>
                )}
                {C.refinancements!.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.nom}</th>
                    <td>{r.possible ? argent(r.nouveauPret) : 'Non refinancé'}</td>
                    <td>{argent(r.liquidites)}</td>
                    <td className={r.rcd < H.financement.conventionnel.rcdMin ? 'negatif' : ''}>{ratio(r.rcd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note-legale">
            Liquidités = nouveau prêt − ancien solde − pénalité − frais. Aucun gain n'est réalisé, donc aucun impôt sur la vente, mais la
            dette totale augmente et tu gères {C.indicateurs.nbLogements} logements. Les intérêts sur l'argent emprunté pour acheter un
            immeuble locatif sont généralement déductibles (à valider).
          </p>
        </div>
        <div>
          <h3>D. {e.mode === 'etalement' ? 'Étalement des ventes' : 'Réserve pour solde de prix de vente'}</h3>
          <div className="tableau-defilant">
            <table>
              <thead>
                <tr><th scope="col">Année</th><th scope="col">Revenu de base</th><th scope="col">Gain imposable</th><th scope="col">Récupération</th><th scope="col">Impôt</th><th scope="col">Encaissé</th></tr>
              </thead>
              <tbody>
                {e.annees.map((a) => (
                  <tr key={a.annee}>
                    <th scope="row">{a.annee}</th>
                    <td>{argent(a.base)}</td>
                    <td>{argent(a.gainImposable)}</td>
                    <td>{argent(a.recuperation)}</td>
                    <td>{argent(a.impot)}</td>
                    <td>{argent(a.encaissement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="liste-def">
            <dt>Impôt total avec étalement</dt><dd>{argent(e.impotTotal)}</dd>
            <dt>Impôt sans étalement (B)</dt><dd>{argent(e.impotSansEtalement)}</dd>
            <dt><strong>Économie estimée</strong></dt><dd><strong><Montant n={e.impotSansEtalement - e.impotTotal} signe /></strong></dd>
            {e.mode === 'reserve' && (
              <>
                <dt>Solde de prix à recevoir</dt><dd>{argent(e.soldeARecevoir)}</dd>
              </>
            )}
          </dl>
          <p className="note-legale">
            {e.mode === 'etalement'
              ? "Hypothèse : le produit de toutes les ventes est disponible à l'achat. En réalité, si un immeuble est vendu l'année suivante, il faut un financement relais."
              : "Seul le comptant reçu à la vente, moins l'impôt de l'an 1, sert à la mise de fonds. Le solde à recevoir porte habituellement intérêt (non modélisé) et comporte un risque de non-paiement."}
          </p>
        </div>
      </div>
      <p className="note-legale">Paiement hypothécaire mensuel de l'immeuble récent : {argent(fin.paiementMensuel, true)} (prêt de {argent(fin.pret.capital)}{fin.primeSchl > 0 ? `, prime SCHL de ${argent(fin.primeSchl)} incluse` : ''}).</p>
    </section>
  );
}

function Hypotheses({ analyse }: { analyse: Analyse }) {
  const p = analyse.resolu;
  return (
    <section className="bloc" aria-labelledby="t-hyp">
      <h2 id="t-hyp">Principales hypothèses utilisées</h2>
      <dl className="liste-def colonnes">
        <dt>Besoin mensuel net</dt><dd>{argent(p.profil.besoinMensuelNet)}</dd>
        <dt>Revenu l'année de la vente</dt><dd>{argent(p.profil.revenuEmploi + p.profil.autresRevenus)}</dd>
        <dt>Détention</dt><dd>{p.fiscal.detention === 'societe' ? 'Société (approximation)' : 'Personnelle'}</dd>
        <dt>Taux d'inclusion</dt><dd>{pct(p.fiscal.tauxInclusion, 0)}</dd>
        <dt>Taux marginal</dt><dd>{p.fiscal.tauxMarginalManuel !== null ? `${pct(p.fiscal.tauxMarginalManuel)} (saisi)` : 'Calcul par paliers'}</dd>
        <dt>DPA future</dt><dd>{p.fiscal.reclamerDpa ? `Oui, ${pct(p.fiscal.tauxDpa)}` : 'Non réclamée'}</dd>
        <dt>Immeuble visé</dt><dd>{argent(p.vise.prix)}, {p.vise.nbLogements} log. à {argent(p.vise.loyerMoyen)}</dd>
        <dt>Financement</dt><dd>{argent(p.vise.miseDeFonds)} de mise, {pct(p.vise.taux, 2)}, {p.vise.amortissement} ans{p.vise.schl ? ', SCHL' : ''}</dd>
        <dt>Version des hypothèses</dt><dd>{H.dateMiseAJour}</dd>
      </dl>
    </section>
  );
}

export function Resultats({ analyse }: { analyse: Analyse }) {
  return (
    <div className="resultats">
      <h2 className="print-only">Rapport de simulation, {new Date().toLocaleDateString('fr-CA')}</h2>
      <div className="bandeau attention" role="note">
        <strong>Les impôts affichés sont des estimations.</strong> Ils servent à comparer les scénarios, pas à remplir une déclaration.
        Fais valider les chiffres par un comptable ou un fiscaliste.
      </div>
      <section aria-labelledby="t-verdict">
        <h2 id="t-verdict">Verdict : ton flux net mensuel après impôt vs ton besoin</h2>
        <div className="grille-verdicts">
          {analyse.resultats.map((r) => (
            <Verdict key={r.id} r={r} />
          ))}
        </div>
      </section>
      <ProduitNet analyse={analyse} />
      <ListeAlertes analyse={analyse} />
      <TableauComparatif analyse={analyse} />
      <Graphiques analyse={analyse} />
      <Sensibilite analyse={analyse} />
      <SeuilEquilibre analyse={analyse} />
      <DetailsScenarios analyse={analyse} />
      <Hypotheses analyse={analyse} />
      <Avis />
    </div>
  );
}
