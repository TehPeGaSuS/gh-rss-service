import Database from 'better-sqlite3';
import type { FeedItem } from './types.js';

const dbPath = process.env.DB_PATH ?? './data.sqlite3';
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS feeds (
    feed_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL
);
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

const upsertFeedStmt = db.prepare(`
    INSERT INTO feeds (feed_id, title, link) VALUES (@feed_id, @title, @link)
    ON CONFLICT(feed_id) DO UPDATE SET title = excluded.title, link = excluded.link
`);

const selectFeedStmt = db.prepare(`SELECT title, link FROM feeds WHERE feed_id = ?`);

export function upsertFeedMeta(feedId: string, title: string, link: string): void {
    upsertFeedStmt.run({ feed_id: feedId, title, link });
}

export function readFeedMeta(feedId: string): { title: string; link: string } | undefined {
    return selectFeedStmt.get(feedId) as { title: string; link: string } | undefined;
}

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

// ---------------------------------------------------------------------------
// Webhook push state, kept apart from feed_items: pruneFeed can drop rows the
// API still returns, which would make them look new again on the next poll.
// A push key stays here as long as the API keeps returning it (last_seen is
// refreshed every poll) and is forgotten PUSH_KEEP_DAYS after it disappears.
// ---------------------------------------------------------------------------

db.exec(`
CREATE TABLE IF NOT EXISTS push_feeds (
    feed_id TEXT PRIMARY KEY,
    initialized_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pushed_items (
    feed_id TEXT NOT NULL,
    push_key TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    PRIMARY KEY (feed_id, push_key)
);
`);

// Added after the first version of this table: the last pushed state of
// pull/issue items, so a close/merge/reopen is pushed too.
if (!(db.prepare(`PRAGMA table_info(pushed_items)`).all() as { name: string }[]).some((c) => c.name === 'state')) {
    db.exec(`ALTER TABLE pushed_items ADD COLUMN state TEXT`);
}

const PUSH_KEEP_DAYS = 30;

const pushInitStmt = db.prepare(`INSERT OR IGNORE INTO push_feeds (feed_id, initialized_at) VALUES (?, ?)`);
const pushIsInitStmt = db.prepare(`SELECT 1 FROM push_feeds WHERE feed_id = ?`);
const pushGetStmt = db.prepare(`SELECT state FROM pushed_items WHERE feed_id = ? AND push_key = ?`);
const pushTouchStmt = db.prepare(`UPDATE pushed_items SET last_seen = ? WHERE feed_id = ? AND push_key = ?`);
const pushSetStateStmt = db.prepare(`UPDATE pushed_items SET state = ? WHERE feed_id = ? AND push_key = ?`);
const pushMarkStmt = db.prepare(`
    INSERT INTO pushed_items (feed_id, push_key, last_seen, state) VALUES (?, ?, ?, ?)
    ON CONFLICT(feed_id, push_key) DO UPDATE SET last_seen = excluded.last_seen, state = excluded.state
`);
const pushPruneStmt = db.prepare(`DELETE FROM pushed_items WHERE feed_id = ? AND last_seen < ?`);

export function pushKey(item: FeedItem): string {
    return item.pushKey ?? item.guid;
}

export function isPushInitialized(feedId: string): boolean {
    return pushIsInitStmt.get(feedId) !== undefined;
}

export function markPushed(feedId: string, items: FeedItem[]): void {
    const now = new Date().toISOString();
    db.transaction(() => {
        for (const item of items) pushMarkStmt.run(feedId, pushKey(item), now, item.state ?? null);
    })();
}

// First fetch of a feed: remember everything it already has, so enabling the
// webhook (or registering a feed) never pushes the backlog.
export function initPush(feedId: string, items: FeedItem[]): void {
    db.transaction(() => {
        markPushed(feedId, items);
        pushInitStmt.run(feedId, new Date().toISOString());
    })();
}

function actionFor(previous: string | null | undefined, state: FeedItem['state']): string | undefined {
    if (!state) return undefined;
    if (previous === undefined) return state === 'open' ? 'opened' : state; // first sight
    if (previous === null || previous === state) return undefined; // unchanged, or no state stored yet
    return state === 'open' ? 'reopened' : state;
}

// Returns the fetched items to push, oldest first, one per push key: the
// ones never pushed, and those whose state changed since (with .action set).
// Refreshes last_seen of the others.
export function unpushedItems(feedId: string, items: FeedItem[]): FeedItem[] {
    const now = new Date();
    const fresh = new Map<string, FeedItem>();
    db.transaction(() => {
        for (const item of items) {
            const key = pushKey(item);
            if (fresh.has(key)) continue;
            const row = pushGetStmt.get(feedId, key) as { state: string | null } | undefined;
            const action = actionFor(row?.state, item.state);
            if (!row || action) {
                fresh.set(key, action ? { ...item, action } : item);
                continue;
            }
            pushTouchStmt.run(now.toISOString(), feedId, key);
            // rows from before states were stored: learn the state silently
            if (row.state === null && item.state) pushSetStateStmt.run(item.state, feedId, key);
        }
        const cutoff = new Date(now.getTime() - PUSH_KEEP_DAYS * 86400_000).toISOString();
        pushPruneStmt.run(feedId, cutoff);
    })();
    return [...fresh.values()].sort((a, b) => a.pubDate.localeCompare(b.pubDate));
}
