import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

const blocked = new BlockList();
for (const [ip, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3]]) blocked.addSubnet(ip, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [ip, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]]) blocked.addSubnet(ip, prefix, "ipv6");

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function publicUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) throw new Error("unsupported_url");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host)) throw new Error("private_host");
  if (/\.(?:localhost|local|internal|test|invalid)$/i.test(host) || (isIP(host) && !isPublicAddress(host))) throw new Error("private_host");
  return url;
}

export function extractPublicLinks(text, limit = 3) {
  const urls = new Set();
  for (const match of String(text || "").matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/giu)) {
    try {
      let value = match[0].replace(/[),.!?;:।،]+$/u, "");
      if (value.startsWith("www.")) value = `https://${value}`;
      let url = publicUrl(value);
      if (["l.facebook.com", "lm.facebook.com", "l.instagram.com"].includes(url.hostname) && url.searchParams.get("u")) url = publicUrl(url.searchParams.get("u"));
      url.hash = "";
      urls.add(url.href);
    } catch { /* Invalid or private links are not context sources. */ }
    if (urls.size >= limit) break;
  }
  return [...urls];
}

// Resolve and pin the connection IP on EVERY hop; validation must not be
// followed by a second DNS lookup (DNS rebinding). Never forward Meta tokens.
export async function readPublicLink(value, { resolve = lookup, requestHttp = httpRequest, requestHttps = httpsRequest } = {}) {
  let url = publicUrl(value);
  const deadline = Date.now() + 10000;
  for (let hop = 0; hop <= 3; hop += 1) {
    let timer;
    const remaining = () => Math.max(1, deadline - Date.now());
    let addresses;
    try {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([
        resolve(host, { all: true, verbatim: true }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("dns_timeout")), remaining()); }),
      ]);
    } finally { clearTimeout(timer); }
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("private_address");
    const target = addresses[0];
    const result = await new Promise((resolveResult, reject) => {
      const request = (url.protocol === "https:" ? requestHttps : requestHttp)(url, {
        method: "GET",
        agent: false,
        signal: AbortSignal.timeout(remaining()),
        headers: { Accept: "text/html,text/plain", "Accept-Encoding": "identity", "User-Agent": "StorefrontCommentContext/1.0" },
        lookup: (_hostname, options, callback) => options?.all
          ? callback(null, [target]) : callback(null, target.address, target.family),
      }, (response) => {
        response.on("error", reject);
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          response.destroy();
          resolveResult({ location });
          return;
        }
        if (response.statusCode !== 200 || !/^(text\/html|text\/plain)(?:;|$)/i.test(response.headers["content-type"] || "") || ![undefined, "identity"].includes(response.headers["content-encoding"])) {
          response.destroy();
          reject(new Error("unsupported_response"));
          return;
        }
        let length = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          length += chunk.length;
          if (length > 128 * 1024) {
            response.destroy();
            reject(new Error("page_too_large"));
          } else chunks.push(chunk);
        });
        response.on("end", () => resolveResult({ url: url.href, body: Buffer.concat(chunks).toString("utf8") }));
      });
      request.on("error", reject);
      request.end();
    });
    if (result.body !== undefined) return result;
    if (!result.location || hop === 3 || Date.now() >= deadline) throw new Error("redirect_limit");
    url = publicUrl(new URL(result.location, url).href);
  }
  throw new Error("unreadable_link");
}
