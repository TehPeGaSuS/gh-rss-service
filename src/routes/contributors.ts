import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const contributors: RouteModule = {
    key: 'contributors',
    path: '/contributors/:user/:repo/:order?/:anon?',
    supported: true,
    async fetchItems({ user, repo, anon }) {
        const host = `https://github.com/${user}/${repo}`;
        const data = (await ghGet(`/repos/${user}/${repo}/contributors`, anon ? { anon: '1' } : {})) as any[];
        return {
            title: `${user}/${repo} Contributors`,
            link: `${host}/graphs/contributors`,
            items: data.map((item) => ({
                guid: `${user}/${repo}#contributor-${item.login ?? item.name}`,
                title: `${item.login ?? item.name} (${item.contributions} contributions)`,
                link: item.html_url ?? host,
                pubDate: new Date().toISOString(),
            })),
        };
    },
};
