import type { RouteModule } from '../types.js';

// These RSSHub routes scrape HTML pages GitHub does not expose via REST/GraphQL/Atom
// (security advisories list, code search results, topic pages, the Pulse page, and the
// Trending page). Replicating them without a scraper/Puppeteer is impractical and out of
// scope for a REST-API-only service; they're left as clearly-labeled stubs.
function stub(key: string, path: string, reason: string): RouteModule {
    return {
        key,
        path,
        supported: false,
        note: reason,
        async fetchItems() {
            return {
                title: `${key} (unsupported)`,
                link: 'https://github.com',
                items: [
                    {
                        guid: `stub-${key}`,
                        title: `Route "${key}" is not implemented`,
                        link: 'https://github.com',
                        description: reason,
                        pubDate: new Date().toISOString(),
                    },
                ],
            };
        },
    };
}

export const advisor = stub('advisor', '/advisor/data/:type?/:category?', 'Requires scraping github.com/advisories HTML; no REST/GraphQL equivalent.');
export const search = stub('search', '/search/:query/:sort?/:order?', 'RSSHub scrapes GitHub code-search result HTML; no public API for this.');
export const topic = stub('topic', '/topics/:name/:qs?', 'RSSHub scrapes the Topics page HTML; no REST/GraphQL equivalent.');
export const pulse = stub('pulse', '/pulse/:user/:repo/:period?', 'RSSHub scrapes the Pulse page HTML; no REST/GraphQL equivalent.');
export const trending = stub('trending', '/trending/:since/:language/:spoken_language?', 'RSSHub scrapes the Trending page HTML; no REST/GraphQL equivalent.');
