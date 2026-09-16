import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const branches: RouteModule = {
    key: 'branches',
    path: '/branches/:user/:repo',
    supported: true,
    async fetchItems({ user, repo }) {
        const host = `https://github.com/${user}/${repo}`;
        const data = (await ghGet(`/repos/${user}/${repo}/branches`, { per_page: 100 })) as any[];
        return {
            title: `${user}/${repo} Branches`,
            link: `${host}/branches`,
            items: data.map((item) => ({
                guid: `${user}/${repo}#branch-${item.name}-${item.commit?.sha}`,
                title: item.name,
                link: `${host}/tree/${item.name}`,
                pubDate: new Date().toISOString(),
            })),
        };
    },
};
