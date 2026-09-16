import Database from 'better-sqlite3';
import type { FeedItem } from './types.js';

const dbPath = process.env.DB_PATH ?? './data.sqlite3';
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS feed_items (
    feed_id TEXT NOT NULL,
    guid TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    author TEXT,
    description TEXT,
    pub_date TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    PRIMARY KEY (feed_id, guid)
);
CREATE INDEX IF NOT EXISTS idx_feed_items_feed_first_seen ON feed_items (feed_id, first_seen DESC);
`);

const upsertStmt = db.prepare(`
    INSERT INTO feed_items (feed_id, guid, title, link, author, description, pub_date, first_seen)
    VALUES (@feed_id, @guid, @title, @link, @author, @description, @pub_date, @first_seen)
    ON CONFLICT(feed_id, guid) DO UPDATE SET
        title = excluded.title,
        link = excluded.link,
        author = excluded.author,
        description = excluded.description
        -- pub_date and first_seen are intentionally NOT updated: once an item is seen,
        -- its position/timestamp in the feed must never move, so it can never re-trigger
        -- a "new item" event downstream (e.g. in Limnoria's rss plugin).
`);

const selectStmt = db.prepare(`
    SELECT guid, title, link, author, description, pub_date as pubDate
    FROM feed_items
    WHERE feed_id = ?
    ORDER BY first_seen DESC
    LIMIT ?
`);

const pruneStmt = db.prepare(`
    DELETE FROM feed_items
    WHERE feed_id = ? AND guid NOT IN (
        SELECT guid FROM feed_items WHERE feed_id = ? ORDER BY first_seen DESC LIMIT ?
    )
`);

export function upsertItems(feedId: string, items: FeedItem[]): void {
    const now = new Date().toISOString();
    const tx = db.transaction((rows: FeedItem[]) => {
        for (const item of rows) {
            upsertStmt.run({
                feed_id: feedId,
                guid: item.guid,
                title: item.title,
                link: item.link,
                author: item.author ?? null,
                description: item.description ?? null,
                pub_date: item.pubDate,
                first_seen: now,
            });
        }
    });
    tx(items);
}

export function readItems(feedId: string, limit = 100): FeedItem[] {
    return selectStmt.all(feedId, limit) as FeedItem[];
}

export function pruneFeed(feedId: string, keep = 500): void {
    pruneStmt.run(feedId, feedId, keep);
}
