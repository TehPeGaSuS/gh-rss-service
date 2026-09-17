import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const pull: RouteModule = {
    key: 'pull',
    path: '/pull/:user/:repo/:state?/:labels?',
    supported: true,
    async fetchItems({ user, repo, state = 'open', labels }) {
        const host = `https://github.com/${user}/${repo}/pulls`;
        const data = (await ghGet(`/repos/${user}/${repo}/issues`, {
            state,
            labels,
            sort: 'created',
            direction: 'desc',
            per_page: 100,
        })) as any[];

        return {
            title: `${user}/${repo} ${state.replace(/^\S/, (s) => s.toUpperCase())} Pull Requests${labels ? ' - ' + labels : ''}`,
            link: host,
            items: data
                .filter((item) => item.pull_request)
                .map((item) => {
                    const suffix =
                        state === 'closed' ? (item.pull_request?.merged_at ? ' (merged)' : ' (closed)') : '';
                    return {
                        guid: `${user}/${repo}#pr-${item.number}`,
                        title: `${item.title}${suffix}`,
                        author: item.user?.login,
                        description: item.body ?? undefined,
                        pubDate: new Date(item.created_at).toISOString(),
                        link: item.html_url,
                    };
                }),
        };
    },
};
