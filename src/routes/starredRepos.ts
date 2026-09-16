import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const starredRepos: RouteModule = {
    key: 'starred_repos',
    path: '/starred_repos/:user',
    supported: true,
    async fetchItems({ user }) {
        const data = (await ghGet(`/users/${user}/starred`, { per_page: 50 })) as any[];
        return {
            title: `${user}'s Starred Repos`,
            link: `https://github.com/${user}?tab=stars`,
            items: data.map((repo) => ({
                guid: `${user}#starred-${repo.full_name}`,
                title: repo.full_name,
                description: repo.description ?? undefined,
                link: repo.html_url,
                pubDate: new Date().toISOString(),
            })),
        };
    },
};
