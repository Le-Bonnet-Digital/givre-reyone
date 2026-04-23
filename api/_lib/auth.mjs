export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

export function isAdminTokenValid(req) {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) return false;
  const got = getBearerToken(req);
  return got && got === expected;
}
