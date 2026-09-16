import 'dotenv/config';
import express from 'express';
import { ensureConfigFile, ensureRegistered, loadConfig } from './config.js';
import { readItems, upsertItems, pruneFeed } from './db.js';
import { toRss } from './feed.js';
import { routes } from './routes/index.js';
import { startScheduler } from './scheduler.js';
import type { FeedConfigEntry } from './types.js';

ensureConfigFile();
const app = express();

// Stable, filesystem/URL-safe id derived from route + resolved params, so the
// same URL always maps to the same feed id across restarts.
function makeFeedId(routeKey: string, params: Record<string, string>): string {
    const parts = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([, v]) => v);
    return [routeKey, ...parts].join('_').replaceAll(/[^\w.-]/g, '-');
}

for (const route of Object.values(routes)) {
    app.get(`/github${route.path}`, async (req, res) => {
        if (!route.supported) {
            res.status(501).send(`Route "${route.key}" is not supported (scrape-only, no API): ${route.note ?? ''}`);
            return;
        }
        const params = Object.fromEntries(Object.entries(req.params).filter(([, v]) => v !== undefined)) as Record<string, string>;
        const id = makeFeedId(route.key, params);
        const alreadyRegistered = loadConfig().some((e) => e.id === id);

        if (!alreadyRegistered) {
            try {
                const result = await route.fetchItems(params);
                upsertItems(id, result.items);
                const entry: FeedConfigEntry = { id, route: route.key, params };
                ensureRegistered(entry);
                console.log(`[auto-register] new feed "${id}" (${route.key}) registered from first request`);
            } catch (err) {
                res.status(502).send(`Failed to fetch feed on first request: ${err instanceof Error ? err.message : err}`);
                return;
            }
        }

        pruneFeed(id, 500);
        const items = readItems(id, 100);
        res.type('application/rss+xml').send(toRss(`GitHub ${route.key}: ${Object.values(params).join('/')}`, 'https://github.com', items));
    });
}

// Legacy explicit access by config-file id, still useful for entries with a custom id/limit.
app.get('/feed/:id', (req, res) => {
    const entries = loadConfig();
    const entry = entries.find((e) => e.id === req.params.id);
    if (!entry) {
        res.status(404).send('Unknown feed id. Check config.json.');
        return;
    }
    const items = readItems(entry.id, entry.limit ?? 100);
    const title = `${entry.id} (${entry.route})`;
    res.type('application/rss+xml').send(toRss(title, 'https://github.com', items));
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/routes', (_req, res) => {
    res.json(
        Object.values(routes).map((r) => ({
            key: r.key,
            path: r.path,
            supported: r.supported,
            note: r.note,
        }))
    );
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
    console.log(`gh-rss-service listening on :${port}`);
    startScheduler();
});
