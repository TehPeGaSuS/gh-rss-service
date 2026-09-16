import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const issue: RouteModule = {
    key: 'issue',
    path: '/issue/:user/:repo/:state?/:labels?',
    supported: true,
    async fetchItems({ user, repo, state = 'open', labels }) {
        const host = `https://github.com/${user}/${repo}/issues`;
        const data = (await ghGet(`/repos/${user}/${repo}/issues`, {
            state,
            labels,
            sort: 'created',
            direction: 'desc',
            per_page: 100,
        })) as any[];

        return {
            title: `${user}/${repo} ${state} Issues${labels ? ' - ' + labels : ''}`,
            link: host,
            items: data
                .filter((item) => item.pull_request === undefined)
                .map((item) => ({
                    guid: `${user}/${repo}#issue-${item.number}`,
                    title: item.title,
                    description: item.body ?? undefined,
                    pubDate: new Date(item.created_at).toISOString(),
                    author: item.user?.login,
                    link: `${host}/${item.number}`,
                })),
        };
    },
};
