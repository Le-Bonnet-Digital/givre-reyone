# Migration Cloudflare (sans Supabase)

## Prerequis

- Creer un namespace KV et un bucket R2.
- Renseigner `wrangler.jsonc` avec les IDs reels.
- Declarer les secrets Worker:
  - `ADMIN_TOKEN`
  - `GITHUB_TOKEN`
  - `BREVO_API_KEY` (si endpoint contact conserve)
  - `CONTACT_TO_EMAIL`
  - `CONTACT_FROM_EMAIL`
  - `CONTACT_FROM_NAME`

## Variables utiles

- `R2_PUBLIC_BASE_URL`: URL publique du bucket (optionnelle, sinon `r2://` est retourne en interne).
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`: overrides du depot de publication.

## Ordre de bascule recommande

1. `npm run dev:cloudflare` pour valider localement les routes API.
2. `npm run test:e2e:cloudflare` pour valider la convergence admin/builder sur le runtime Worker (voir ci-dessous).
3. `npm run cf:migrate:data` (dry-run).
4. `npm run cf:migrate:data -- --write` pour migrer les pages vers KV/R2.
5. `npm run deploy:cloudflare` sur environnement preview.
6. Executer E2E builder + smoke sur l'URL preview.
7. Promouvoir en production.

## Plan de rollback

1. Repointage DNS/edge vers backend precedent (ou desactivation route Worker).
2. Relancer backend precedent (`npm run dev:vercel` pour environnements de test).
3. Conserver les secrets GitHub identiques pour eviter divergence de publish.
4. Investiguer l'erreur puis redeployer Cloudflare en preview avant nouvelle tentative.

## Verification de convergence

- `GET /api/admin/ping` retourne `kvEnabled=true` et `blobEnabled=true`.
- `Save Draft` persiste un pointeur KV `builder:<page>`.
- `Publish` commit bien vers GitHub avec detection de conflits SHA.
- Upload asset retourne une URL R2 (ou `r2://` sans base publique configuree).

### Suite E2E automatisee (runtime Worker)

`npm run test:e2e:cloudflare` execute une suite Playwright dediee
(`playwright.cloudflare.config.ts` + `tests/e2e-cloudflare/worker.spec.ts`)
qui demarre un `wrangler dev` local (Miniflare, bindings preview
`BUILDER_KV` / `BUILDER_R2` simules localement, sans secret ni acces
production) et exerce les routes admin de `worker.mjs` :

- `ping` : 401 sans token ; `ok/kvEnabled/blobEnabled = true` avec token.
- `save-draft` : pointeur draft persiste vers R2 (`r2://builder/<page>/draft-*.json`) ;
  validation `400 invalid_payload` ; `401` sans token.
- `reset` : `draft` remis a `null`.
- `upload` : `200` avec `storage:"r2"` et URL `r2://builder-assets/...`.
- `load` / `publish` : contrats d'auth (`401`) et de validation (`400`)
  toujours verifies ; le round-trip Git complet n'est exerce que si
  `GITHUB_TOKEN` est fourni a l'environnement.

Variables d'environnement utiles :

- `E2E_ADMIN_TOKEN` (ou `ADMIN_TOKEN`) : token admin injecte dans le Worker
  via `--var` ; un defaut deterministe est utilise si absent.
- `GITHUB_TOKEN` : optionnel ; active le test de round-trip Git `load`+`publish`.
- `E2E_CLOUDFLARE_PORT` : port du `wrangler dev` local (defaut `8788`).
- `E2E_SKIP_CLOUDFLARE=1` : ne demarre pas `wrangler dev` et skippe la suite
  (a utiliser si l'environnement empeche d'executer `wrangler` localement).

La suite est independante de la suite Vercel (`playwright.config.ts`) :
`testDir`, port et serveur distincts ; `test:e2e:smoke` et `test:e2e:builder`
ne sont pas affectes.
