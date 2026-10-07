import { useEffect, useMemo, useRef, useState } from 'react';
import { analyser } from './calc/analyses';
import { argent } from './calc/format';
import { projetExemple, projetVide } from './model/projets';
import { chargerProjet, exporterJson, importerJson, sauvegarderProjet } from './model/stockage';
import type { Projet } from './model/types';
import { EtapeActuels, EtapeFiscal, EtapeProfil, EtapeVise } from './ui/Etapes';
import { Methode } from './ui/Methode';
import { Resultats } from './ui/Resultats';

const ETAPES = [
  { id: 'profil', titre: 'Profil' },
  { id: 'actuels', titre: 'Immeubles actuels' },
  { id: 'vise', titre: 'Immeuble visé' },
  { id: 'fiscal', titre: 'Hypothèses fiscales' },
  { id: 'resultats', titre: 'Résultats' },
  { id: 'methode', titre: 'Comment ça marche' },
] as const;
type IdEtape = (typeof ETAPES)[number]['id'];

export default function App() {
  const initial = useRef(chargerProjet());
  const [projet, setProjet] = useState<Projet>(() => initial.current ?? projetExemple());
  const [exemple, setExemple] = useState(initial.current === null);
  const [etape, setEtape] = useState<IdEtape>('profil');
  const [message, setMessage] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => sauvegarderProjet(projet), [projet]);
  useEffect(() => {
    // À l'impression, ouvrir les sections repliables pour qu'elles figurent dans le rapport.
    const ouvrir = () => document.querySelectorAll('.resultats details').forEach((d) => ((d as HTMLDetailsElement).open = true));
    window.addEventListener('beforeprint', ouvrir);
    return () => window.removeEventListener('beforeprint', ouvrir);
  }, []);
  const analyse = useMemo(() => analyser(projet), [projet]);

  const aller = (e: IdEtape) => {
    setEtape(e);
    window.scrollTo({ top: 0 });
    titre.current?.focus();
  };
  const index = ETAPES.findIndex((e) => e.id === etape);
  const flux = (id: string) => analyse.resultats.find((r) => r.id === id)!.verdict.flux;

  const imprimer = () => {
    setEtape('resultats');
    setTimeout(() => window.print(), 400);
  };

  return (
    <div className="app">
      <header className="entete no-print">
        <div className="entete-ligne">
          <div>
            <h1 ref={titre} tabIndex={-1}>Simulateur immobilier</h1>
            <p className="sous-titre">Vendre 3 immeubles pour en acheter 1 récent : est-ce que ça me permet d'arrêter de travailler?</p>
          </div>
          <div className="outils" role="toolbar" aria-label="Actions sur les données">
            <button type="button" className="btn" onClick={() => exporterJson(projet)}>Exporter (JSON)</button>
            <button type="button" className="btn" onClick={() => fichier.current?.click()}>Importer</button>
            <input
              ref={fichier}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  setProjet(await importerJson(f));
                  setExemple(false);
                  setMessage('Données importées.');
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Échec de l'importation.");
                }
              }}
            />
            <button type="button" className="btn btn-principal" onClick={imprimer}>Imprimer / PDF</button>
          </div>
        </div>
        {exemple && (
          <div className="bandeau info" role="status">
            Des <strong>données d'exemple fictives</strong> sont chargées pour que tu puisses explorer. Remplace-les par les tiennes, ou{' '}
            <button
              type="button"
              className="btn-lien"
              onClick={() => {
                if (confirm('Effacer toutes les données et repartir de zéro?')) {
                  setProjet(projetVide());
                  setExemple(false);
                  aller('profil');
                }
              }}
            >
              repars de zéro
            </button>
            .
          </div>
        )}
        {message && (
          <div className="bandeau info" role="status">
            {message}{' '}
            <button type="button" className="btn-lien" onClick={() => setMessage(null)}>Fermer</button>
          </div>
        )}
        <nav aria-label="Étapes" className="etapes">
          <ol>
            {ETAPES.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={e.id === etape ? 'actif' : ''}
                  aria-current={e.id === etape ? 'step' : undefined}
                  onClick={() => aller(e.id)}
                >
                  {i < 5 && <span className="num">{i + 1}</span>}
                  {e.titre}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className="mise-en-page">
        <main className="contenu">
          {etape === 'profil' && <EtapeProfil projet={projet} onChange={setProjet} />}
          {etape === 'actuels' && <EtapeActuels projet={projet} onChange={setProjet} />}
          {etape === 'vise' && <EtapeVise projet={projet} onChange={setProjet} />}
          {etape === 'fiscal' && <EtapeFiscal projet={projet} onChange={setProjet} />}
          {etape === 'resultats' && <Resultats analyse={analyse} />}
          {etape === 'methode' && <Methode />}

          {index < 4 && (
            <div className="navigation no-print">
              {index > 0 && <button type="button" className="btn" onClick={() => aller(ETAPES[index - 1].id)}>← {ETAPES[index - 1].titre}</button>}
              <button type="button" className="btn btn-principal" onClick={() => aller(ETAPES[index + 1].id)}>{ETAPES[index + 1].titre} →</button>
            </div>
          )}
        </main>

        {etape !== 'resultats' && etape !== 'methode' && (
          <aside className="apercu no-print" aria-label="Aperçu des résultats">
            <h2>Aperçu en direct</h2>
            <p className="apercu-besoin">Besoin : {argent(analyse.resolu.profil.besoinMensuelNet)}/mois net</p>
            <ul>
              {analyse.resultats.map((r) => (
                <li key={r.id} className={r.verdict.atteint && r.faisable ? 'ok' : 'ko'}>
                  <span>{r.nom}</span>
                  <strong>{argent(flux(r.id))}</strong>
                  {!r.faisable && <small>Mise de fonds non couverte</small>}
                </li>
              ))}
            </ul>
            <button type="button" className="btn-lien" onClick={() => aller('resultats')}>Voir les résultats détaillés</button>
          </aside>
        )}
      </div>

      <footer className="pied">
        Simulateur éducatif, pas un conseil financier, fiscal ou juridique. Les impôts sont des estimations. Données conservées
        uniquement sur cet appareil.
      </footer>
    </div>
  );
}
