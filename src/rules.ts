import type { ServerConfig } from './config.js';

/** One field of a message, as the page sends it. */
export interface Field {
  label: string;
  value: string;
}

/** A message that passed every check, ready to keep. */
export interface Message {
  formId: string;
  page: string;
  fields: Field[];
}

/** Why a message is refused: the status and the text the page shows. */
export interface Refusal {
  status: number;
  message: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The page a message came from: one of the site's pages, else the home page. */
export function pagePath(pages: string[], page: string | undefined): string {
  let path = (page ?? '').split(/[?#]/)[0];
  if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return pages.includes(path) ? path : '/';
}

/** Checks a form message (the body as sent: text/plain or JSON) against the form and the rules. */
export function checkMessage(config: ServerConfig, formId: string, body: string): Message | Refusal {
  const { rules, messages } = config;
  const unreadable: Refusal = { status: 400, message: messages.unreadable };
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return unreadable;
  }
  if (!isObject(data)) return unreadable;
  const { fields, page } = data;
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > rules.maxFields) return unreadable;
  for (const f of fields) {
    if (!isObject(f) || Object.keys(f).some((k) => k !== 'label' && k !== 'value')) return unreadable;
    if (typeof f.label !== 'string' || typeof f.value !== 'string') return unreadable;
    if (f.label.length > rules.maxLabel || f.value.length > rules.maxValue) return unreadable;
  }
  if (page !== undefined && (typeof page !== 'string' || page.length > rules.maxPage)) return unreadable;
  const sent = fields as Field[];

  const formFields = Object.hasOwn(config.forms, formId) ? config.forms[formId] : undefined;
  if (formFields === undefined) return { status: 404, message: messages.unknownForm };
  if (sent.length > formFields) return { status: 400, message: messages.tooManyFields };
  if (sent.every((f) => !f.value.trim())) return { status: 400, message: messages.empty };
  if (sent.reduce((n, f) => n + f.label.length + f.value.length, 0) > rules.maxTotal) return { status: 400, message: messages.tooLong };
  return { formId, page: pagePath(config.pages, page as string | undefined), fields: sent.map((f) => ({ label: f.label.trim(), value: f.value.trim() })) };
}

/** A page view to count: the page's path, and the referring site's host when it is another site. */
export function readView(config: ServerConfig, body: string, ownHost: string): { path: string; referrer: string | null } | null {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (!isObject(data) || typeof data.path !== 'string') return null;
  const path = data.path.split(/[?#]/)[0];
  if (!config.pages.includes(path)) return null;
  let referrer: string | null = null;
  if (typeof data.referrer === 'string' && data.referrer) {
    try {
      const url = new URL(data.referrer);
      const host = url.hostname.toLowerCase();
      if ((url.protocol === 'http:' || url.protocol === 'https:') && host && host !== ownHost.toLowerCase() && host.length <= 253) referrer = host;
    } catch {
      // Not an address: no referrer.
    }
  }
  return { path, referrer };
}

export interface StoredMessage extends Message {
  id: number;
  createdAt: string;
}

export interface Stats {
  days: number;
  daily: { day: string; views: number }[];
  pages: { key: string; count: number }[];
  referrers: { key: string; count: number }[];
}

/** Where messages and counters are kept (src/store.ts): SQLite, MongoDB or MySQL. */
export interface Store {
  addMessage(m: Message): Promise<void> | void;
  messages(limit: number): Promise<StoredMessage[]> | StoredMessage[];
  deleteMessage(id: number): Promise<boolean> | boolean;
  countView(path: string, referrer: string | null): Promise<void> | void;
  stats(days: number): Promise<Stats> | Stats;
  /** A database server keeps the sending limits itself, so they hold across instances; without it they are kept in memory. */
  allow?(bucket: string, perMinute: number): Promise<boolean>;
}

/** At most `perMinute` hits a minute per key (a visitor's address), kept in memory. */
export class Limiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly perMinute: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < 60_000);
    const allowed = recent.length < this.perMinute;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) {
      for (const [k, times] of this.hits) if (!times.length || now - times[times.length - 1] >= 60_000) this.hits.delete(k);
    }
    return allowed;
  }
}
