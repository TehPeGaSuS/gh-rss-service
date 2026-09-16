import { ghGet } from '../github.js';
import type { RouteModule } from '../types.js';

export const comments: RouteModule = {
    key: 'comments',
    path: '/comments/:user/:repo/:number?',
    supported: true,
    async fetchItems({ user, repo, number }) {
        const host = `https://github.com/${user}/${repo}`;
        const endpoint = number ? `/repos/${user}/${repo}/issues/${number}/comments` : `/repos/${user}/${repo}/issues/comments`;
        const data = (await ghGet(endpoint, { per_page: 100, sort: 'created', direction: 'desc' })) as any[];
        return {
            title: `${user}/${repo} Comments${number ? ' #' + number : ''}`,
            link: host,
            items: data.map((item) => ({
                guid: `comment-${item.id}`,
                title: `${item.user?.login} commented`,
                author: item.user?.login,
                description: item.body ?? undefined,
                pubDate: new Date(item.created_at).toISOString(),
                link: item.html_url,
            })),
        };
    },
};
