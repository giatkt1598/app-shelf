import { load } from 'cheerio';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

export type Metadata = { title?: string; faviconUrl?: string };

const isPrivateIp = (ip: string) => {
  if (net.isIP(ip) === 6) return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:') || ip === '::';
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
};

const isLoopbackIp = (ip: string) => ip === '::1' || ip.startsWith('127.');
const normalizeHost = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, '');
const isLoopbackHost = (host: string) => { const normalized = normalizeHost(host); return normalized === 'localhost' || isLoopbackIp(normalized); };

/**
 * Docker containers have their own loopback interface. When configured, route
 * only user-supplied loopback URLs through Docker's host gateway while keeping
 * the original URL for metadata and favicon output.
 */
export function resolveMetadataFetchUrl(url: URL): URL {
  const gateway = process.env.LOCALHOST_METADATA_GATEWAY?.trim();
  if (!gateway || !isLoopbackHost(url.hostname)) return url;
  const target = new URL(url);
  target.hostname = gateway;
  return target;
}

export async function validatePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('URL không hợp lệ.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Chỉ hỗ trợ URL HTTP hoặc HTTPS.');
  if (url.username || url.password) throw new Error('URL không được chứa thông tin đăng nhập.');
  const addresses = await lookup(url.hostname, { all: true });
  const isLocalhost = isLoopbackHost(url.hostname);
  if (!addresses.length || (isLocalhost ? addresses.some(({ address }) => !isLoopbackIp(address)) : addresses.some(({ address }) => isPrivateIp(address)))) throw new Error('Không thể truy cập địa chỉ nội bộ.');
  return url;
}

async function fetchPage(initial: URL): Promise<{ html: string; url: URL }> {
  let displayUrl = initial;
  for (let redirects = 0; redirects < 4; redirects++) {
    await validatePublicUrl(displayUrl.href);
    const response = await fetch(resolveMetadataFetchUrl(displayUrl), { redirect: 'manual', signal: AbortSignal.timeout(7000), headers: { 'user-agent': 'AppShelf metadata fetcher/1.0', accept: 'text/html,application/xhtml+xml' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect không hợp lệ.');
      displayUrl = new URL(location, displayUrl);
      continue;
    }
    if (!response.ok) throw new Error(`Không thể tải trang (${response.status}).`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) throw new Error('URL không trả về trang HTML.');
    return { html: await response.text(), url: displayUrl };
  }
  throw new Error('Quá nhiều redirect.');
}

export async function getMetadata(rawUrl: string): Promise<Metadata> {
  const page = await fetchPage(await validatePublicUrl(rawUrl));
  const $ = load(page.html);
  const title = $('meta[property="og:title"]').attr('content')?.trim() || $('title').first().text().replace(/\s+/g, ' ').trim() || undefined;
  const selector = 'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';
  const href = $(selector).first().attr('href');
  return { title, faviconUrl: href ? new URL(href, page.url).href : new URL('/favicon.ico', page.url).href };
}
