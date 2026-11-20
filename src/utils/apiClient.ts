/**
 * Shared cPanel/WAF-resilient API transport for Ashk Ghalam.
 * Automatically falls back from `/api/<route>` to `/api.php?r=<route>`
 * and encodes JSON payloads into a Base64 FormData binary Blob (`payload_file`)
 * whenever Apache/LiteSpeed/ModSecurity WAF returns HTTP 403/404/405 or HTML.
 */

export interface ApiJsonResult<T = unknown> {
  res: Response;
  data: T | null;
}

function normalizeRoute(route: string): { path: string; query: string } {
  const clean = route.replace(/^\/?(api\/)?/, '').replace(/^\/+/, '');
  const qIdx = clean.indexOf('?');
  if (qIdx >= 0) {
    return {
      path: clean.slice(0, qIdx).replace(/^\/+/, ''),
      query: clean.slice(qIdx + 1),
    };
  }
  return { path: clean, query: '' };
}

export function buildDirectPhpUrl(route: string): string {
  const { path, query } = normalizeRoute(route);
  const base = `/api.php?r=${encodeURIComponent(path)}`;
  return query ? `${base}&${query}` : base;
}

export function buildStandardApiUrl(route: string): string {
  const { path, query } = normalizeRoute(route);
  const base = `/api/${path}`;
  return query ? `${base}?${query}` : base;
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function isJsonContentType(res: Response): boolean {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return ct.includes('application/json');
}

function shouldFallback(res: Response): boolean {
  if (res.status === 403 || res.status === 404 || res.status === 405 || res.status === 406) {
    return true;
  }
  if (!isJsonContentType(res)) {
    return true;
  }
  return false;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function apiFetch(
  route: string,
  options: RequestInit = {},
  timeoutMs = 20000
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const standardUrl = buildStandardApiUrl(route);
  const phpUrl = buildDirectPhpUrl(route);
  const { path: routePath } = normalizeRoute(route);

  let firstRes: Response | null = null;
  try {
    firstRes = await fetchWithTimeout(standardUrl, options, timeoutMs);
    if (!shouldFallback(firstRes)) {
      return firstRes;
    }
  } catch {
    firstRes = null;
  }

  // Stage 2: Direct /api.php?r=... bypasses .htaccess mod_rewrite / 403
  let secondRes: Response | null = null;
  try {
    secondRes = await fetchWithTimeout(phpUrl, options, timeoutMs);
    if (!shouldFallback(secondRes)) {
      return secondRes;
    }
  } catch {
    secondRes = null;
  }

  // Stage 3 & 4: Bypass ModSecurity / Comodo WAF / Imunify360 blocking JSON strings on POST
  const bodyStr = typeof options.body === 'string' ? options.body : null;
  if (method === 'POST' && bodyStr !== null) {
    try {
      const b64 = utf8ToBase64(bodyStr);
      const fd = new FormData();
      fd.append('r', routePath);
      fd.append('_encoding', 'b64');
      fd.append(
        'payload_file',
        new Blob([b64], { type: 'application/octet-stream' }),
        'sync.dat'
      );
      const wafSafeRes = await fetchWithTimeout(
        phpUrl,
        {
          method: 'POST',
          body: fd,
        },
        timeoutMs
      );
      if (!shouldFallback(wafSafeRes)) {
        return wafSafeRes;
      }
      secondRes = wafSafeRes;
    } catch {
      // Fall through to Stage 4
    }

    // Stage 4: URL-encoded base64 fallback (works even if PHP file_uploads is disabled)
    try {
      const b64 = utf8ToBase64(bodyStr);
      const params = new URLSearchParams();
      params.set('r', routePath);
      params.set('_b64', b64);
      const urlEncodedRes = await fetchWithTimeout(
        phpUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        },
        timeoutMs
      );
      if (!shouldFallback(urlEncodedRes)) {
        return urlEncodedRes;
      }
      secondRes = urlEncodedRes;
    } catch {
      // Return best captured response below
    }
  }

  if (secondRes) return secondRes;
  if (firstRes) return firstRes;
  throw new Error('ارتباط با سرور برقرار نشد.');
}

export async function apiRequestJson<T = any>(
  route: string,
  options: RequestInit = {},
  timeoutMs = 20000
): Promise<ApiJsonResult<T>> {
  const res = await apiFetch(route, options, timeoutMs);
  const data = (await res.json().catch(() => null)) as T | null;
  return { res, data };
}

export async function apiPostJson<T = any>(
  route: string,
  payload: unknown,
  timeoutMs = 25000
): Promise<ApiJsonResult<T>> {
  return apiRequestJson<T>(
    route,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    timeoutMs
  );
}
