export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return null;
  return JSON.parse(body);
}

export async function readBuffer(req, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new Error("payload_too_large");
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}
