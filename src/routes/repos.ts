import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const repos: RouteModule = {
    key: 'repos',
    path: '/repos/:user/:type?/:sort?',
    supported: true,
    async fetchItems({ user, type = 'owner', sort = 'created' }) {
        const data = (await ghGet(`/users/${user}/repos`, { type, sort, per_page: 50 })) as any[];
        return {
            title: `${user}'s Repositories`,
            link: `https://github.com/${user}`,
            items: data.map((repo) => ({
                guid: `${user}#repo-${repo.full_name}`,
                title: repo.full_name,
                description: repo.description ?? undefined,
                link: repo.html_url,
                pubDate: new Date(repo.created_at).toISOString(),
            })),
        };
    },
};
