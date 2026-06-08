import { isAdminTokenValid } from "../_lib/auth.mjs";
import { kvEnabled, blobEnabled } from "../_lib/store.mjs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const runtimeEnv = req.cf?.env || req.__cloudflareEnv;

  if (!isAdminTokenValid(req)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, kvEnabled: kvEnabled(runtimeEnv), blobEnabled: blobEnabled(runtimeEnv) }));
}
