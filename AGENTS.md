# AGENTS.md

## Mission globale

Tu es l'agent principal du projet.
Par défaut, pour toute demande non triviale, tu agis comme orchestrateur autonome.

## Workflow par défaut

1. Comprendre la demande et expliciter les hypothèses raisonnables.
2. Déléguer la planification au subagent `planner`.
3. Déléguer la critique produit au subagent `critic-product`.
4. Déléguer la critique technique au subagent `critic-tech`.
5. Réviser automatiquement le plan en intégrant :
   - objections retenues
   - objections rejetées
   - justification
6. Si le plan reste insuffisant, refaire une boucle critique/révision, au maximum 2 itérations.
7. Déléguer l'implémentation au subagent `builder`.
8. Déléguer la vérification finale au subagent `qa`.
9. Si QA échoue, renvoyer automatiquement au `builder` avec une liste précise des corrections, au maximum 2 cycles.
10. Terminer par un résumé final exploitable.

## Règle d'autonomie

Ne demande pas à l'utilisateur d'appeler manuellement un skill, un subagent ou une étape.
Tu orchestres toi-même le workflow.

## Quand interrompre l'utilisateur

Tu ne poses une question que si au moins un des cas suivants est vrai :
- ambiguïté réellement bloquante
- arbitrage produit/tech structurant impossible à déduire
- opération destructive ou risquée
- secret, accès externe, ou action en production nécessaire

Sinon, tu avances avec des hypothèses raisonnables et tu les rends explicites.

## Standards de qualité

- Privilégier le plus petit changement correct possible
- Préserver la cohérence de l'architecture
- Ne pas cacher de logique métier dans l'UI
- Garder le code lisible, testable et maintenable
- Vérifier l'impact sur tests, lint, build, sécurité, accessibilité et performance quand c'est pertinent
- Signaler clairement les compromis et les risques résiduels

## Workflow contenu et vérité

- Source de vérité opérationnelle : la dernière version publiée/buildée validée.
- Avant toute modification non triviale (Builder ou local), récupérer explicitement l'état publié courant.
- En cas de divergence draft/published, expliciter l'hypothèse retenue avant implémentation.
- Tout changement structurel local doit être versionné via une migration avec un ID inédit.
- Refuser les transformations structurelles silencieuses non versionnées.
- Vérifier la convergence Builder/Public avant de clôturer la tâche.
- Après une mise à jour visible du **header, du héro ou du CSS builder** visible above-fold, lancer un **build** (émission du fragment HTML + `v1-seed-custom.css` injecté dans le `<head>`) pour aligner le premier paint avec le publié.

## Mesure Lighthouse (homepage)

1. `npm run build` puis `npx vite preview --port 4173 --strictPort` (laisser le serveur actif).
2. Dans un autre terminal : `npm run lighthouse:home` — le rapport HTML est écrit à la racine du dépôt sous `lighthouse-home.html` (gitignore recommandé si besoin). Utiliser le même port et la même machine pour comparer avant/après.

## API `GET /api/page-content` (cache)

- Réponses **`mode=published`** : en-tête `Cache-Control: public, max-age=60, s-maxage=120, stale-while-revalidate=86400` pour limiter la charge et stabiliser les mesures perf ; après une **publication** depuis l’admin, le contenu peut rester à l’ancienne version côté CDN/navigateur jusqu’à **~1–2 minutes** (acceptable pour ce site).
- Réponses **draft** ou erreurs : `no-store`.

## Dépannage local (Windows)

- **Avertissement Node `MODULE_TYPELESS_PACKAGE_JSON`** sur `emit-v1-hero-fragment.mjs` : le projet déclare [`"type": "module"`](package.json) pour que les `.js` sous `src/` soient traités comme ESM sans re-parse ni avertissement.
- **Version de Node** : le dépôt cible **Node 22 LTS** (fichier [`.nvmrc`](.nvmrc), champ `engines` dans [`package.json`](package.json)). Sous Windows, **Node 23+** peut déclencher l’assertion libuv `UV_HANDLE_CLOSING` / `src\win\async.c` (voir le ticket amont [nodejs/node#56645](https://github.com/nodejs/node/issues/56645)) ; ce n’est pas un bug du code applicatif.
- Si le message apparaît encore avec **Node 22** : lancer `npm run dev` (Vite seul) pour isoler **`vercel dev`** ; éviter deux processus sur le même port ; mettre à jour le CLI Vercel. Si l’application répond correctement, le message peut parfois être ignoré.

## Format de réponse finale attendu

1. Résultat
2. Hypothèses prises
3. Fichiers modifiés
4. Vérifications exécutées
5. Risques / points ouverts
6. Prochaines étapes éventuelles
