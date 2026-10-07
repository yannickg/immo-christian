import { useEffect, useId, useState, type ReactNode } from 'react';
import { lireNombre, nombre } from '../calc/format';
import type { Nombre } from '../model/types';

export type Unite = '$' | '%' | 'ans' | 'log.' | '$/mois' | '$/an' | '';

function versAffichage(v: number, unite: Unite): string {
  if (unite === '%') return nombre(Math.round(v * 100 * 10_000) / 10_000, 4);
  return nombre(v, 2);
}

function texteDefaut(v: number, unite: Unite): string {
  const t = versAffichage(v, unite);
  if (unite === '%') return `${t} %`;
  if (unite === '' ) return t;
  if (unite === 'ans' || unite === 'log.') return `${t} ${unite}`;
  return `${nombre(Math.round(v), 0)} $`;
}

export function Aide({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="aide-btn"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label="Afficher l'aide"
        title={texte}
        onClick={() => setOuvert((o) => !o)}
      >
        ?
      </button>
      {ouvert && (
        <span id={id} role="note" className="aide-texte">
          {texte}
        </span>
      )}
    </>
  );
}

interface ChampNombreProps {
  label: string;
  valeur: Nombre;
  defaut?: number;
  onChange: (v: Nombre) => void;
  unite?: Unite;
  aide?: string;
}

/** Champ numérique : vide = valeur par défaut (affichée en gris). */
export function ChampNombre({ label, valeur, defaut, onChange, unite = '$', aide }: ChampNombreProps) {
  const id = useId();
  const [texte, setTexte] = useState(valeur === null ? '' : versAffichage(valeur, unite));
  const [focus, setFocus] = useState(false);
  const [invalide, setInvalide] = useState(false);

  useEffect(() => {
    if (!focus) setTexte(valeur === null ? '' : versAffichage(valeur, unite));
  }, [valeur, unite, focus]);

  const suffixe = unite === '$/mois' || unite === '$/an' ? '$' : unite;
  const estDefaut = valeur === null && defaut !== undefined;

  return (
    <div className={`champ ${estDefaut ? 'champ-defaut' : ''}`}>
      <div className="champ-entete">
        <label htmlFor={id}>{label}</label>
        {aide && <Aide texte={aide} />}
      </div>
      <div className="champ-saisie">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={texte}
          placeholder={defaut !== undefined ? versAffichage(defaut, unite) : ''}
          aria-invalid={invalide}
          aria-describedby={estDefaut ? `${id}-d` : undefined}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            setInvalide(false);
          }}
          onChange={(e) => {
            setTexte(e.target.value);
            const n = lireNombre(e.target.value);
            if (n === null) {
              setInvalide(false);
              onChange(null);
            } else if (Number.isNaN(n)) {
              setInvalide(true);
            } else {
              setInvalide(false);
              onChange(unite === '%' ? n / 100 : n);
            }
          }}
        />
        {suffixe && <span className="champ-unite">{suffixe}</span>}
      </div>
      {estDefaut && (
        <span id={`${id}-d`} className="champ-note">
          Défaut utilisé : {texteDefaut(defaut!, unite)}
        </span>
      )}
      {invalide && <span className="champ-erreur">Nombre invalide</span>}
    </div>
  );
}

export function ChampTexte({
  label,
  valeur,
  onChange,
  aide,
  placeholder,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  aide?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="champ">
      <div className="champ-entete">
        <label htmlFor={id}>{label}</label>
        {aide && <Aide texte={aide} />}
      </div>
      <input id={id} type="text" value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ChampChoix<T extends string>({
  label,
  valeur,
  options,
  onChange,
  aide,
}: {
  label: string;
  valeur: T;
  options: { valeur: T; libelle: string }[];
  onChange: (v: T) => void;
  aide?: string;
}) {
  const id = useId();
  return (
    <div className="champ">
      <div className="champ-entete">
        <label htmlFor={id}>{label}</label>
        {aide && <Aide texte={aide} />}
      </div>
      <select id={id} value={valeur} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ChampCase({
  label,
  valeur,
  onChange,
  aide,
}: {
  label: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
  aide?: string;
}) {
  const id = useId();
  return (
    <div className="champ champ-case">
      <div className="champ-entete">
        <input id={id} type="checkbox" checked={valeur} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>{label}</label>
        {aide && <Aide texte={aide} />}
      </div>
    </div>
  );
}

export function Groupe({ titre, children, note }: { titre: string; children: ReactNode; note?: ReactNode }) {
  return (
    <fieldset className="groupe">
      <legend>{titre}</legend>
      {note && <p className="groupe-note">{note}</p>}
      <div className="grille-champs">{children}</div>
    </fieldset>
  );
}

/** Définition déclarative d'un champ numérique, pour générer les formulaires. */
export interface DefChamp<K extends string> {
  cle: K;
  label: string;
  unite?: Unite;
  aide?: string;
}

export function ChampsNombres<K extends string>({
  defs,
  valeurs,
  defauts,
  onChange,
}: {
  defs: DefChamp<K>[];
  valeurs: Record<K, Nombre>;
  defauts: Record<string, number>;
  onChange: (cle: K, v: Nombre) => void;
}) {
  return (
    <>
      {defs.map((d) => (
        <ChampNombre
          key={d.cle}
          label={d.label}
          unite={d.unite}
          aide={d.aide}
          valeur={valeurs[d.cle]}
          defaut={defauts[d.cle]}
          onChange={(v) => onChange(d.cle, v)}
        />
      ))}
    </>
  );
}
