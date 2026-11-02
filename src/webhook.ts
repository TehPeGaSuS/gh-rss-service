import { createHmac } from 'node:crypto';
import { initPush, isPushInitialized, markPushed, unpushedItems } from './db.js';
import type { FeedConfigEntry, FeedItem, FeedResult } from './types.js';

// Optional push of new feed items to an HTTP endpoint (e.g. the GitHooks
// Limnoria plugin), so a bot hears about them on the next poll instead of
// waiting for its RSS reader. Unset WEBHOOK_URL = no pushes; new items are
// still remembered, so turning it on later doesn't flood the backlog.
const WEBHOOK_URL = (() => {
    const raw = process.env.WEBHOOK_URL || '';
    if (!raw) return '';
    try {
        new URL(raw);
        return raw;
    } catch {
        console.error("[webhook] WEBHOOK_URL is not a valid URL, pushes disabled");
        return '';
    }
})();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const TIMEOUT_MS = 10_000;
const MAX_DESCRIPTION = 1000;

export const webhookEnabled = WEBHOOK_URL !== '';
// for logs: never print the path, it may carry a token
export const webhookOrigin = webhookEnabled ? new URL(WEBHOOK_URL).origin : '';

function feedRepo(params: Record<string, string>): string | undefined {
    const owner = params.user ?? params.owner;
    return owner && params.repo ? `${owner}/${params.repo}` : undefined;
}

export function buildPayload(entry: FeedConfigEntry, feed: FeedResult, items: FeedItem[]) {
    const repo = feedRepo(entry.params);
    return {
        source: 'gh-rss-service',
        feed: { id: entry.id, route: entry.route, params: entry.params, title: feed.title, link: feed.link },
        items: items.map((item) => ({
            guid: item.guid,
            title: item.title,
            link: item.link,
            author: item.author ?? null,
            description: item.description ? item.description.slice(0, MAX_DESCRIPTION) : null,
            pubDate: item.pubDate,
            repo: item.repo ?? repo ?? null,
            type: item.type ?? null,
            reason: item.reason ?? null,
            state: item.state ?? null,
            action: item.action ?? null,
        })),
    };
}

export function sign(body: string, secret: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

async function post(payload: unknown): Promise<boolean> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'gh-rss-service',
        'X-GH-RSS-Event': 'items',
    };
    // Same header and format as GitHub's webhooks, so receivers can reuse
    // their GitHub signature check.
    if (WEBHOOK_SECRET) headers['X-Hub-Signature-256'] = sign(body, WEBHOOK_SECRET);
    try {
        const res = await fetch(WEBHOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) {
            console.error(`[webhook] ${webhookOrigin} answered ${res.status}`);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`[webhook] ${webhookOrigin} failed:`, err instanceof Error ? err.message : err);
        return false;
    }
}

// Called after every poll of a feed. Items are only marked as pushed once the
// endpoint accepted them, so a failed push is retried on the next poll.
export async function pushNewItems(entry: FeedConfigEntry, feed: FeedResult): Promise<void> {
    if (!isPushInitialized(entry.id)) {
        initPush(entry.id, feed.items);
        return;
    }
    const fresh = unpushedItems(entry.id, feed.items);
    if (fresh.length === 0) return;
    if (!webhookEnabled || (await post(buildPayload(entry, feed, fresh)))) {
        markPushed(entry.id, fresh);
        if (webhookEnabled) console.log(`[webhook] ${entry.id}: pushed ${fresh.length} new item(s)`);
    }
}
