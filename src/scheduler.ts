import { routes } from './routes/index.js';
import { loadConfig } from './config.js';
import { upsertItems, upsertFeedMeta, pruneFeed } from './db.js';

async function pollOnce(): Promise<void> {
    const entries = loadConfig();
    for (const entry of entries) {
        const route = routes[entry.route];
        if (!route) {
            console.error(`[poll] unknown route "${entry.route}" for feed "${entry.id}"`);
            continue;
        }
        if (!route.supported) {
            console.warn(`[poll] skipping unsupported route "${entry.route}" (${route.note})`);
            continue;
        }
        try {
            const result = await route.fetchItems(entry.params);
            upsertFeedMeta(entry.id, result.title, result.link);
            upsertItems(entry.id, result.items);
            pruneFeed(entry.id, entry.limit ?? 500);
            console.log(`[poll] ${entry.id}: ${result.items.length} items fetched`);
        } catch (err) {
            console.error(`[poll] ${entry.id} failed:`, err instanceof Error ? err.message : err);
        }
    }
}

function msUntilNextFiveMinuteMark(): number {
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Math.ceil((now.getMinutes() + 1e-6) / 5) * 5);
    return next.getTime() - now.getTime();
}

export function startScheduler(): void {
    const schedule = () => {
        setTimeout(async () => {
            await pollOnce().catch((err) => console.error('[poll] unexpected error:', err));
            schedule();
        }, msUntilNextFiveMinuteMark());
    };
    // Run once immediately on boot, then align to the wall-clock 5-minute grid.
    pollOnce()
        .catch((err) => console.error('[poll] unexpected error:', err))
        .finally(schedule);
}
