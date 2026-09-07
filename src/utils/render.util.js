import redis from "../config/redis.js";
import { cacheGet, cacheSet } from "../services/cache.service.js";

export function getSessionLocals(req) {
  const user = req.session?.user;
  return {
    username: user?.username || "NotLoggedIn",
    role: user?.role || "NotLoggedIn",
    userLoggedIn: Boolean(user),
  };
}

export async function renderPage(req, res, fileLocation, layout = true, data = {}) {
  return res.render(fileLocation, {
    ...data,
    ...getSessionLocals(req),
    ...(layout === false ? { layout: false } : {}),
  });
}

/**
 * Renders a page with Vercel Edge CDN headers and optional Upstash Redis distributed caching
 */
export async function renderCachedPage(req, res, {
  view,
  data = {},
  cacheKey,
  ttl = 120,
  sMaxAge = 300,
  staleWhileRevalidate = 120,
  headers = {},
}) {
  res.set({
    "Cache-Control": `public, max-age=${ttl}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    Vary: "Accept-Encoding",
    ...headers,
  });

  const isguest = !req.session?.user;

  if (isguest && redis && cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.send(cached);
  }

  const renderOptions = {
    ...data,
    ...getSessionLocals(req),
  };

  return res.render(view, renderOptions, async (err, html) => {
    if (err) {
      console.error(`Render error for ${view}:`, err);
      return res.status(500).send("Render error");
    }
    if (isguest && redis && cacheKey) {
      cacheSet(cacheKey, html, ttl).catch((e) => console.error("Cache set error:", e));
    }
    res.send(html);
  });
}

export default renderPage;
