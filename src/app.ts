import express, { type NextFunction, type Request, type Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { ROOT, config, env } from './config.js';
import { Limiter, checkMessage, readView, type Store } from './rules.js';
import { openStore } from './store.js';

/**
 * The site's own server (docs/39 in UniversalIDE): the site from site/, its forms' messages and its
 * page views. src/server.ts runs it with PORT, DATA_DIR and ADMIN_KEY (see README.md); a serverless
 * host runs this app itself (api/index.js).
 */

const { messages, rules } = config;
const SITE = join(ROOT, 'site');
const EMBEDS = join(SITE, '_embeds') + sep;
const notFoundPage = readFileSync(new URL('../not-found.html', import.meta.url), 'utf8');
// Opened once, on the first request that needs it; tried again after a failure.
let opening: Promise<Store | null> | null = null;
const storeOf = () => (opening ??= openStore().catch((e: unknown) => {
  opening = null;
  throw e;
}));
const bots = new RegExp(config.botPattern, 'i');
const messageLimit = new Limiter(rules.messagesPerMinute);
const viewLimit = new Limiter(rules.viewsPerMinute);
/** The sending limits: kept by a database server when there is one (so they hold across instances), else in memory. */
const allow = (store: Store, kind: 'message' | 'view', key: string) => {
  const perMinute = kind === 'message' ? rules.messagesPerMinute : rules.viewsPerMinute;
  if (store.allow) return store.allow(kind + ':' + createHash('sha256').update(key).digest('hex').slice(0, 32), perMinute);
  return (kind === 'message' ? messageLimit : viewLimit).allow(key);
};

/** The visitor's address, for the limits only (never kept). */
function visitor(req: Request): string {
  const forwarded = env.trustProxy ? req.get('x-forwarded-for')?.split(',')[0].trim() : '';
  return forwarded || req.socket.remoteAddress || '';
}

const digest = (s: string) => createHash('sha256').update(s).digest();
function admin(req: Request, res: Response, next: NextFunction): void {
  if (!env.adminKey) {
    res.status(404).json({ message: messages.notFound });
    return;
  }
  const key = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1];
  if (!key || !timingSafeEqual(digest(key), digest(env.adminKey))) {
    res.status(401).json({ message: messages.unauthorized });
    return;
  }
  next();
}

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
/** A request's body as text, whatever its type (forms send text/plain JSON). */
const body = express.text({ type: () => true, limit: rules.maxBody });
const text = (req: Request) => (typeof req.body === 'string' ? req.body : '');

app.post('/api/forms/:id', body, async (req, res) => {
  // The answer may be read by the page wherever it is shown.
  res.setHeader('Access-Control-Allow-Origin', '*');
  const result = checkMessage(config, String(req.params.id), text(req));
  if ('status' in result) {
    res.status(result.status).json({ message: result.message });
    return;
  }
  const store = await storeOf();
  if (!store) {
    res.status(503).json({ message: "This site can’t take messages yet: its database isn’t set up (DATABASE_URL)." });
    return;
  }
  if (!(await allow(store, 'message', visitor(req)))) {
    res.status(429).json({ message: messages.tooMany });
    return;
  }
  await store.addMessage(result);
  res.json({ ok: true });
});

app.post('/api/views', body, async (req, res) => {
  const agent = req.get('user-agent') ?? '';
  try {
    const store = agent && !bots.test(agent) ? await storeOf() : null;
    if (store && (await allow(store, 'view', visitor(req)))) {
      const view = readView(config, text(req), req.hostname);
      if (view) await store.countView(view.path, view.referrer);
    }
  } catch (e) {
    console.error(e);
  }
  // A beacon never fails.
  res.status(204).end();
});

/** The admin answers need the database; without one there is nothing to read. */
const adminStore = async (res: Response) => {
  const store = await storeOf();
  if (!store) res.status(503).json({ message: "This site can’t take messages yet: its database isn’t set up (DATABASE_URL)." });
  return store;
};

app.get('/api/admin/messages', admin, async (_req, res) => {
  const store = await adminStore(res);
  if (store) res.json({ messages: await store.messages(200) });
});

app.delete('/api/admin/messages/:id', admin, async (req, res) => {
  const store = await adminStore(res);
  if (!store) return;
  const id = Number(req.params.id);
  if (Number.isInteger(id) && (await store.deleteMessage(id))) res.status(204).end();
  else res.status(404).json({ message: messages.notFound });
});

app.get('/api/admin/stats', admin, async (req, res) => {
  const store = await adminStore(res);
  if (!store) return;
  const days = Number(req.query.days);
  res.json(await store.stats(Number.isInteger(days) && days >= 1 && days <= 366 ? days : 30));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ message: messages.notFound });
});

app.use(
  express.static(SITE, {
    dotfiles: 'ignore',
    setHeaders: (res, path) => {
      // Exact copies of imported pages run only sandboxed.
      if (path.startsWith(EMBEDS)) res.setHeader('Content-Security-Policy', config.embedCsp);
    },
  }),
);

app.use((_req, res) => {
  res.status(404).type('html').send(notFoundPage);
});

app.use((err: { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api/')) res.status(status).json({ message: status === 413 ? messages.tooLong : status < 500 ? messages.unreadable : 'Server error' });
  else res.status(status).type('html').send(notFoundPage);
});

export default app;
