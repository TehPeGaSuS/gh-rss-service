import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';
import { eventToItem } from './eventShared.js';

export const repoEvent: RouteModule = {
    key: 'repo_event',
    path: '/repo_event/:owner/:repo/:types?',
    supported: true,
    async fetchItems({ owner, repo, types }) {
        const filter = types ? new Set(types.split(',')) : undefined;
        const events = (await ghGet(`/repos/${owner}/${repo}/events`, { per_page: 100 })) as any[];
        return {
            title: `${owner}/${repo} Repo Events`,
            link: `https://github.com/${owner}/${repo}`,
            items: events.filter((e) => !filter || filter.has(e.type)).map(eventToItem),
        };
    },
};
