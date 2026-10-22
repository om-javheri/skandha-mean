import { MongoClient, type Db } from 'mongodb';
import { config, env } from './config.js';
import type { Field, Message, Stats, Store, StoredMessage } from './rules.js';

const C = {"messages":"form_messages","counts":"daily_counts","counters":"counters","hits":"rate_hits"};
const today = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

interface MessageDoc { _id: number; formId: string; page: string; fields: Field[]; createdAt: string }
interface CountDoc { day: string; kind: string; key: string; count: number }
interface CounterDoc { _id: string; seq: number }
interface HitDoc { bucket: string; at: Date }

/** Form messages and daily page-view counters in MongoDB (DATABASE_URL). Nothing about visitors is kept. */
class MongoStore implements Store {
  constructor(
    private readonly db: Db,
    private readonly keepMessages: number,
  ) {}

  private get msgs() {
    return this.db.collection<MessageDoc>(C.messages);
  }

  async addMessage(m: Message): Promise<void> {
    const next = await this.db.collection<CounterDoc>(C.counters).findOneAndUpdate({ _id: C.messages }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
    await this.msgs.insertOne({ _id: next!.seq, formId: m.formId, page: m.page, fields: m.fields, createdAt: new Date().toISOString() });
    // Only the newest are kept.
    const oldest = await this.msgs.find({}, { projection: { _id: 1 } }).sort({ _id: -1 }).skip(this.keepMessages).limit(1).next();
    if (oldest) await this.msgs.deleteMany({ _id: { $lte: oldest._id } });
  }

  async messages(limit: number): Promise<StoredMessage[]> {
    const docs = await this.msgs.find().sort({ _id: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ id: d._id, formId: d.formId, page: d.page, fields: d.fields, createdAt: d.createdAt }));
  }

  async deleteMessage(id: number): Promise<boolean> {
    return (await this.msgs.deleteOne({ _id: id })).deletedCount > 0;
  }

  async countView(path: string, referrer: string | null): Promise<void> {
    const counts = this.db.collection<CountDoc>(C.counts);
    const bump = (kind: string, key: string) => counts.updateOne({ day: today(), kind, key }, { $inc: { count: 1 } }, { upsert: true });
    await bump('view', path);
    if (referrer) await bump('referrer', referrer);
  }

  async stats(days: number): Promise<Stats> {
    const since = today(-(days - 1));
    const counts = this.db.collection<CountDoc>(C.counts);
    const totals = async (kind: string) =>
      (await counts.aggregate<{ _id: string; count: number }>([{ $match: { kind, day: { $gte: since } } }, { $group: { _id: '$key', count: { $sum: '$count' } } }, { $sort: { count: -1, _id: 1 } }]).toArray()).map((r) => ({ key: r._id, count: r.count }));
    const daily = (await counts.aggregate<{ _id: string; views: number }>([{ $match: { kind: 'view', day: { $gte: since } } }, { $group: { _id: '$day', views: { $sum: '$count' } } }, { $sort: { _id: 1 } }]).toArray()).map((r) => ({ day: r._id, views: r.views }));
    return { days, daily, pages: await totals('view'), referrers: await totals('referrer') };
  }

  async allow(bucket: string, perMinute: number): Promise<boolean> {
    const hits = this.db.collection<HitDoc>(C.hits);
    const since = new Date(Date.now() - 60_000);
    if ((await hits.countDocuments({ bucket, at: { $gt: since } })) >= perMinute) return false;
    await hits.insertOne({ bucket, at: new Date() });
    return true;
  }
}

/** Connects once (a serverless host reuses the connection between requests); null without an address. */
export async function openStore(): Promise<Store | null> {
  if (!env.databaseUrl) return null;
  const client = new MongoClient(env.databaseUrl, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const db = client.db();
  await Promise.all([
    db.collection(C.counts).createIndex({ day: 1, kind: 1, key: 1 }, { unique: true }),
    // Hits older than a minute go by themselves (MongoDB removes them about once a minute; counting looks at the last minute only).
    db.collection(C.hits).createIndex({ at: 1 }, { expireAfterSeconds: 60 }),
    db.collection(C.hits).createIndex({ bucket: 1, at: 1 }),
  ]);
  return new MongoStore(db, config.rules.keepMessages);
}
