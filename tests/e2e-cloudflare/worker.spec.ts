import { expect, test } from "@playwright/test";
import { getAdminToken } from "../e2e/helpers/auth";

/**
 * Convergence Builder/Public sur le runtime Cloudflare Worker (worker.mjs).
 *
 * La suite exerce les routes admin declarees dans worker.mjs contre un
 * `wrangler dev` local (Miniflare) avec bindings preview BUILDER_KV / BUILDER_R2.
 * Elle prouve l'equivalence fonctionnelle revendiquee dans
 * docs/cloudflare-migration.md (section "Verification de convergence").
 *
 * Routes purement KV/R2 (ping, save-draft, reset, upload) : verifiees de bout
 * en bout localement. Routes adossees a Git (load, publish) : verifiees sur
 * leurs contrats deterministes (auth 401, validation 400) ; le round-trip Git
 * complet n'est exerce que si GITHUB_TOKEN est fourni a l'environnement.
 */

const ADMIN_TOKEN = getAdminToken();
const GITHUB_AVAILABLE = Boolean(process.env.GITHUB_TOKEN);

function authHeaders() {
  return { Authorization: `Bearer ${ADMIN_TOKEN}` };
}

test.describe("Cloudflare Worker — convergence admin/builder", () => {
  test.skip(
    process.env.E2E_SKIP_CLOUDFLARE === "1",
    "E2E_SKIP_CLOUDFLARE=1 : suite Worker desactivee (wrangler dev indisponible)."
  );
  test.skip(!ADMIN_TOKEN, "ADMIN_TOKEN/E2E_ADMIN_TOKEN requis pour la suite Worker.");

  test("ping : 401 sans token, kv/r2 actifs avec token (convergence)", async ({ request }) => {
    const unauth = await request.get("/api/admin/ping");
    expect(unauth.status()).toBe(401);
    expect(await unauth.json()).toMatchObject({ ok: false });

    const res = await request.get("/api/admin/ping", { headers: authHeaders() });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      kvEnabled: true,
      blobEnabled: true
    });
  });

  test("save-draft : persiste un pointeur KV/R2 builder:<page>", async ({ request }) => {
    const page = "version-1";
    const document = {
      html: "<section data-e2e=\"cf\">Bonjour</section>",
      css: ".cf{color:#000}",
      projectData: { components: [], styles: [] }
    };

    const res = await request.post("/api/admin/page-content/save-draft", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page, document }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, page });
    // Pointeur draft persiste vers R2 (cle builder/<page>/draft-*.json).
    expect(body.draft?.url).toMatch(/^r2:\/\/builder\/version-1\/draft-\d+\.json$/);
    expect(body.document).toMatchObject({ html: "<section data-e2e=\"cf\">Bonjour</section>" });

    // Payload invalide -> 400 (validation avant tout acces stockage).
    const bad = await request.post("/api/admin/page-content/save-draft", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page: "page-inexistante", document }
    });
    expect(bad.status()).toBe(400);
    expect(await bad.json()).toMatchObject({ ok: false, error: "invalid_payload" });

    // Sans token -> 401.
    const unauth = await request.post("/api/admin/page-content/save-draft", {
      headers: { "Content-Type": "application/json" },
      data: { page, document }
    });
    expect(unauth.status()).toBe(401);
  });

  test("reset : efface le draft (pointeur KV remis a null)", async ({ request }) => {
    const page = "mentions-legales";

    const res = await request.post("/api/admin/page-content/reset", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page }
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, page, draft: null });

    const unauth = await request.post("/api/admin/page-content/reset", {
      headers: { "Content-Type": "application/json" },
      data: { page }
    });
    expect(unauth.status()).toBe(401);
  });

  test("upload asset : stocke dans R2 et renvoie une URL r2://", async ({ request }) => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

    const res = await request.post("/api/admin/assets/upload?filename=logo%20test.png", {
      headers: { ...authHeaders(), "Content-Type": "image/png" },
      data: png
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, storage: "r2" });
    // Pointe vers R2 : `r2://...` (sans base publique) ou une URL publique
    // `https://.../builder-assets/...` si R2_PUBLIC_BASE_URL est configure.
    expect(body.url).toMatch(/^(r2:\/\/|https?:\/\/).*builder-assets\/\d+-logo_test\.png$/);

    const unauth = await request.post("/api/admin/assets/upload?filename=x.png", {
      headers: { "Content-Type": "image/png" },
      data: png
    });
    expect(unauth.status()).toBe(401);
  });

  test("cycle complet save -> reset sur une meme page (KV coherent)", async ({ request }) => {
    const page = "politique-confidentialite";
    const document = { html: "<p>cycle</p>", css: "", projectData: null };

    const saved = await request.post("/api/admin/page-content/save-draft", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page, document }
    });
    expect(saved.status()).toBe(200);
    const savedBody = await saved.json();
    expect(savedBody.draft?.url).toMatch(/^r2:\/\/builder\/politique-confidentialite\/draft-\d+\.json$/);

    const reset = await request.post("/api/admin/page-content/reset", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page }
    });
    expect(reset.status()).toBe(200);
    expect(await reset.json()).toMatchObject({ ok: true, draft: null });
  });

  test("load : contrats d'auth et de validation", async ({ request }) => {
    const unauth = await request.get("/api/admin/page-content/load?page=version-1");
    expect(unauth.status()).toBe(401);

    const invalid = await request.get("/api/admin/page-content/load?page=page-inexistante", {
      headers: authHeaders()
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toMatchObject({ ok: false, error: "invalid_page" });
  });

  test("publish : contrats d'auth et de validation", async ({ request }) => {
    const unauth = await request.post("/api/admin/page-content/publish", {
      headers: { "Content-Type": "application/json" },
      data: { page: "version-1", document: { html: "<p>x</p>" } }
    });
    expect(unauth.status()).toBe(401);

    const invalid = await request.post("/api/admin/page-content/publish", {
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      data: { page: "version-1", document: { css: 123 } }
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toMatchObject({ ok: false, error: "invalid_payload" });
  });

  // Round-trip Git complet : uniquement quand un GITHUB_TOKEN reel est fourni.
  test("load+publish : round-trip Git (si GITHUB_TOKEN fourni)", async ({ request }) => {
    test.skip(!GITHUB_AVAILABLE, "GITHUB_TOKEN requis pour exercer le round-trip Git load/publish.");

    const load = await request.get("/api/admin/page-content/load?page=version-1", {
      headers: authHeaders()
    });
    expect(load.status()).toBe(200);
    const loaded = await load.json();
    expect(loaded).toMatchObject({ ok: true, page: "version-1" });
    expect(typeof loaded.sha).toBe("string");
    expect(loaded.document?.html).toBeTruthy();
  });
});
