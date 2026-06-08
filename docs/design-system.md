# Design system — givre-reyone

> Inventaire des composants, tokens et patterns validés de ce repo.
> À consulter AVANT de créer tout composant UI. Tout nouveau composant validé doit être ajouté ici.
> Règle globale : ~/.claude/CLAUDE.md (section « Réutilisation de composants UI »).

Stack front : HTML statique servi par **Vite 8** (pas de framework JS), CSS vanilla par fichier de feuille (pas de Tailwind ni de préprocesseur). La landing publique est seedée depuis un fragment HTML pré-publié (`src/fragments/v1-homepage-published.html`) injecté dans `index.html`. L'admin/builder repose sur **GrapesJS 0.22** (page builder) dont le thème est surchargé en local. Fonts auto-hébergées via `@fontsource` (DM Sans, Playfair Display).

Trois univers visuels distincts coexistent (voir Dette) :
- **V1 — landing publique** (clair, jaune/vert) : `src/styles/version-1.css` + `src/styles/base.css`.
- **Admin / builder** (sombre, doré) : `src/styles/admin.css`.
- **Pages légales** (clair, sobre) : `src/styles/legal.css`.

## Tokens

CSS custom properties globales (base, `src/styles/base.css`) :
- `--content-max: 1200px` — largeur de contenu max.
- `--page-gutter: clamp(1.25rem, 3vw, 3rem)` — gouttière latérale responsive.

Palette V1 publique (`:root` de `version-1.css`, préfixe `--v1-*`) :
- Jaune : `--v1-jaune #f5c842` (hover hardcodé `#e6b800`), `--v1-jaune-clair #fff8d6`, `--v1-jaune-pale #fffdf0`, `--v1-or #8c6200`.
- Vert : `--v1-vert #3b7a2e`, `--v1-vert-clair #ebf5e8`, `--v1-vert-fonce #1f4a16`.
- Neutres : `--v1-text #1a1a1a`, `--v1-text-muted #666`, `--v1-blanc #fff`, `--v1-gris-clair #f7f5f0`, `--v1-border rgba(0,0,0,.08)`.

Palette admin/builder (hardcodée, pas de tokens `:root`) : accent doré `#d4a847` / `#f0cb72`, fonds `#090907`→`#0c110d`, texte `#fdfaf4`. Le canvas GrapesJS expose ses propres vars locales `--gr-surface-*`, `--gr-text-*`, `--gr-accent` (scopées sur `.builder-canvas`).

Typographie :
- Public/légal : **Playfair Display** (titres, 700/900) + **DM Sans** (corps, 400/500).
- Admin/builder : **Syne** (chargée via Google Fonts dans les `<head>` de `admin.html`/`builder.html`).

Rayons & ombres (récurrents, non tokenisés) : pills `border-radius: 100px`/`999px` (CTA, badges) ; cartes `20px`/`24px` ; ombre carte `0 12px 40px rgba(0,0,0,.08)`. Transitions standard `0.2s ease` (interactif) / `0.25s ease` (cartes) / `0.8s ease` (reveal).

## Composants / patterns réutilisables

| Élément | Fichier | Rôle | États gérés |
|---|---|---|---|
| `.content-shell` / `.sr-only` / `.reveal` | base.css | Conteneur centré, masquage accessible, animation au scroll | `.reveal.visible` ; respecte `prefers-reduced-motion` |
| `.v1-header` / `.v1-nav` / `.v1-nav-logo` | version-1.css | En-tête sticky public + logo bicolore | sticky, blur ; responsive ≤960px (wrap) |
| `.v1-cta-nav` / `.v1-cta-primary` | version-1.css | Boutons CTA pill (jaune nav / sombre primaire) | `:hover` (lift + couleur) |
| `.v1-hero` (+ `-content`, `-visual`, `-badge`, `-circle`, `-float`, `-proof`) | version-1.css | Hero 2 colonnes avec visuel circulaire et badges flottants | responsive ≤960px (1 col) / ≤480px (float réduit) |
| `.v1-section` / `.v1-section-label` / `.v1-section-title` | version-1.css | Ossature de section (label kicker + titre) | variante `-label-dark` ; `.v1-section-problem` (fond sombre) |
| `.v1-product-card` / `.v1-avantage-card` / `.v1-offre-card` / `.v1-objection-card` / `.v1-testimonial` | version-1.css | Familles de cartes (grilles 3/4 col) | `:hover` (lift / shadow) ; `-featured` (offre sombre) ; 1er enfant produit en jaune |
| `.v1-problem-list` / `.v1-solution-list` / `.v1-check` | version-1.css | Listes problème (puce `-` rouge) vs solution (pastille check jaune) | — |
| `.v1-stats-row` / `.v1-stat-item` / `.v1-stat-num` | version-1.css | Bandeau de stats vert (3 col) | responsive ≤960px (empilé, séparateurs) |
| `.v1-section-contact` / `.v1-contact-card` / `.v1-contact-button` / `.v1-contact-link` | version-1.css | Bloc contact (carte gradient + boutons d'action) | `:hover`, `:focus-visible` (outline) ; `-primary` (gradient vert) ; responsive |
| `.v1-footer` / `.v1-legal-links` | version-1.css | Pied de page sombre + liens légaux | — |
| `.builder-login-card` / `.builder-input` / `.builder-label` / `.builder-status` | admin.css | Carte de connexion admin (form token) | `aria-live` sur status |
| `.builder-button` / `.builder-ghost-button` | admin.css | Boutons admin plein doré / fantôme | `:hover` (bordure) |
| `.builder-toolbar` (+ `-left/-right/-status`) / `.builder-select` | admin.css | Barre d'outils builder sticky | sticky ; responsive ≤900px (statique) / ≤640px (boutons 50%) |
| `.builder-canvas` + surcharges `.gjs-*` | admin.css | Thème sombre GrapesJS (panels, blocks, modales, assets) | `:hover` / `.gjs-pn-active` ; responsive grille blocks |
| `.legal-main` / `.legal-section` / `.legal-back` / `.legal-updated` | legal.css | Gabarit de page légale (carte blanche sur fond crème) | responsive ≤640px |

## Patterns récurrents

- **Conteneur largeur fluide** : `width: min(100% - (var(--page-gutter) * 2), <max>)` répété (header `1320px`, hero `620px`, contact `640px`) plutôt que `.content-shell` partout.
- **CTA pill** : `display: inline-flex; border-radius: 100px; transition; :hover { translateY(-2px) }` — décliné en nav/primary/contact.
- **Carte hover-lift** : `border-radius: 20-24px` + `:hover { translateY(-4px) }` ou shadow, partagé entre product/offre/objection.
- **Section kicker + titre** : `.v1-section-label` (uppercase, letterspacing, vert) suivi de `.v1-section-title` (Playfair).
- **Reveal au scroll** : classe `.reveal` togglée en `.visible` par `src/scripts/reveal.js`.
- **Icônes** : emojis inline pour le public (`.v1-product-card-icon`, `.v1-offre-icon`) ; SVG inline pour les blocs builder (pas de lib d'icônes).
- **Templates de page** : structure HTML générée/migrée via `src/templates/*` + `src/data/pages/*.json` (pages versionnées, migrations par ID — voir README).

## Dette / incohérences relevées

- **Trois palettes/typo non unifiées** : le public (jaune/vert, DM Sans+Playfair, auto-hébergé) et l'admin (doré sombre, Syne via Google Fonts) ne partagent aucun token. `legal.css` réutilise les fonts publiques mais redéfinit ses propres couleurs en dur. Aucune source de tokens commune (`base.css` ne porte que layout).
- **`src/styles/home.css` orpheline** : feuille « compare-home » (fond sombre, fonts **Cormorant Garamond** + Syne) non référencée par aucun HTML/JS du repo, et qui charge des fonts non déclarées ailleurs. Probable vestige de l'A/B `version-1`/`version-2` (les pages `version-1.html`/`version-2.html` redirigent désormais vers `/`). À supprimer ou réintégrer.
- **Valeurs hardcodées hors tokens** : hover jaune `#e6b800`, gradients verts contact (`#2d5f24`→`#3c7a2f`), gris texte cartes (`#555`, `#333`, `#444`), toute la palette admin. Divergent des `--v1-*` qui existent pourtant.
- **Sélecteurs liés à des IDs GrapesJS générés** dans `version-1.css` (ex. `> img#ibh3cx`) : couplage fragile au contenu seedé, casse si le builder régénère l'ID.
