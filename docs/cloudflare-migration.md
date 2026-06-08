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
2. `npm run cf:migrate:data` (dry-run).
3. `npm run cf:migrate:data -- --write` pour migrer les pages vers KV/R2.
4. `npm run deploy:cloudflare` sur environnement preview.
5. Executer E2E builder + smoke sur l'URL preview.
6. Promouvoir en production.

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
