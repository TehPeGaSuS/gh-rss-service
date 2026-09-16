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

const POLL_INTERVAL_MINUTES = (() => {
    const raw = Number(process.env.POLL_INTERVAL_MINUTES ?? 5);
    if (!Number.isFinite(raw) || raw <= 0 || raw > 1440) {
        console.warn(`[poll] invalid POLL_INTERVAL_MINUTES "${process.env.POLL_INTERVAL_MINUTES}", falling back to 5`);
        return 5;
    }
    return raw;
})();

function msUntilNextIntervalMark(intervalMinutes: number): number {
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Math.ceil((now.getMinutes() + 1e-6) / intervalMinutes) * intervalMinutes);
    return next.getTime() - now.getTime();
}

export function startScheduler(): void {
    const schedule = () => {
        setTimeout(async () => {
            await pollOnce().catch((err) => console.error('[poll] unexpected error:', err));
            schedule();
        }, msUntilNextIntervalMark(POLL_INTERVAL_MINUTES));
    };
    console.log(`[poll] polling every ${POLL_INTERVAL_MINUTES} minute(s), aligned to the wall clock`);
    // Run once immediately on boot, then align to the wall-clock interval grid.
    pollOnce()
        .catch((err) => console.error('[poll] unexpected error:', err))
        .finally(schedule);
}
