import { createHash } from "node:crypto";
import { kvEnabled } from "./store.mjs";

const memoryCounters = new Map();

function getForwardedIp(req) {
  if (typeof req.headers?.get === "function") {
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) {
      return cfIp;
    }
    const fwd = req.headers.get("x-forwarded-for") || "";
    if (fwd) {
      return String(fwd).split(",")[0].trim();
    }
  }

  const forwardedFor = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"] || "";
  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return (
    req.headers?.["x-real-ip"] ||
    req.headers?.["X-Real-IP"] ||
    req.socket?.remoteAddress ||
    ""
  );
}

async function getVercelKvClient() {
  const mod = await import("@vercel/kv");
  return mod.kv;
}

async function getKvCounter(key, windowSeconds, runtimeEnv) {
  if (runtimeEnv?.BUILDER_KV?.get && runtimeEnv?.BUILDER_KV?.put) {
    const now = Date.now();
    const stored = await runtimeEnv.BUILDER_KV.get(key, { type: "json" });
    const expiresAt = Number(stored?.expiresAt || 0);
    const count = Number(stored?.count || 0);
    const isExpired = !expiresAt || expiresAt <= now;
    const nextCount = isExpired ? 1 : count + 1;
    const nextExpiresAt = isExpired ? now + windowSeconds * 1000 : expiresAt;

    await runtimeEnv.BUILDER_KV.put(
      key,
      JSON.stringify({ count: nextCount, expiresAt: nextExpiresAt }),
      { expirationTtl: windowSeconds }
    );

    return {
      count: nextCount,
      retryAfter: Math.max(1, Math.ceil((nextExpiresAt - now) / 1000))
    };
  }

  const client = await getVercelKvClient();
  const count = await client.incr(key);
  if (count === 1) {
    await client.expire(key, windowSeconds);
  }

  return {
    count,
    retryAfter: windowSeconds
  };
}

function hashIp(ip) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

function getMemoryBucket(key, windowSeconds) {
  const now = Date.now();
  const existing = memoryCounters.get(key);

  if (!existing || existing.expiresAt <= now) {
    const next = {
      count: 0,
      expiresAt: now + windowSeconds * 1000
    };
    memoryCounters.set(key, next);
    return next;
  }

  return existing;
}

export async function enforceRateLimit(req, {
  namespace,
  limit = 5,
  windowSeconds = 3600,
  runtimeEnv
}) {
  const ip = getForwardedIp(req);
  if (!ip) {
    return { allowed: true, remaining: limit };
  }

  const key = `rate:${namespace}:${hashIp(ip)}`;

  if (kvEnabled(runtimeEnv)) {
    const counter = await getKvCounter(key, windowSeconds, runtimeEnv);

    return {
      allowed: counter.count <= limit,
      remaining: Math.max(0, limit - counter.count),
      retryAfter: counter.retryAfter
    };
  }

  const bucket = getMemoryBucket(key, windowSeconds);
  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.expiresAt - Date.now()) / 1000))
  };
}
