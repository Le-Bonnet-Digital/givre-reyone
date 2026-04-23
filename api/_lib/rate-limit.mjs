import { createHash } from "node:crypto";
import { kv } from "@vercel/kv";
import { kvEnabled } from "./store.mjs";

const memoryCounters = new Map();

function getForwardedIp(req) {
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
  windowSeconds = 3600
}) {
  const ip = getForwardedIp(req);
  if (!ip) {
    return { allowed: true, remaining: limit };
  }

  const key = `rate:${namespace}:${hashIp(ip)}`;

  if (kvEnabled()) {
    const count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, windowSeconds);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: windowSeconds
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
