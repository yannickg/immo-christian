# Simulateur immobilier : vendre 3 immeubles, en acheter 1 récent

Application web en français (Québec) pour comparer quatre scénarios d'investissement locatif et juger si le flux monétaire net
après impôt permettrait de cesser de travailler.

- **A.** Statu quo
- **B.** Vendre les immeubles actuels et acheter un immeuble récent
- **C.** Refinancer un ou plusieurs immeubles actuels pour dégager la mise de fonds, puis acheter
- **D.** Comme B, avec étalement des ventes sur 2 ou 3 ans ou réserve pour solde de prix de vente (jusqu'à 5 ans)

> Simulateur éducatif. Ce n'est pas un conseil financier, fiscal ou juridique. Les impôts sont des estimations : fais valider par
> un comptable ou fiscaliste et par un courtier commercial ou un prêteur avant toute transaction.

## Lancer l'application

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

```bash
npm test           # tests unitaires des formules (Vitest)
npm run build      # vérification des types + version de production dans dist/
npm run preview    # servir la version de production
```

L'application est 100 % locale : pas de serveur ni de compte. Les données sont enregistrées automatiquement dans le navigateur
(localStorage) et peuvent être exportées ou importées en JSON. Le bouton **Imprimer / PDF** produit un rapport : choisis
« Enregistrer au format PDF » dans la fenêtre d'impression.

Au premier lancement, un jeu d'exemple fictif est chargé : 3 triplex à 700 $/mois (valeur totale de 1 000 000 $), comparés à un
immeuble récent de 11 logements à 1 000 $/mois, acheté 1 000 000 $ avec une mise de fonds de 500 000 $. Le bouton « repars de
zéro » efface tout.

## Structure

```
src/
  config/hypotheses.ts   ← SEUL fichier des hypothèses fiscales, de financement, de marché et des valeurs par défaut
  model/
    types.ts             ← modèle de données (champ vide = null = valeur par défaut)
    defaults.ts          ← calcul des valeurs par défaut et « résolution » du projet
    projets.ts           ← projet vide et jeu d'exemple
    stockage.ts          ← localStorage, export et import JSON (avec validation)
  calc/
    hypotheque.ts        ← paiement canadien (composition semestrielle), solde, année d'amortissement
    fiscal.ts            ← paliers fédéral et Québec, impôt incrémental, société, droits de mutation
    vente.ts             ← gain en capital, récupération d'amortissement, impôt sur la vente, réserve
    exploitation.ts      ← revenus, dépenses, RNE, RCD, TGA, cash-on-cash
    projection.ts        ← projection sur 10 ans (flux, impôt, DPA, équité)
    scenarios.ts         ← scénarios A, B, C et D
    analyses.ts          ← alertes, sensibilité, seuil d'équilibre, point d'entrée analyser()
    __tests__/           ← tests unitaires
  ui/                    ← formulaires (étapes), résultats, graphiques, « Comment ça marche »
```

Le parcours suit ces étapes : Profil → Immeubles actuels → Immeuble visé → Hypothèses fiscales → Résultats, plus une page
« Comment ça marche » qui détaille les formules.

## Mettre à jour les hypothèses fiscales

Tout se trouve dans [`src/config/hypotheses.ts`](src/config/hypotheses.ts) :

1. Modifie les valeurs voulues : paliers d'imposition fédéral et du Québec, montants personnels de base, taux d'inclusion, taux des
   sociétés, barème des droits de mutation, règles de financement, hypothèses de marché, valeurs par défaut des champs.
2. Mets à jour `dateMiseAJour` (et `anneeFiscale` au besoin). Cette date s'affiche dans l'application.
3. Lance `npm test`. Certains tests vérifient des valeurs de référence; ajuste-les si tu changes volontairement un taux.

Tous les taux sont en décimales (0,05 = 5 %). Les paliers sont indiqués par leur seuil inférieur.

## Hypothèses et simplifications principales

- Impôt des particuliers calculé par paliers fédéral et Québec avec l'abattement du Québec et les montants personnels de base
  seulement. L'IMR, les cotisations et les autres crédits ne sont pas inclus.
- L'année de la vente, le gain imposable et la récupération s'ajoutent au revenu d'emploi et aux autres revenus. L'impôt sur les
  loyers est calculé comme si tu ne travaillais plus.
- Mode société : estimation simplifiée (impôt sur le revenu de placement, IMRTD, dividendes non déterminés).
- Les hypothèques sont renouvelées au même taux. Les loyers, les dépenses et les valeurs croissent à taux constant.
- La DPA future est désactivée par défaut, par prudence.

## Points à faire valider

**Avec un comptable ou fiscaliste**

- Prix de base rajusté réel, DPA déjà déduite (FNACC) et répartition terrain / bâtiment de chaque immeuble
- Impôt réel l'année de la vente, y compris l'impôt minimum de remplacement
- Calendrier de vente : étalement ou réserve pour solde de prix de vente
- Détention personnelle ou par société (roulement art. 85 / 518 : l'impôt est reporté, il ne disparaît pas)
- Exemption pour résidence principale si tu as habité un des immeubles
- Déductibilité des intérêts d'un refinancement; DPA sur l'immeuble récent; TPS/TVQ si l'immeuble est neuf et acheté du
  constructeur

**Avec un courtier commercial ou un prêteur**

- Valeur marchande réaliste des immeubles actuels et frais de vente (pénalités hypothécaires exactes)
- Prix réaliste d'un immeuble récent de 10 à 12 logements dans la région (prix par porte, TGA des ventes comparables)
- Loyers atteignables et inoccupation locale (rapport SCHL sur le marché locatif)
- Dépenses réelles de l'immeuble visé (états financiers, baux)
- Conditions de financement : RCD exigé, ratio prêt/valeur, taux, amortissement, admissibilité et prime SCHL
- Montant de refinancement réellement accordé sur les immeubles actuels (scénario C)
