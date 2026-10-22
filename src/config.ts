import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** What the site's server knows about it: written by UniversalIDE into server.json (docs/39). */
export interface ServerConfig {
  /** Forms that send messages here: form id → how many fields it has. */
  forms: Record<string, number>;
  /** The site's page paths. */
  pages: string[];
  rules: {
    maxFields: number;
    maxLabel: number;
    maxValue: number;
    maxTotal: number;
    maxBody: number;
    messagesPerMinute: number;
    viewsPerMinute: number;
    keepMessages: number;
    maxPage: number;
  };
  messages: Record<'unreadable' | 'unknownForm' | 'tooManyFields' | 'empty' | 'tooLong' | 'tooMany' | 'unauthorized' | 'notFound', string>;
  botPattern: string;
  embedCsp: string;
  /** A database server, when not SQLite. */
  database?: 'mongodb' | 'mysql';
}

/** The project folder: server.json, not-found.html and site/ are here. */
export const ROOT = join(import.meta.dirname, '..');

// Read as a URL next to this file, so hosts that bundle the server (Vercel) find it and take it along.
export const config: ServerConfig = JSON.parse(readFileSync(new URL('../server.json', import.meta.url), 'utf8'));

export const env = {
  port: Number(process.env.PORT || 3000),
  /** Where the database is kept. */
  dataDir: process.env.DATA_DIR || join(ROOT, 'data'),
  /** Reads messages and statistics (/api/admin/…); without it those answer 404. */
  adminKey: process.env.ADMIN_KEY || '',
  /** Behind a proxy: the visitor's address is the first in X-Forwarded-For. */
  trustProxy: process.env.TRUST_PROXY === '1',
  /** A database server's address (MongoDB or MySQL, when server.json names one). */
  databaseUrl: process.env.DATABASE_URL || process.env.MONGODB_URI || '',
};
